# Privacy Manifest — POS Chile Mobile

> Documento operativo para submission Apple App Store + Google Play Store.
> Referencia: `apps/mobile/app.json` `expo.ios.privacyManifests` (Expo aplica
> esto al `PrivacyInfo.xcprivacy` del bundle iOS automáticamente).

Última actualización: 2026-04-26

---

## 1. Contexto

POS Chile es un B2B SaaS (sistema de punto de venta) instalado por
cajeros y administradores de tiendas. **NO** es app de consumo masivo,
NO recolecta datos para advertising, NO comparte datos con terceros más
allá de:
- **Sentry** (functional software, USA) — telemetría de errores con
  email/IP **pseudonimizados** server-side antes de salir del backend
  (ver `apps/web/lib/sentry-helpers.ts`).

Categorías obligatorias para Apple Privacy Manifest (PrivacyInfo.xcprivacy)
y Google Play Data Safety completadas a continuación.

---

## 2. Apple — Privacy Manifest (`PrivacyInfo.xcprivacy`)

### 2.1 NSPrivacyTracking

```
false
```

POS Chile **NO** rastrea al usuario a través de apps de terceros (sin
SDK de advertising, sin IDFA, sin fingerprinting). Required Reason API
declarada exclusivamente para AppFunctionality y Analytics propios.

### 2.2 NSPrivacyAccessedAPITypes

| API Category | Reason Code | Justificación |
|---|---|---|
| `NSPrivacyAccessedAPICategoryUserDefaults` | `CA92.1` | `AsyncStorage` y `expo-secure-store` para persistir el JWT de sesión y preferencias del cajero. **Display features to user / save user state** — categoría aceptada por Apple. |
| `NSPrivacyAccessedAPICategoryFileTimestamp` | `0A2A.1` | `expo-sqlite` (sync queue offline) lee timestamps de archivo para detectar cambios entre boots. **Display features to user** — categoría aceptada. |

> ⚠️ Si en el futuro se agrega `expo-haptics` con accesos a system boot
> time, agregar `NSPrivacyAccessedAPICategorySystemBootTime` con reason
> `35F9.1` y actualizar este doc.

### 2.3 NSPrivacyCollectedDataTypes

| Tipo | Linked? | Tracking? | Purpose |
|---|---|---|---|
| **EmailAddress** | ✅ true | ❌ false | AppFunctionality (login) |
| **UserID** | ✅ true | ❌ false | AppFunctionality (sesión) |
| **DeviceID** | ❌ false | ❌ false | Analytics (Sentry) |

`Linked` = vinculable al usuario individual.
`Tracking` = compartido con terceros para advertising/profiling fuera
del POS (siempre false en este producto).

### 2.4 Verificación pre-submit

```bash
# 1. Generar el plist desde app.json
cd apps/mobile && pnpm exec expo prebuild --platform ios

# 2. Inspeccionar el plist generado
cat ios/POSChile/PrivacyInfo.xcprivacy

# 3. Validar con Xcode (opcional, en macOS):
xcrun PrivacyAccessValidator validate ios/POSChile/PrivacyInfo.xcprivacy
```

Si `expo prebuild` no genera el plist automáticamente (Expo SDK <50),
copiar manualmente el bloque `privacyManifests` de `app.json` al archivo
`ios/POSChile/PrivacyInfo.xcprivacy` con conversión JSON → plist XML.

---

## 3. Google Play — Data Safety form (paste manual al submit)

Google Play Console NO acepta archivo manifest equivalente — hay que
completar el form interactivo en *Settings → Privacy → Data Safety*.
Esta tabla es la **fuente de verdad** para mantener consistencia entre
ambas tiendas.

### 3.1 Data Collection — declarar SÍ recolectamos

| Data Type | Categoría Google | Collected? | Shared? | Optional? | Linked to User? | Purpose |
|---|---|---|---|---|---|---|
| Email address | Personal info | ✅ Yes | ❌ No | ❌ No (required for login) | ✅ Yes | App functionality |
| User IDs | Personal info | ✅ Yes | ❌ No | ❌ No | ✅ Yes | App functionality |
| Crash logs | App activity | ✅ Yes | ✅ Yes (Sentry) | ❌ No | ❌ No (pseudonimizado) | Analytics |
| Diagnostics | App activity | ✅ Yes | ✅ Yes (Sentry) | ❌ No | ❌ No | Analytics |

### 3.2 Data Collection — declarar NO recolectamos

- ❌ Location (precise / approximate) — la cámara escanea barcode, no GPS.
- ❌ Personal info: name, phone, address, race, sexual orientation, etc.
- ❌ Financial info: payment info, credit score, financial details.
- ❌ Health & fitness.
- ❌ Messages: emails, SMS, MMS.
- ❌ Photos & videos (la cámara escanea barcode pero NO guarda foto).
- ❌ Audio files / Voice / Sound recordings.
- ❌ Files & docs.
- ❌ Calendar / Contacts.
- ❌ App activity: page views (no tracking de UX), in-app search history.
- ❌ Web browsing history.
- ❌ App info & performance: solo crash logs vía Sentry (declarado arriba).
- ❌ Device or other IDs (más allá de DeviceID Sentry pseudonimizado).

### 3.3 Security practices (form Google requiere check)

| Pregunta | Respuesta | Evidencia |
|---|---|---|
| Data is encrypted in transit? | ✅ Yes | TLS 1.3 (Cloudflare → Vultr origin Full strict) |
| Can users request data be deleted? | ⚠️ **Parcial** | Endpoint `/api/v1/me/erase` está en F-13 (deferred). Por ahora: contacto manual a `privacidad@dysa.cl` |
| Has the data been handled according to a recognized framework? | ✅ Yes | Ley 19.628 + Ley 21.719 (Chile) |
| Has the app been independently reviewed? | ❌ No | (post-MVP) |

### 3.4 Privacy policy URL

```
https://dy-pos.zgamersa.com/privacidad
```

(página `apps/web/app/privacidad/page.tsx`, JSX estático, banner amber
"Borrador en revisión legal" hasta que Pierre/Legal Dysa firme.)

---

## 4. Sentry mobile — pendiente F-13

> El SDK `@sentry/react-native` **NO está instalado** en `apps/mobile`
> a la fecha de este doc. Cuando se instale (F-13), aplicar el mismo
> patrón `beforeSend` que `apps/web/sentry.{server,edge,client}.config.ts`:

```ts
// apps/mobile/sentry.config.ts (futuro)
import * as Sentry from "@sentry/react-native";
import { pseudonymize, truncateIP } from "./lib/privacy"; // helper local

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? "development" : "production",
  sendDefaultPii: false,
  beforeSend(event) {
    if (event.user?.email) {
      event.user.email = pseudonymize(event.user.email);
    }
    if (event.user?.ip_address && event.user.ip_address !== "{{auto}}") {
      event.user.ip_address = truncateIP(event.user.ip_address) ?? undefined;
    }
    return event;
  },
});
```

**Trabajo necesario para F-13:**

1. `pnpm --filter @repo/mobile add @sentry/react-native`
2. `npx @sentry/wizard@latest -i reactNative` (configura Xcode + Gradle)
3. Crear `apps/mobile/lib/privacy.ts` (port liviano de `apps/web/lib/privacy.ts`
   usando `expo-crypto` en vez de Node `crypto`)
4. Crear `apps/mobile/sentry.config.ts` con el bloque arriba
5. Importar `sentry.config` en `apps/mobile/app/_layout.tsx` ANTES de cualquier
   `import` que pueda crashear
6. **Rebuild APK** — Sentry React Native requiere bundle nativo nuevo
7. Documentar en este doc + `memory/projects/pos-chile-mobile.md` como gotcha

---

## 5. Próxima revisión

- **Antes de cada submit a stores** — verificar que `privacyManifests`
  en `app.json` sigue alineado con esta tabla.
- **Trimestralmente** — revisar Apple Privacy Manifest evolution
  (categorías nuevas, reason codes deprecated).
- **Si se agrega un SDK de terceros** (Sentry, PostHog, FB SDK, etc.) —
  re-evaluar Tracking + DataTypes antes del próximo release.

---

## 6. Referencias

- Apple — Required Reason API: https://developer.apple.com/documentation/bundleresources/privacy_manifest_files
- Apple — Privacy Manifest categorias: https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api
- Google Play — Data Safety: https://play.google.com/console/about/programs/data-safety/
- POS Chile — `apps/web/app/privacidad/page.tsx` (privacy policy pública)
- POS Chile — `apps/web/lib/privacy.ts` (pseudonymize + truncateIP)
- POS Chile — `.claude/skills/privacy-compliance/` (skill local con templates)
