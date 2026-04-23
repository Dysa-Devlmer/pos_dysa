# M7 — Build & Deploy Runbook

> **Objetivo**: publicar POS Chile mobile en TestFlight (iOS) + Play Internal (Android), configurar OTA updates, y deployar los endpoints `/api/v1/*` a producción web.
>
> **Agente ejecutor**: Claude Code CLI coordinado con Pierre (cuentas stores, aprobaciones).
> **Verificador**: Claude Cowork.
>
> Estado al crear este runbook (2026-04-22): M1–M6 completos y verificados localmente. Web prod intocado desde antes de M1.

---

## 🎯 Decisiones bloqueadas (no cambiar sin consultar)

| Item | Valor | Irreversible? |
|---|---|---|
| Bundle ID iOS | `cl.zgamersa.poschile` | ✅ **SÍ** (tras publicar) |
| Package Android | `cl.zgamersa.poschile` | ✅ **SÍ** (tras publicar) |
| Nombre en stores | `POS Chile` | No (editable) |
| Versión inicial | `1.0.0` | No |
| `runtimeVersion` policy | `"appVersion"` | Parcial (cambiar policy afecta OTA delivery) |
| ESC/POS BT impresión | **Fuera de v1** → TODO comentado en `caja.tsx` para 1.1.0 | No |
| Telemetría | Sentry RN + PostHog instalados antes de build store | No |

### Qué significa `runtimeVersion: "appVersion"`

Los updates OTA (`eas update`) solo llegan a usuarios con la misma `version` declarada en `app.json`.
- Si Pierre publica `1.0.0` y luego hace `eas update`, solo usuarios con v1.0.0 reciben.
- Si Pierre sube `1.1.0` al store, esos usuarios están aislados del canal OTA hasta que se haga un `eas update --runtime-version 1.1.0`.
- Impide que un OTA con API mismatch crashee dispositivos viejos.

---

## 📋 Checklist Pre-flight — Pierre

**Bloquean todo M7** (no empezar hasta tener ✅ en los 4 primeros):

- [ ] **`eas-cli` instalado global** — `npm install -g eas-cli` · verificar con `eas --version` (≥ 13.0.0)
- [ ] **`eas login` corrido** — cuenta Expo/EAS activa · verificar con `eas whoami`
- [ ] **Apple Developer Program activo** ($99/año) — necesario para cualquier build iOS device y submit TestFlight
- [ ] **Google Play Developer activo** ($25 one-time) — necesario para submit Play Internal

**Bloquean submit a stores** (pasos 8–9; resolver antes de paso 7):

- [ ] **App record creado en App Store Connect** — Pierre registra manualmente la app en [appstoreconnect.apple.com](https://appstoreconnect.apple.com) (Apps → `+` → New App) con:
  - **Platform**: iOS
  - **Name**: `POS Chile`
  - **Primary Language**: Spanish (Chile)
  - **Bundle ID**: `cl.zgamersa.poschile` (debe matchear exacto al del `app.json`)
  - **SKU**: `pos-chile-mobile` (o cualquier ID interno único)

  **BLOQUEA `eas submit -p ios`** — EAS solo sube binarios a listings existentes, no crea el record. Error típico si falta: `App with bundle identifier ... was not found`.

- [ ] **App record creado en Play Console** — Pierre registra en [play.google.com/console](https://play.google.com/console) (All apps → Create app) con:
  - **App name**: `POS Chile`
  - **Default language**: Spanish (Chile)
  - **App or game**: App
  - **Free or paid**: Free
  - **Package name** (implícito, se valida al primer upload): `cl.zgamersa.poschile`

  **BLOQUEA `eas submit -p android`** — mismo motivo que iOS.

- [ ] **Privacy Policy URL pública y funcional** — obligatoria porque POS Chile procesa datos personales:
  - **RUT** (cédula chilena) — identificador fiscal personal
  - **email, nombre** de usuarios y clientes
  - **historial de ventas** asociado a clientes identificados

  Apple (App Privacy) y Google (Data Safety form) EXIGEN URL de política pública antes de publicar. Si falta o está caída al momento de review: rechazo inmediato.

  **Sugerido**: hostear en `https://dy-pos.zgamersa.com/privacidad` o `/legal/privacidad` — usa la misma infra web que ya está en prod. La redacción legal debe hacerla el responsable legal de Dysa/Zgamersa (NO generar con template sin revisión jurídica — en Chile la Ley 19.628 + Ley 21.719 aplican).

  **BLOQUEA aprobación en ambos stores**.

- [ ] `appleId`, `ascAppId`, `appleTeamId` — Pierre los copia desde App Store Connect tras crear la App (App Information → General Information). Se pegan en `eas.json` > `submit.production.ios`.
- [ ] `android-service-account.json` — JSON key desde Google Cloud Console (API "Google Play Android Developer") con permisos de release management, colocar en `apps/mobile/android-service-account.json`. **Añadir a `.gitignore` ANTES de descargar** (contiene private key de la cuenta de servicio).

**Assets de diseño** (bloquean M7 paso 3):

- [ ] Ver sección [🎨 Assets a producir](#-assets-a-producir-encargar-a-diseño) abajo

---

## 🚀 Flujo M7 — Pasos en orden estricto

### Paso 1 — Instalar deps nuevas (telemetría)

Ejecuta desde raíz del monorepo:

```bash
pnpm --filter @repo/mobile add \
  @sentry/react-native \
  posthog-react-native \
  @react-native-async-storage/async-storage

# expo-related que soportan los dos anteriores
pnpm --filter @repo/mobile add \
  sentry-expo \
  expo-application \
  expo-device \
  expo-localization
```

**Verificación**: `pnpm typecheck` debe pasar 2/2.

### Paso 2 — Actualizar `app.json`

CLI aplicará estos cambios (preview primero, Pierre aprueba antes de commit):

```jsonc
{
  "expo": {
    "name": "POS Chile",
    "slug": "pos-chile-mobile",
    "version": "1.0.0",
    "runtimeVersion": {
      "policy": "appVersion"
    },
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "poschile",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "owner": "<llena-eas-init>",
    "updates": {
      "url": "<llena-eas-init>"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "cl.zgamersa.poschile",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "POS Chile usa la cámara para escanear códigos de barras de productos en la caja.",
        "ITSAppUsesNonExemptEncryption": false
      }
    },
    "android": {
      "package": "cl.zgamersa.poschile",
      "versionCode": 1,
      "adaptiveIcon": {
        "backgroundColor": "#FFFFFF",
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      },
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false
    },
    "plugins": [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff",
          "dark": { "backgroundColor": "#000000" }
        }
      ],
      [
        "expo-camera",
        {
          "cameraPermission": "POS Chile necesita la cámara para escanear códigos de barras de productos.",
          "microphonePermission": false,
          "recordAudioAndroid": false
        }
      ],
      [
        "@sentry/react-native/expo",
        {
          "organization": "dy-company",
          "project": "pos-chile-mobile",
          "url": "https://sentry.io/"
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    }
  }
}
```

**Notas clave**:
- `ITSAppUsesNonExemptEncryption: false` evita el prompt de crypto en cada submit (POS Chile usa solo HTTPS estándar, no crypto propio).
- `buildNumber` y `versionCode` quedan como sentinela — EAS los auto-incrementa en cada build gracias a `appVersionSource: "remote"` + `autoIncrement: true` en `eas.json`.
- `owner` y `updates.url` se dejan como placeholder — `eas init` los llena automáticamente.

### Paso 3 — Reemplazar assets placeholder

Ver sección [🎨 Assets a producir](#-assets-a-producir-encargar-a-diseño) para specs.

Pierre copia los PNGs finales a:
```
apps/mobile/assets/images/icon.png                 (1024×1024)
apps/mobile/assets/images/splash-icon.png          (1024×1024, centrado)
apps/mobile/assets/images/android-icon-foreground.png (1024×1024)
apps/mobile/assets/images/android-icon-background.png (1024×1024)
apps/mobile/assets/images/android-icon-monochrome.png (1024×1024)
apps/mobile/assets/images/favicon.png              (48×48)
```

**Verificación**: `file apps/mobile/assets/images/*.png` — ninguno debe verse como grilla gris con círculos ni "A" azul con guías.

### Paso 4 — `eas init`

Desde `apps/mobile/`:

```bash
cd apps/mobile
eas init
```

EAS pregunta por organización/proyecto y auto-llena en `app.json`:
- `expo.owner`: nombre de la organización en EAS
- `expo.updates.url`: `https://u.expo.dev/<project-id>`
- Crea `expo.extra.eas.projectId` con el ID único del proyecto

**Verificación**:
```bash
grep -E "\"owner\"|\"projectId\"|\"url\"" apps/mobile/app.json
```
Deben aparecer los 3 con valores reales (no `<llena-eas-init>`).

### Paso 5 — Configurar Sentry + PostHog en código

CLI crea wrapper de init en `apps/mobile/lib/telemetry.ts`:

```typescript
import * as Sentry from '@sentry/react-native';
import PostHog from 'posthog-react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

export function initTelemetry() {
  if (SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      enableInExpoDevelopment: false,
      debug: __DEV__,
      tracesSampleRate: 0.2,
    });
  }
  if (POSTHOG_KEY) {
    // PostHog devuelve instance async — se maneja desde el component
  }
}

export const posthog = POSTHOG_KEY
  ? new PostHog(POSTHOG_KEY, { host: POSTHOG_HOST })
  : null;
```

Wrappear el root en `apps/mobile/app/_layout.tsx`:
```typescript
import { Sentry } from '@sentry/react-native';
// ... dentro del root
export default Sentry.wrap(RootLayout);
```

**Verificación**: Lanzar error de prueba desde `/more` con botón "Crash test" (agregar temporalmente), verificar evento en Sentry dashboard + PostHog event `app_crash_test`.

### Paso 6 — Build de preview (valida configuración sin tocar stores)

```bash
cd apps/mobile
eas build --profile preview --platform all
```

Genera:
- iOS: IPA para instalación TestFlight interna (requiere Apple Dev Program ya)
- Android: APK descargable para testing directo

**Verificación**:
- Pierre descarga APK en Android real y prueba login + venta en Caja
- Cajero de la empresa prueba en iPhone (via TestFlight interno si Apple Dev listo)

### Paso 7 — Build production

Solo después de que preview pase QA:

```bash
eas build --profile production --platform all
```

Genera:
- iOS: IPA firmado para submit App Store
- Android: AAB (bundle) para Play Store

### Paso 8 — Submit a stores

> ⚠️ **Pre-requisito obligatorio** — confirmar ANTES de ejecutar los comandos:
>
> 1. **App record ya creado** en App Store Connect (bundle ID `cl.zgamersa.poschile`) y en Play Console (package `cl.zgamersa.poschile`). EAS Submit **no crea el listing**, solo sube el binario a una listing existente. Sin este paso → fallas con error críptico:
>    - iOS: `App with bundle identifier 'cl.zgamersa.poschile' was not found in App Store Connect`
>    - Android: `404 — The package name is not found in Google Play` (o errores de Play Developer API)
> 2. **Privacy Policy URL funcionando** y linkeada en la ficha de cada store (App Store Connect → App Privacy; Play Console → Data Safety). Sin esto, el review rechaza el submit antes de llegar a testers.
> 3. `eas.json > submit.production.ios` con `appleId` + `ascAppId` + `appleTeamId` llenados.
> 4. `apps/mobile/android-service-account.json` en su lugar y en `.gitignore`.
>
> Los 4 items están en el pre-flight checklist arriba — revisar que estén `[x]` antes de continuar.

**iOS (TestFlight)**:
```bash
eas submit -p ios --latest
```
- Usa `submit.production.ios` de `eas.json` (Pierre debe llenar `appleId`, `ascAppId`, `appleTeamId` previamente)
- TestFlight disponible dentro de 10-30 min para testers internos agregados en App Store Connect

**Android (Play Internal)**:
```bash
eas submit -p android --latest
```
- Requiere `android-service-account.json` en `apps/mobile/`
- `track: internal` (de `eas.json`) sube a canal Internal Testing — instalable solo por emails agregados en Play Console

### Paso 9 — Configurar canal OTA production

```bash
eas update --branch production --message "v1.0.0 — launch build"
```

- Publica un update al canal `production` (coincide con `channel: production` en `eas.json` > `build.production`)
- Como `runtimeVersion.policy = "appVersion"`, solo usuarios en v1.0.0 lo reciben
- Para hotfixes futuros: cambiar código → `eas update --branch production --message "hotfix X"` sin pasar por stores

### Paso 10 — Deploy web (endpoints `/api/v1/*`)

**Último paso** — esto toca producción web:

```bash
# Desde raíz del monorepo
./scripts/deploy.sh
```

- rsync + Docker rebuild en VPS `64.176.21.229`
- Health check 12×10s con rollback auto
- Habilita endpoints `/api/v1/auth/login`, `/api/v1/dashboard`, `/api/v1/productos`, etc. en prod

**Verificación POST-deploy**:
```bash
# En browser incógnito (gotcha 77 — no curl):
https://dy-pos.zgamersa.com/login          # web sigue funcionando
curl https://dy-pos.zgamersa.com/api/health # 200 OK

# JWT endpoint:
curl -X POST https://dy-pos.zgamersa.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pos-chile.cl","password":"admin123"}'
# → 200 con { token, user }
```

---

## 🎨 Assets a producir (encargar a diseño)

**Todos los assets actuales son placeholders del template Expo** — confirmado visualmente 2026-04-22:
- `icon.png`: "A" azul con líneas de guía sobre fondo celeste → placeholder
- `splash-icon.png`: grilla gris con 3 círculos concéntricos → placeholder
- `android-icon-foreground.png`: misma "A" azul sin guías → placeholder
- `android-icon-monochrome.png`: misma "A" en gris → placeholder

### Specs exactos por asset

| Archivo | Dimensiones | Formato | Notas |
|---|---|---|---|
| `icon.png` | **1024×1024** | PNG sin transparencia | Icono iOS + genérico. Debe verse bien con esquinas redondeadas automáticas de iOS (no dibujar borde propio). Background sólido o degradado suave. |
| `splash-icon.png` | **1024×1024** | PNG con transparencia | Logo centrado, ocupando ~200px del centro (config `imageWidth: 200`). Sin texto largo — el splash solo se ve 0.5–1s. |
| `android-icon-foreground.png` | **1024×1024** (recomendado, hoy es 512) | PNG con transparencia | Logo dentro del safe zone central: **dejar 33% de margen a cada lado** (el área útil es 432×432 de los 1024). Si el logo toca bordes, Android lo recorta con la máscara. |
| `android-icon-background.png` | **1024×1024** | PNG o color sólido | Color corporativo (naranja `#f97316` según dark mode de la app, o custom). Se ve detrás del foreground cuando el usuario tiene forma de icono circular/squircle. |
| `android-icon-monochrome.png` | **1024×1024** | PNG blanco sobre transparente | Logo en silueta BLANCA pura. Android 13+ con Material You tematiza automáticamente. Si no queda bien en una forma simple → hacer una versión ultra-simplificada. |
| `favicon.png` | **48×48** | PNG | Web fallback. Tan chico que hay que usar versión simplificada del logo. |

### Diseño — brief breve

- **Marca**: POS Chile — punto de venta retail para pymes chilenas
- **Tono**: profesional, confiable, moderno. NO infantil, NO juguetón.
- **Paleta**: primary `#f97316` (orange-500, ya presente en login mobile y loader), neutros slate/zinc
- **Referencias que funcionan**: Square POS, Shopify POS, Stripe Terminal (limpios, sobrios)
- **NO referencias**: Nubanka (demasiado purple), Mercado Pago (demasiado saturado)

### Entrega sugerida a diseño

```
brief_diseño_pos_chile.md
├── 1 icono master SVG vectorial
├── 6 exports PNG con specs de la tabla
└── Variaciones dark/light si el logo tiene color (monochrome cubre dark mode nativo)
```

---

## 🧪 Verificación final antes de submit stores

Ejecutar **todo** antes de `eas submit`:

```bash
# 1. Typecheck 2/2 (web + mobile)
pnpm typecheck

# 2. Lint sin warnings nuevos
pnpm --filter mobile lint

# 3. Build local exitoso
pnpm --filter web build

# 4. Preview build instalado y operado por al menos 2 usuarios reales:
#    - admin haciendo 3 ventas offline → sync al reconectarse
#    - cajero haciendo 1 venta + revisando dashboard
#    - ambos sin crashes durante 15 min de uso real

# 5. Sentry dashboard sin errores "unhandled" nuevos en las últimas 24h

# 6. PostHog recibiendo eventos: screen_view, login_success, caja_venta_completada
```

---

## 🆘 Rollback / qué hacer si algo falla

| Falla | Acción |
|---|---|
| `eas build` falla por config | Ver logs en `eas.dev` + logs locales en `~/.eas/logs/`. Fix en `app.json` o `eas.json`, rebuild. No afecta nada en prod. |
| iOS submit rechazado por Apple | Leer el `app_review_notes` que envía Apple. Fix en código/assets/privacy, rebuild, re-submit. Delay típico: 24-72h por ronda. |
| Android submit rechazado | Play Console explica el motivo en "App content". Fix, rebuild, re-submit. Delay ~2-6h. |
| OTA update rompe la app en prod | `eas update:republish --branch production --group <previous-group-id>` — vuelve al update anterior en ≤ 30 min. Si es crash total, mandar hotfix vía store (más lento). |
| `./scripts/deploy.sh` web falla | El script hace rollback automático al último backup (6 fases). Si llega health-check fail, ver logs en `/var/log/pos-chile-deploy.log` en VPS. |

---

## 📎 Referencias

- [Expo EAS docs](https://docs.expo.dev/eas/) · [EAS Build](https://docs.expo.dev/build/introduction/) · [EAS Submit](https://docs.expo.dev/submit/introduction/) · [EAS Update](https://docs.expo.dev/eas-update/introduction/)
- [Apple App Store Connect](https://appstoreconnect.apple.com/) · [Google Play Console](https://play.google.com/console/)
- [Sentry RN docs](https://docs.sentry.io/platforms/react-native/) · [PostHog RN docs](https://posthog.com/docs/libraries/react-native)
- Plan maestro mobile: `memory/projects/pos-chile-mobile.md`
- Gotchas del monorepo: `memory/projects/pos-chile-monorepo.md`
- Deploy web: `scripts/deploy.sh` (6 fases con rollback auto)
