# Mobile Release Runbook — POS Chile

> **Propósito**: documentar el ciclo completo de release de la app mobile
> para que un agente (o humano) nuevo pueda buildear, firmar y publicar un
> APK desde cero sin cagarla.

---

## Arquitectura resumida

```
┌─────────────────────────────┐
│  MAC (devlmer) — desarrollo │
│  · Android Studio + SDK     │
│  · ~/.android-keystores/    │ ← keystore release (JAMÁS en repo)
│  · prebuild + gradle        │
└──────────────┬──────────────┘
               │ wrangler r2 put
               ▼
┌─────────────────────────────┐
│  Cloudflare R2 (bucket)     │ ← APKs históricos + latest
│  · pos-chile-v1.0.0.apk     │
│  · pos-chile-v1.0.1.apk     │
│  · pos-chile-latest.apk     │ ← alias/copia al más reciente
└──────────────┬──────────────┘
               │ URL pública
               ▼
┌─────────────────────────────┐
│  TU NEXT.JS (dy-pos…)       │
│  GET /api/mobile/manifest   │ ← endpoint dinámico desde DB
│  → { version, url, notes }  │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  App mobile en celulares    │
│  On app open:               │
│   1. fetch manifest         │
│   2. si version > local:    │
│      banner "Actualizar"    │
│   3. JS-only changes:       │
│      EAS Update silent      │
└─────────────────────────────┘
```

---

## Fase 1 — Keystore release (UNA SOLA VEZ)

### Qué es

El **keystore release** es un archivo cifrado que contiene la clave privada
con la que firmas todos los APKs. Android usa la firma para identificar
"este APK viene del mismo developer que el que ya tienes instalado" y
permitir updates in-place.

**Si lo pierdes** → no puedes publicar updates del mismo APK. Los usuarios
tendrían que desinstalar y reinstalar (experiencia destructiva).

**Si te lo roban** → un atacante puede firmar malware con tu identidad.

### Cómo generarlo

```bash
# Asegúrate de tener Java instalado:
java --version  # Debería ser JDK 17+

./scripts/mobile-generate-keystore.sh
```

El script:

1. Valida que no exista ya un keystore (anti-overwrite).
2. Te pide datos de identidad (nombre, org, ciudad).
3. Genera `~/.android-keystores/pos-chile-release.keystore` con permisos 600.
4. Te pide 2 passwords (store password + key password — usa el mismo).
5. Crea backup automático en iCloud Drive.
6. Imprime fingerprint SHA-256 y siguientes pasos.

### Dónde guardar las credenciales

**Password manager** (1Password, Bitwarden, Keychain):

```
Título:     POS Chile Mobile — Android Keystore
Tipo:       Secure Note
Campos:
  - keystore_path:  ~/.android-keystores/pos-chile-release.keystore
  - alias:          pos-chile
  - store_password: <generado con openssl rand -base64 24>
  - key_password:   <igual al store_password>
  - sha256:         <fingerprint del keystore>
  - icloud_backup:  ~/Library/Mobile Documents/com~apple~CloudDocs/Keystores/
```

**Backups múltiples**:

- Mac (working copy): `~/.android-keystores/`
- iCloud Drive cifrado: automático desde el script
- Disco externo cifrado (FileVault USB): manualmente, 1× al año
- Impresión en papel del fingerprint SHA-256 (para verificar integridad en 5 años)

---

## Fase 2 — Update checker in-app

Pendiente de implementar. Cuando Cowork lo haga, actualizar esta sección con:

- Ruta del componente React Native (`apps/mobile/components/UpdateChecker.tsx`)
- Endpoint que consulta (`GET /api/mobile/manifest`)
- Lógica de semver comparison
- UX del banner
- Flag `forceUpdate: true` para updates críticos

---

## Fase 3 — Hosting en Cloudflare R2

### Setup inicial (1 vez)

1. Entrar a https://dash.cloudflare.com → R2 → Create bucket
2. Nombre del bucket: `pos-chile-mobile-releases`
3. Region: `WNAM` (oeste USA) o la más cercana a Chile
4. Crear API token R2:
   - My Profile → API Tokens → Create Token
   - Template: "R2 Edit"
   - Scope: solo el bucket `pos-chile-mobile-releases`
5. Guardar `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` en password manager
6. Configurar dominio público custom: `apk.zgamersa.com` apuntando al bucket
   (R2 → bucket → Settings → Custom Domains)

### Script de upload (Fase 5)

`scripts/mobile-publish.sh` — lee el APK local, lo sube a R2 con `wrangler`,
actualiza `pos-chile-latest.apk` como copia del nuevo APK, y hace hit al
endpoint de Next.js para actualizar el manifest.

---

## Fase 4 — EAS Update (OTA JavaScript)

### Qué es

Un sistema que te permite pushear cambios **solo de JavaScript** al APK
instalado sin rebuildear ni reinstalar. El usuario abre la app → descarga
el bundle nuevo en ~3 segundos → reinicia la app → versión actualizada.
100% silencioso, sin prompts.

### Qué cambios soporta

✅ Código JavaScript (componentes, hooks, lógica)
✅ Estilos (NativeWind, StyleSheet)
✅ Rutas (expo-router)
✅ Textos, traducciones
✅ Imágenes/assets servidos dinámicamente

### Qué cambios NO soporta (requieren APK nuevo)

❌ Nuevos plugins de Expo (expo-notifications, expo-contacts, etc.)
❌ Permisos Android/iOS (cámara, ubicación, etc.)
❌ Upgrade de Expo SDK mayor
❌ Cambio de íconos, splash screen, app name
❌ Código nativo custom

### Setup inicial

```bash
cd apps/mobile
npx eas login
npx eas init  # Linkea projectId al cloud
npx eas update:configure  # Instala expo-updates plugin
```

Esto agrega a `app.json`:
```json
{
  "expo": {
    "plugins": ["expo-updates"],
    "runtimeVersion": { "policy": "appVersion" },
    "updates": { "url": "https://u.expo.dev/PROJECT_ID" }
  }
}
```

### Workflow de release JS-only

```bash
# En cada cambio JS que quieras publicar:
cd apps/mobile
npx eas update --branch production --message "Fix bug en checkout"

# Los APKs instalados reciben el update al siguiente abrir de app
```

---

## Fase 5 — Primera build + publish v1.0.0

### Prebuild (1 vez al inicio, o después de tocar plugins)

```bash
cd apps/mobile
npx expo prebuild --platform android --clean
```

Esto genera `apps/mobile/android/` con todo el proyecto nativo.
**Está en `.gitignore`** — no se commitea.

### Inyectar firma en el build (config plugin)

Para que gradle firme el APK con el keystore release, necesitamos un
archivo `~/.gradle/gradle.properties` global con las credenciales:

```properties
# ~/.gradle/gradle.properties
POS_CHILE_UPLOAD_STORE_FILE=/Users/devlmer/.android-keystores/pos-chile-release.keystore
POS_CHILE_UPLOAD_KEY_ALIAS=pos-chile
POS_CHILE_UPLOAD_STORE_PASSWORD=<del password manager>
POS_CHILE_UPLOAD_KEY_PASSWORD=<del password manager>
```

Y un config plugin `apps/mobile/plugins/with-release-signing.js` que modifica
`android/app/build.gradle` durante cada `prebuild`.

(Cowork lo implementa en Fase 5)

### Build release

```bash
cd apps/mobile/android
./gradlew assembleRelease

# APK queda en:
# apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

### Verificar firma

```bash
cd apps/mobile/android
./gradlew signingReport

# O con apksigner:
apksigner verify --print-certs app/build/outputs/apk/release/app-release.apk
```

El fingerprint SHA-256 DEBE coincidir con el del password manager.

### Upload a R2

```bash
./scripts/mobile-publish.sh v1.0.0
```

El script:
1. Verifica que la versión no exista ya en R2
2. Copia APK a `apps/mobile/releases/pos-chile-v1.0.0.apk`
3. `wrangler r2 put pos-chile-mobile-releases/pos-chile-v1.0.0.apk`
4. Actualiza `pos-chile-latest.apk` en el bucket
5. Hace PATCH al endpoint `/api/mobile/manifest` para actualizar DB
6. Git tag `mobile-v1.0.0`

---

## Troubleshooting

### "APK not installed" en el celular

- **Causa común**: el usuario tiene otra app con mismo bundle ID pero firma distinta.
- **Fix**: pedir al usuario que desinstale cualquier versión previa antes.

### Update checker no detecta nueva versión

- Verifica que `app.json` del nuevo APK tenga `version` incrementada.
- Verifica que el `manifest.json` en R2 refleje la versión nueva.
- El celular puede tener cache — forzar close-and-reopen.

### Builds lentas (>10 min)

- Normal la primera vez (gradle baja dependencias).
- Segunda build onward: 2-4 min.
- Si sigue lento: `cd android && ./gradlew clean && ./gradlew assembleRelease`.

### Perdí el keystore

- Si tienes backup iCloud: `cp ~/Library/Mobile\ Documents/.../pos-chile-release.keystore ~/.android-keystores/`
- Si NO tienes backup: ya no puedes actualizar el APK existente. **Única salida**:
  - Cambiar el `android.package` en `app.json` (ej: `cl.zgamersa.poschile.v2`)
  - Nuevo keystore
  - Nuevo APK
  - Los usuarios deben desinstalar el viejo e instalar el nuevo
  - **Lección**: nunca pierdas el keystore. NUNCA.

---

## Ciclo de release típico (resumen para el futuro devlmer)

**Cambio JS-only** (90% de los casos):
```bash
cd apps/mobile
# Código + test local
npx eas update --branch production --message "Descripción del cambio"
# Done. Los usuarios reciben el update en segundos.
```

**Cambio nativo** (plugins, permisos, SDK upgrade):
```bash
# 1. Bump version en apps/mobile/app.json: version + versionCode
# 2. Prebuild limpio
cd apps/mobile
npx expo prebuild --platform android --clean
# 3. Build release
cd android && ./gradlew assembleRelease
# 4. Publish
cd ../../.. && ./scripts/mobile-publish.sh v1.0.X
# 5. Los usuarios reciben banner "Actualizar" al abrir la app.
```

---

## Sentry mobile — Fase 2D (DR-12 cerrado 2026-05-01)

### Setup inicial (UNA SOLA VEZ — ya hecho)

1. Proyecto Sentry creado en `dy-company` org → `pos-chile-mobile`
   (platform: React Native).
2. DSN guardado en `apps/mobile/.env` (gitignored vía root `.gitignore`):
   ```
   EXPO_PUBLIC_SENTRY_DSN=https://...@o....ingest.us.sentry.io/...
   ```
3. Plugin `@sentry/react-native/expo` agregado a `app.json/plugins`.
4. `apps/mobile/lib/sentry.ts` provee `initSentry()` + `sentryWrap()` +
   `captureExceptionSafe()` + `captureMessageSafe()`.
5. `apps/mobile/app/_layout.tsx` invoca `initSentry()` después de
   imports y exporta `sentryWrap(RootLayout)`.

### Cómo funciona

- **DSN ausente** (CI, contributor, dev sin acceso a Sentry): degradación
  silenciosa, las funciones son no-ops, app sigue funcionando.
- **DSN presente**: SDK init + global error handler. `Sentry.wrap` agrega
  un error boundary global al render tree.
- **PII pseudonymization en `beforeSend`**: emails, RUTs, teléfonos se
  hashean con FNV-1a + djb2 (16 chars hex). Passwords/tokens/cookies se
  eliminan completos.
- Sólo error tracking en este sprint (`tracesSampleRate: 0`). Tracing
  para futuro cuando haya volumen real.

### Rebuild + reinstall en device físico (Pierre)

Cuando agregamos `@sentry/react-native` requiere prebuild + native build
(no es JS-only). Pasos:

```bash
# 1. Verificar device conectado
~/Library/Android/sdk/platform-tools/adb devices

# 2. Verificar keystore activo (NO el .broken)
keytool -list -keystore ~/.android-keystores/pos-chile-release.keystore

# 3. Prebuild limpio (porque agregamos un plugin nuevo en app.json)
cd apps/mobile
npx expo prebuild --platform android --clean

# 4. Build release APK (lee version 1.0.5 / versionCode 6 de app.json)
cd $REPO_ROOT
./scripts/mobile-build-apk.sh

# 5. Instalar preservando data (-r → reinstall, -d → downgrade ok)
~/Library/Android/sdk/platform-tools/adb install -r releases/pos-chile-v1.0.5-vc6.apk

# Si MIUI Security bloquea (gotcha G-M47):
adb push releases/pos-chile-v1.0.5-vc6.apk /sdcard/Download/
# Abrir Mi File Manager en el device → tap el APK → permitir instalación.
```

### Crash test controlado

Para verificar que Sentry captura crashes:

1. Abrir app mobile, login admin.
2. Tab "Más" → "Mi Perfil".
3. Scroll hasta el final.
4. **En dev builds (`__DEV__ === true`)**: aparece botón
   `[DEV] Disparar crash test Sentry`. Tocarlo lanza un error
   intencional `sentry-mobile-test (intentional)`.
5. **En release builds (`__DEV__ === false`)**: el botón NO se renderiza
   (Hermes inlinea `__DEV__` y tree-shakea el bloque). Para probar Sentry
   en release: agregar temporalmente un `throw` en algún handler real
   y rebuild.
6. Esperar ~30s y refrescar el dashboard de Sentry
   (https://dy-company.sentry.io/projects/pos-chile-mobile/).
7. El issue aparece con stacktrace, device info (Xiaomi 2406APNFAG,
   Android 15), y campo `extra` sanitizado.

### Verificación PII pseudonymization

Si quieres verificar que el sanitizer funciona, lanza un crash con
`extra: { email: "test@x.cl", rut: "12.345.678-9" }`. En el dashboard
de Sentry deberías ver `emailHash: <16chars>` y `rutHash: <16chars>` —
**nunca** los valores crudos.

---

## Referencias

- Expo prebuild: https://docs.expo.dev/workflow/prebuild/
- Gradle signing: https://developer.android.com/studio/publish/app-signing
- Cloudflare R2: https://developers.cloudflare.com/r2/
- EAS Update: https://docs.expo.dev/eas-update/introduction/
- Expo updates policy: https://docs.expo.dev/eas-update/runtime-versions/
- Sentry React Native: https://docs.sentry.io/platforms/react-native/
- Sentry Expo plugin: https://docs.sentry.io/platforms/react-native/manual-setup/expo/
