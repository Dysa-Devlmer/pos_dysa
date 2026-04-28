---
title: Proyecto — POS Chile Mobile (React Native)
tags:
  - proyecto
  - pos-chile
  - react-native
  - expo
  - mobile
aliases:
  - POS Mobile
  - Mobile POS
---

# Proyecto: POS Chile Mobile

**Repo:** `apps/mobile/` dentro del monorepo `system_pos`
**Stack:** Expo SDK 52 + TypeScript strict + NativeWind + Drizzle + Zustand
**Aprobado por CEO:** ✅ 2026-04-22
**Estado:** 🔄 M1-M6 completos — M7 prep listo (runbook + app.json + privacy rollout plan) — bloqueado esperando Pierre (cuentas Apple/Google, assets diseño, abogado Dysa, app records manuales en stores)

> **🆕 2026-04-27 — Sprint Mobile QA pendiente:** El CEO + Claude Code CLI generaron `reporte.md` (1436 líneas, raíz del repo) con auditoría estática profunda del mobile. Define **Plan M1-M23** (numeración independiente del M1-M7 original — son fixes, no fases). Standby autorizado a actuar; arrancar por P0 (M1 expo-font useFonts, M2 theme tokens, M3 tabs colorScheme, M4 SafeArea, M5 authStore cascade, M6 Idempotency-Key, M7 AppState leak, M8 jest-expo, M9 ListEmptyComponent). **Hallazgo madre:** `expo-font` instalado pero `useFonts()` nunca llamado → fallback silencioso a system-ui (causa real "se ve horrible"). **Corrección crítica:** F-10 marcado cerrado pero a11y wiring nunca ocurrió (0 `accessibilityLabel/Role/hitSlop` en toda la app).

> **✅ 2026-04-28 — M0 CERRADO en hardware real (commit `225c7b5`):** Cowork verificó end-to-end en Xiaomi Redmi Note 14 (Android 15, Expo Go SDK 54). Bundle Metro compila (`Bundled 24932ms / 1877 modules`), Hermes ejecuta RN 0.81.4, Expo Router registra todas las rutas (`index`, `(auth)/_layout`, `(tabs)/_layout`, `modal`), NativeWind aplica estilos. Causa raíz fue **3 problemas encadenados** (no 1): (i) `important: "html"` generaba selectores web-only que lightningcss no parsea; (ii) `darkMode: ["class", "[data-theme='dark']"]` hacía que el preset emitiera `@cssInterop set darkMode attribute …;` solo entendido por css-interop@0.2.x; (iii) downgrade a `nativewind@4.1.23` traía `css-interop@0.1.22` sin `/jsx-runtime`, pero `expo-router@6.0.23` lo importa. Solución final: `darkMode: "class"` + vuelta a `nativewind@4.2.3` + `react-native-css-interop@0.2.3` como dep DIRECTA (pnpm symlinks no exponen transitivas a Metro) + 7 paquetes SDK 54 alineados + `.nvmrc=20.19.5` (Metro SDK 54 usa `Array.prototype.toReversed`). **Gotcha G-M40 OBSOLETA** — la teoría original ("css-interop@0.2.3 rompe siempre") era falsa; lo que rompía eran `important: "html"` + `darkMode` complejo. Ver gotcha G-M43 para diagnóstico definitivo. El "Unmatched Route" que se ve al disparar el deep link `exp://.../--/` desde ADB NO es bug — es comportamiento esperado de Expo Go en CLI mode (interpreta `--/` como path literal, el `<Redirect>` de `app/index.tsx` no se ejecuta). En APK release o tap normal en Expo Go el redirect funciona.

---

## 🚨 REGLA ABSOLUTA — Producción intocable hasta M7

> **TODO el desarrollo M1-M6 es LOCAL. Prod queda intocable hasta M7 paso 3.**

### Por qué
- `dy-pos.zgamersa.com` tiene usuarios reales. Un bug en endpoint nuevo puede afectarles.
- Mismo Docker Compose + Postgres — un deploy roto puede tumbar el POS web.
- Los tests en prod ensucian logs y métricas reales.

### Regla operativa para CLI, Worktree y Gemini
- ✅ Tests contra `http://localhost:3000` exclusivamente
- ✅ `pnpm dev` / `./scripts/dev.sh start` para desarrollo local
- ✅ Mobile físico: `EXPO_PUBLIC_API_URL=http://<IP-mac-wifi>:3000`
- ❌ NUNCA `https://dy-pos.zgamersa.com` durante M1-M6

### Flujo de deploy final (M7)
1. M1-M6 merged y verificados **localmente**
2. M7: scaffold EAS (solo config, sin builds a stores)
3. Deploy web (`./scripts/deploy.sh`) — agrega endpoints `/api/v1/*` a prod
4. EAS Build con `EXPO_PUBLIC_API_URL=https://dy-pos.zgamersa.com` → TestFlight + Play Internal
5. Staff interno prueba contra prod real
6. Si OK → submit a stores públicas

---

## Mapa de contexto

- [[pos-chile-monorepo]] — proyecto web base, API REST, BD PostgreSQL
- [[stack-tech]] — versiones web (referencia para paridad)
- [[auth-patterns]] — NextAuth v5 web → endpoint stateless mobile
- [[infra-docker]] — VPS, Docker Compose, variables de entorno
- [[agents-workflow]] — roles y protocolo de coordinación

---

## 🎯 Visión

App nativa iOS + Android con **paridad funcional 100% respecto al web POS Chile**.

- **Offline-first v1**: el cajero puede operar sin internet, sincroniza al reconectarse
- **Hardware retail**: scanner de código de barras (cámara), impresora térmica ESC/POS bluetooth, cash drawer kick
- **Misma lógica de negocio**: CLP Int, RUT String, IVA 19%, boletas, descuentos, devoluciones
- **Publicación a stores**: TestFlight (iOS) + Play Internal Testing (Android) → producción
- **OTA updates**: EAS Update para hotfixes sin pasar por revisión de stores

---

## 🚀 Stack Bloqueado

| Capa | Tecnología | Versión / Notas |
|------|-----------|-----------------|
| Framework | Expo | SDK 54 — managed workflow (plan decía 52, CLI usó 54 stable — correcto) |
| Lenguaje | TypeScript | strict mode (igual que web) |
| CSS/Styling | NativeWind | v4 — Tailwind en RN, tokens shadcn portados |
| ORM offline | Drizzle ORM | + expo-sqlite (SQLite local) |
| State global | Zustand | slices: cart, auth, sync |
| Server state | React Query | v5 — cache + invalidation |
| Navegación | React Navigation | v7 — bottom tabs + stack |
| Gráficos | Victory Native + Skia | charts dashboard |
| Auth storage | expo-secure-store | JWT en keychain/keystore |
| Crash reporting | Sentry RN | misma org `dy-company` que web |
| Analytics | PostHog mobile | feature flags + eventos |
| Build & deploy | EAS Build + EAS Update | CI/CD stores + OTA |
| Linting | ESLint + Prettier | config compartida desde `packages/` |

---

## 🏗️ Cambios al Monorepo

### Nuevos workspaces

```
system_pos/
├── apps/
│   ├── web/                    ← existente
│   └── mobile/                 ← NUEVO — Expo app
│       ├── app/                ← Expo Router (file-based routing)
│       ├── components/
│       ├── stores/             ← Zustand slices
│       ├── hooks/
│       ├── db/                 ← Drizzle schema SQLite local
│       └── app.json / eas.json
├── packages/
│   ├── db/                     ← existente (Prisma — solo web/server)
│   ├── ui/                     ← existente
│   ├── typescript-config/      ← existente
│   ├── api-client/             ← NUEVO — fetch + Zod types compartidos
│   │   ├── src/client.ts       ← fetch wrapper con auth headers
│   │   └── src/types.ts        ← Zod schemas de la API REST
│   └── domain/                 ← NUEVO — lógica de negocio compartida
│       ├── src/formatCLP.ts    ← extraído de web lib/utils.ts
│       ├── src/validarRUT.ts   ← extraído de web lib/utils.ts
│       └── src/calcularIVA.ts  ← extraído de web lib/utils.ts
```

### Endpoints web nuevos (para mobile)

```typescript
// apps/web/app/api/v1/auth/login/route.ts — commit 1615b78 + 2edf51a
// POST { email, password } → { token: JWT, user: { id, email, nombre, rol } }
// Stateless, JWT 7d (mobile más corto que web 30d — dispositivos más fáciles de perder)
// Salt = nombre del cookie de sesión v5 (scheme-dependent — ver G-M13)

// apps/web/app/api/v1/_helpers.ts — commit 2edf51a
// requireAuth(request?: Request) ahora prueba Bearer primero, fallback a cookie
// Backwards compatible: web SSR sigue funcionando sin request param
// Tipo Request (no NextRequest) — ver G-M12

// apps/web/app/api/v1/dashboard/route.ts — commit 744521f
// GET → { data: { ventasHoy, stockCritico, ventas7dias } }
// Shape validado runtime con DashboardResponseSchema de @repo/api-client
// Sin rol-gating (cajero/vendedor/admin todos consumen)
// Zona horaria Chile para buckets de fecha — ver G-M15
```

### pnpm-workspace.yaml actualizado

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```
*(sin cambios — `apps/mobile` queda incluido automáticamente)*

---

## 📊 Plan de Fases M1-M7

| Fase | Contenido | Agente | Duración est. | Estado |
|------|-----------|--------|---------------|--------|
| M1 | Foundation: scaffold apps/mobile/, packages/api-client, packages/domain, NativeWind + theme tokens | CLI | 2-3 días | ✅ f4310a2 + 3321414 |
| M2 | Auth: endpoint /api/v1/auth/login stateless, JWT en expo-secure-store, refresh, route guards | CLI | 1-2 días | ✅ d7d034b — verificado CLI + Worktree + Cowork |
| M3 | Navegación + Dashboard: bottom tabs (Caja/Ventas/Dashboard/Más), KPIs Victory Native | Worktree | 2 días | ✅ 3db64d9 (Worktree) + 744521f (CLI) — verificado Cowork 2026-04-22 |
| M4 | POS Caja nativo: scanner expo-camera, carrito, IVA, métodos pago, impresión ESC/POS BT, cash drawer | Worktree | 3-4 días | ✅ 0da7d57 — verificado Cowork 2026-04-22 |
| M5 | Offline-first: expo-sqlite + Drizzle, sync queue, conflict resolution (server-wins stock) | Worktree | 3 días | ✅ 1b07d7b — verificado Cowork 2026-04-22 |
| M6 | Listados paridad: Ventas, Clientes, Productos, Categorías, Usuarios, Alertas, Devoluciones, Descuentos, Reportes, Perfil | Worktree | 4-5 días | ✅ 9240672+b24191e — verificado Cowork 2026-04-22 |
| M7 | Build & Deploy: EAS Build, TestFlight + Play Internal, EAS Update OTA, iconos/splash, Sentry RN, PostHog. **Runbook en `docs/m7-runbook.md` (cf0b9ba) + fix Cowork (ecce0c7)**. Privacy rollout en paralelo (`docs/privacy-rollout-plan.md`, 3b5f3c9). app.json patch Option C ya aplicado: bundleIdentifier `cl.zgamersa.poschile`, runtimeVersion policy `appVersion`, buildNumber 1, versionCode 1 | CLI | 2-3 días | 🔄 prep completo — esperando cuentas stores + diseño assets |

**Total estimado:** 17-22 días ingeniería · ~4-5 semanas calendario con paralelismo de agentes

---

## 🧩 Detalle por Fase

### M1 — Foundation (CLI)

- `apps/mobile/` scaffold con `npx create-expo-app` SDK 52 en modo TypeScript
- NativeWind v4 configurado con tokens de color idénticos al web (dark/light)
- `packages/domain/` — extraer `formatCLP`, `validarRUT`, `calcularIVA` de `apps/web/lib/utils.ts` sin romper el web
- `packages/api-client/` — fetch wrapper tipado con Zod, base URL desde `EXPO_PUBLIC_API_URL`
- Turbo pipeline actualizado: `build`, `lint`, `typecheck` incluyen `apps/mobile`
- EAS CLI instalado, `eas.json` con profiles `development`, `preview`, `production`

### M2 — Auth (CLI)

- Endpoint `POST /api/v1/auth/login` en web: recibe `{email, password}`, devuelve `{token, user}` en body
- JWT generado con `encode()` de `next-auth/jwt` (mismo secret, mismo salt, compatible con sesión web)
- Mobile: almacena JWT en `expo-secure-store`, adjunta en header `Authorization: Bearer`
- Refresh automático: interceptor React Query detecta 401 → refresca → reintenta
- Route guards con `useAuth()` hook — redirect a login si no autenticado

### M3 — Navegación + Dashboard (Worktree)

- React Navigation v7 bottom tabs: **Caja** · **Ventas** · **Dashboard** · **Más**
- Stack navigators dentro de cada tab para drill-down
- Dashboard: KPIs en tiempo real (ventas hoy CLP, transacciones, stock crítico) con Victory Native
- Dark mode respetando sistema operativo (NativeWind `dark:` classes)

### M4 — POS Caja Nativo (Worktree)

- Scanner: `expo-camera` con `BarcodeScanner` — detecta EAN-13, QR, Code-128
- Carrito: Zustand slice `useCartStore` — add/remove/qty/discount
- IVA 19% con `calcularIVA()` de `@repo/domain`
- Métodos de pago: Efectivo / Débito / Crédito / Transferencia
- Impresión ESC/POS: bluetooth LE con `react-native-thermal-receipt-printer-image-qr`
- Cash drawer: comando ESC/POS kick (DLE EOT) post-impresión

### M5 — Offline-First (Worktree)

- SQLite local con Drizzle ORM (schema espejo de tablas críticas: productos, clientes, ventas_pendientes)
- Sync queue: ventas creadas offline se encolan en `sync_queue` table local
- Al reconectar: flush queue → `POST /api/v1/ventas` → actualiza stock servidor
- **Conflict resolution**: si stock servidor < cantidad offline → error visible al cajero + rollback local, NO silencioso
- Estrategia: **server-wins en stock**, client-wins en datos de venta (precio, descuento)
- Indicador visual de estado de conexión en header

### M6 — Listados Paridad (Worktree, paralelizable)

Pantallas con paridad funcional respecto al web:

| Pantalla | CRUD | Notas |
|----------|------|-------|
| Ventas | R (listado + detalle) | sin crear desde aquí — solo desde Caja |
| Clientes | CRUD completo | RUT validado con `@repo/domain` |
| Productos | R + edit stock | crear/eliminar solo desde web (política) |
| Categorías | R | solo lectura en mobile |
| Usuarios | R (solo ADMIN) | gestión desde web |
| Alertas stock | R | push notification si crítico |
| Devoluciones | CR | crear desde detalle venta |
| Descuentos | R | aplicar desde Caja |
| Reportes | R | PDF generado en servidor, descarga |
| Perfil | RU | cambio contraseña + avatar |

### M7 — Build & Deploy (CLI)

- `eas build --profile production` → IPA + APK
- TestFlight upload automático via `eas submit -p ios`
- Play Internal Testing via `eas submit -p android`
- Iconos y splash screen profesionales (1024×1024 icon + splash adaptativo)
- Sentry RN integrado: `sentry-expo` plugin + source maps en EAS
- PostHog: eventos `screen_view`, `caja_venta_completada`, `login_success/failure`
- EAS Update: `eas update --branch production` para OTA hotfixes

### M7-ALT — Distribución APK directa (Fase 2+ pivoteada, 2026-04-24)

**Pivote estratégico**: por presupuesto ($99/año Apple + $25 Google = $124+ anuales)
decidimos no publicar en Play/App Store en v1. En su lugar: distribuir APK auto-hosteado
con update-checker in-app. Ventajas: costo $0, velocidad de release (sin review 1-7 días),
control total. Desventajas: sin auto-install silencioso (Android requiere tap manual
en cada update), solo Android, requiere "allow unknown sources". Asumibles para B2B/interno.

**Fases implementadas:**

| Fase | Contenido | Commit | Estado |
|------|-----------|--------|--------|
| 1 | Keystore infra: script generador (`mobile-generate-keystore.sh`), runbook completo, gitignore defense-in-depth | `904c645` | ✅ |
| 2 | Update checker in-app: `MobileRelease` schema + `/api/mobile/manifest` endpoint (GET público + POST admin con anti-rollback) + `useUpdateCheck` hook + `UpdateBanner` component (banner inline + modal detalle + modal bloqueante forceUpdate) | `436691b` | ✅ |
| 3 | Publish script `scripts/mobile-publish-release.sh`: valida → lee version de app.json → upload R2 vía aws CLI → POST manifest → verifica GET | `d53d60e` | ✅ |
| 4 | (Opcional) EAS Update para OTA JS — deferred hasta tener usuarios reales | - | ⏳ |
| 5 | Build infra: `expo prebuild --platform android` committeado, gradle signing config con `keystore.properties`, script `scripts/mobile-build-apk.sh` | `7652fc6` | ✅ |
| 5b | Fix pnpm + Expo: `apps/mobile/.npmrc` con `node-linker=hoisted` + `shamefully-hoist=true` (sin esto babel-preset-expo y plugins no resuelven en builds release) | `4dbdd63` | ✅ |
| 5c | Primer APK v1.0.0 firmado, subido a R2, registrado en backend (manifest publicado) | live | ✅ 2026-04-24 |
| 5d | Custom domain `apk-dy-pos.zgamersa.com` reemplaza `pub-*.r2.dev` (rate-limited, dev-only). Script + DB row actualizados | `a6feb73` | ✅ |

**Infra creada:**
- Keystore: `~/.android-keystores/pos-chile-release.keystore` (password en Bitwarden — regenerado 2026-04-24, ver G-M30)
- R2 bucket: `pos-chile-mobile-releases` (región ENAM)
- **URL pública prod:** `https://apk-dy-pos.zgamersa.com` (custom domain, NO usar el `pub-*.r2.dev` que es dev-only)
- Cloudflare account: `fa2fd1592fea9c324d39fe5d765d9cd5` (zgamersa)
- R2 API Token S3-compatible generado con scope solo al bucket (credenciales en Bitwarden)
- APK v1.0.0 live: `https://apk-dy-pos.zgamersa.com/pos-chile-v1.0.0-vc1.apk` (157 MB, firmado)

---

## 👥 Reparto de Agentes

| Agente | Rol en Mobile |
|--------|--------------|
| **Claude Code CLI** | M1 Foundation · M2 Auth · M7 Build/Deploy · infra monorepo |
| **Claude Code Worktree** | M3-M6 features + UI · cada fase en worktree aislado |
| **Claude Cowork** | Coordinación · security reviews · memoria · verificación independiente |
| **Gemini** | E2E Detox tests · a11y audit · performance profiling |
| **Pierre** | Carrier de prompts · aprobación de fases · credenciales stores |

---

## ⚠️ Gotchas Preemptivos

**G-M01** — NextAuth v5 usa cookies HttpOnly en web → incompatible con mobile. El endpoint `/api/v1/auth/login` DEBE devolver JWT en body, no en cookie. Usar el mismo `encode()` de `next-auth/jwt` para compatibilidad de firma.

**G-M02** — CLP es siempre `Int` en Prisma y en SQLite Drizzle. Nunca `Float`. `calcularIVA()` retorna `Math.round()`. Sin excepciones.

**G-M03** — RUT siempre `String` normalizado `"12.345.678-9"`. `validarRUT()` de `@repo/domain` antes de cualquier operación.

**G-M04** — Stock es la fuente de conflicto #1 en offline. Estrategia: **server-wins**. Si al sincronizar el servidor reporta stock insuficiente → mostrar error al cajero, NO procesar silenciosamente.

**G-M05** — `expo-camera` en Android < 13 requiere permiso `CAMERA` en runtime con `expo-permissions`. En Android 13+ se maneja automáticamente. Testear en emulador API 30 (Android 11) también.

**G-M06** — Impresión bluetooth ESC/POS: Android 12+ exige `BLUETOOTH_CONNECT` permission en runtime (además de `BLUETOOTH_SCAN`). Sin esto, el pairing silentemente falla. Agregar a `app.json` plugins de permisos.

**G-M07** — NativeWind v4 requiere babel plugin `nativewind/babel` Y metro transformer. Sin ambos, los `className` se ignoran silenciosamente en producción.

**G-M08** — Expo SDK 52 usa la nueva arquitectura (Fabric + JSI) por defecto. Algunas libs de terceros no son compatibles. Verificar compatibilidad antes de instalar cualquier paquete nativo nuevo.

**G-M09** — `expo-sqlite` en SDK 52 usa API async obligatoria. La API sync (`openDatabaseSync`) existe pero puede causar ANR en Android con datasets grandes. Usar siempre async para operaciones de sync queue.

**G-M10** — EAS Build requiere `EXPO_TOKEN` en CI. No commitear el token — usar secrets de GitHub Actions o EAS secrets.

**G-M11** — `packages/domain` extrae funciones de `apps/web/lib/utils.ts`. NO borrar las funciones originales del web — hacer re-export: `export { formatCLP } from '@repo/domain'` en utils.ts para mantener compatibilidad.

**G-M12** — `requireAuth(request?)` en `apps/web/app/api/v1/_helpers.ts` acepta `Request` (Web API base), **no** `NextRequest`. Todos los handlers `/api/v1/*` reciben `Request` estándar en su signature (`export async function GET(request: Request)`). Usar `NextRequest` en el helper rompe 12 callsites con TS2345 (Request no es asignable a NextRequest). El helper solo necesita `request.headers.get("authorization")`, lo cual existe en `Request` — no hace falta subtipo. Commit `2edf51a`.

**G-M13** — Salt del JWT **DEBE** matchear exactamente el nombre del cookie de sesión de NextAuth v5. En `/api/v1/auth/login` (encode) y en `sessionFromBearer` (decode), el salt es scheme-dependent:
- `https://...` → `"__Secure-authjs.session-token"`
- `http://...` → `"authjs.session-token"`
Si el salt no coincide, `decode()` devuelve `null` **silenciosamente** (no throw, no log) → el Bearer no autentica y cae al fallback cookie → mobile siempre ve 401. La regla `USE_SECURE_COOKIES = (NEXTAUTH_URL ?? "").startsWith("https://")` debe estar en AMBOS lados. Commit `1615b78` (encode) + `2edf51a` (decode).

**G-M14** — Rate limiter en memoria (`checkMemoryRateLimit` en `apps/web/lib/rate-limit.ts:77`) es **5 intentos / 15 min por IP**, SIN distinguir entre login success y login failure. Un smoke test que hace `login_success + login_wrong + loop 6 wrong` llega a 429 en el tercer attempt del loop — no en el sexto. Para tests limpios: restart `./scripts/dev.sh` entre corridas o esperar 15 min. El comportamiento es correcto, solo que el ratio 5:1 requiere contador limpio. Detectado al verificar M2.

**G-M15** — Para series tipo `ventas7dias` en zona Chile, usar `Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" })` para producir claves `YYYY-MM-DD` consistentes. **NO** usar `venta.fecha.toISOString().slice(0, 10)` — eso da la fecha UTC, no Chile, y genera off-by-one cerca de medianoche (ej: una venta del 2026-04-22 23:30 CLT sale como `2026-04-23` en UTC). El `page.tsx` del dashboard web ya usaba este pattern; el endpoint `/api/v1/dashboard` lo replica para que mobile y web vean exactamente los mismos buckets. Commit `744521f`.

**G-M16** — **Body schema de POST /api/v1/ventas usa `items`, NO `detalles`**. `detalles` solo aparece en el response (shape Prisma). Si el Zod schema del api-client usa `detalles`, el server responde 400 con mensaje genérico de validación. Corregido en `CrearVentaRequestSchema` (M4, commit `0da7d57`). Descuentos en el request body quedan para M6+ — server los ignora por ahora.

**G-M17** — **Errores de negocio en `/api/v1/ventas` POST devuelven 409**, no 422. Incluye "Stock insuficiente", "producto no encontrado" y "producto inactivo". Mobile diferencia 409 (mostrar nombre del producto + NO limpiar carrito, usuario ajusta) de 422 (validación genérica). El mismo criterio aplica para `/api/v1/devoluciones` POST — todo error de negocio es 409 para alinear con la política G-M04 server-wins: el sync worker mobile marca 409 como `failed` permanente (no reintenta), mientras que 5xx/network los deja en `pending` para retry.

**G-M18** — **`ProductoSchema` usa `codigoBarras` y `alertaStock`**, no `codigo`/`stockMinimo`. El scanner mobile consume GET `/api/v1/productos?codigoBarras=X` (lookup exacto contra el @unique del schema Prisma). Si no hay match devuelve `data: []` — el cliente decide UX. Detectado al alinear el api-client con Prisma en M4; drift del schema causaba fallo silencioso de validación Zod.

**G-M19** — **`VentaSchema` del api-client debe usar `impuesto`, NO `iva`**, y `descuentoPct` es `Decimal(5,2)` que Prisma serializa como string. Cambiar a `z.union([z.number(), z.string()])` porque el JSON puede llegar como string desde PostgreSQL. Además `descuentoMonto` tiene `@default(0)` → no es nullable, es optional con default. Embeds `cliente`, `usuario`, `producto` en detalles son opcionales (dependen del `include` Prisma). Fix en M6 commit `9240672`.

**G-M20** — **Expo Router: coexistencia de `X.tsx` + carpeta `X/` tira warning**. Al convertir una tab (ej. `ventas.tsx`) en stack con sub-rutas (`ventas/[id].tsx`), hay que hacer `rm ventas.tsx` ANTES de crear `ventas/_layout.tsx + ventas/index.tsx`. Si se dejan ambos, Expo Router loguea "conflicting route" en dev y elige un comportamiento no determinístico entre runs. Aplicado a `mas.tsx → mas/` y `ventas.tsx → ventas/` en M6 commit `b24191e`.

**G-M21** — **Gotcha #10 re-surge con `pnpm dev` sin env vars**: `packages/db/src/client.ts` lanza un `throw` a **nivel de módulo** si `POS_DATABASE_URL` no está definida. Esto corre cuando Next.js carga CUALQUIER ruta que importe `@repo/db` (login incluido) → "Internal Server Error" en `/login`. Detectado por Cowork al verificar M6: no es bug de M6 sino del arranque del dev server. Fix: `docker compose up -d` + verificar `apps/web/.env.local` tenga `POS_DATABASE_URL` + reiniciar `pnpm dev`. Considerar en el futuro convertir el throw en warning+lazy-init para evitar bloquear rutas que no usan DB.

**G-M22** — **Bundle ID + package name son PERMANENTES tras publicar en stores**. Decisión bloqueada en M7 prep (2026-04-23): `cl.zgamersa.poschile` para iOS y Android (idéntico, Play Store acepta). Una vez que Apple acepta la primera build con este bundle ID, **no hay forma de cambiarlo sin crear una app nueva** (pierde reviews, instalaciones, etc.). Android es similar pero menos draconiano (permite migración formal con usuario notificado). Si hay que cambiar el bundle ID en el futuro, tratarlo como re-launch, no como update. Commit de la decisión: `ecce0c7`.

**G-M23** — **EAS Submit NO crea el app record en App Store Connect ni en Play Console**; sube el binario a una listing existente. Si Pierre corre `eas submit -p ios` sin haber creado antes la app en ASC (Apps → `+` → New App con bundle ID `cl.zgamersa.poschile`), falla con error críptico: `App with bundle identifier ... was not found`. Idem para Play Console con `404 — The package name is not found`. **Orden obligatorio en M7**: (1) Pierre crea el app record manualmente en cada store con nombre "POS Chile", bundle/package `cl.zgamersa.poschile`, primary language Spanish (Chile), SKU interno. (2) Luego `eas submit`. Documentado en warning block del Paso 8 de `docs/m7-runbook.md`.

**G-M24** — **Privacy Policy URL es blocker BIDIRECCIONAL (Apple + Google)** — ambos stores la requieren pública, HTTPS, sin login, HTML navegable (no PDF), idioma = primary language de la app (Spanish Chile). Si la URL devuelve 404 durante review → rechazo inmediato. Para POS Chile: ruta planificada `https://dy-pos.zgamersa.com/privacidad` implementada en Fase A.3 del `docs/privacy-rollout-plan.md`. El middleware NextAuth debe excluir la ruta (matcher `/((?!api|_next|privacidad|manifest).*)`). Verificación pre-submit: `curl -I` en browser incógnito debe devolver 200. Adicionalmente, **Apple exige page "App Privacy" completa y Google exige "Data Safety" completa**, ambas alineadas al contenido de la policy (mismatch = rechazo).

**G-M26** — **Cloudflare R2 tiene DOS tipos de token incompatibles entre sí**. El **User API Token** (formato `cfut_...`, 53 chars) sirve para Workers, DNS, etc. pero **NO funciona como credencial S3** — falla con `InvalidArgument: Credential access key has length 53, should be 32`. Para `aws s3 cp` hay que generar un **R2 API Token** desde R2 → Manage R2 API tokens → Create API token → Object Read & Write, que devuelve un par `Access Key ID` (32 hex) + `Secret Access Key` (64 hex), formato S3 clásico. El endpoint es `https://{ACCOUNT_ID}.r2.cloudflarestorage.com` + `AWS_DEFAULT_REGION=auto`. El script `scripts/mobile-publish-release.sh` valida el formato antes de intentar upload y falla temprano si le pasan un `cfut_*`. Commit `d53d60e` (con ajuste post-test en sesión del 2026-04-24).

**G-M27** — **MobileRelease `isLatest` flip debe ser atómico vía `$transaction`**. Publicar una release nueva = desmarcar el `isLatest = true` anterior + crear el nuevo con `isLatest = true`. Si se hace en 2 queries sueltas, hay ventana de ~100ms donde NO hay latest publicado (o peor: DOS latest simultáneos). El endpoint `POST /api/mobile/manifest` usa `prisma.$transaction(async (tx) => { updateMany + create })` para garantizar invariante "exactamente 1 latest por plataforma". Además valida anti-rollback: `versionCode` nuevo > `versionCode` actual latest, porque Android rechaza APKs con versionCode menor al instalado (el banner diría "hay update" pero Android rechazaría la instalación). Commit `436691b`.

**G-M28** — **Middleware matcher debe excluir rutas públicas mobile-facing**. La app mobile consulta `/api/mobile/manifest` **antes del login** (para detectar updates críticos desde v1.0.0 antes de que el user se autentique). El endpoint tiene que ser público. El matcher de `apps/web/middleware.ts` se actualizó a `((?!api|_next|...|api/mobile|...).*)` — agregar `api/mobile` al negative lookahead. Rate limiting aplica vía `requireRateLimit(request)` dentro del handler, no desde middleware. Commit `436691b`.

**G-M29** — **Expo + pnpm monorepo requiere `.npmrc` con hoisted linker o builds release fallan**. Sin `apps/mobile/.npmrc` con `node-linker=hoisted` + `public-hoist-pattern[]=*` + `shamefully-hoist=true`, gradle/metro no resuelven dependencias transitivas tipo `babel-preset-expo`, `@babel/plugin-transform-react-jsx`. El error es críptico ("Cannot find module 'X'") y no aparece en `pnpm dev` — solo en `assembleRelease`. Documentado por Expo: https://docs.expo.dev/guides/monorepos/ (sección pnpm). Forzar `git add -f apps/mobile/.npmrc` porque `.npmrc` está globalmente gitignored en muchos templates. Commit `4dbdd63`.

**G-M30** — **Skia (transitivo de victory-native) tiene binarios nativos que install-skia copia a path hoisted, pero gradle resuelve por path pnpm-isolated**. Con `node-linker=hoisted`, `npx install-skia` copia libs a `node_modules/@shopify/react-native-skia/libs/android/`, pero el cmake del módulo busca en `node_modules/.pnpm/@shopify+react-native-skia@<hash>/node_modules/@shopify/react-native-skia/libs/android/`. Build falla con `Could not find libskia.a at <pnpm path>`. Fix: `cp -R node_modules/@shopify/react-native-skia/libs node_modules/.pnpm/@shopify+react-native-skia@<HASH>/node_modules/@shopify/react-native-skia/libs`. Detectado durante primer build APK 2026-04-24. Skia llega como dep transitiva de `victory-native@41.x` (usado en `dashboard.tsx`).

**G-M31** — **Keystore Android: si keytool rechaza el password almacenado, la única opción es regenerar (no hay recovery)**. En Fase 5 el password en `keystore.properties` no abría el `.keystore` ("keystore password was incorrect" en gradle Y en `keytool -list`). Java keystore no tiene reset — si lo perdés, regenerás y la firma cambia. Para v1.0.0 sin distribución previa: trivial (regenerar + relanzar build). Para una app ya distribuida: equivale a re-launch (los users tendrían que desinstalar/reinstalar). Por eso el password debe vivir en password manager (Bitwarden) ANTES del primer publish, y backup del `.keystore` en al menos 2 lugares (iCloud + USB encriptado o similar). Password regenerado 2026-04-24 — ver Bitwarden.

**G-M32** — **`prisma db push` en prod requiere copiar `schema.prisma` al container**. La imagen de prod incluye solo el cliente Prisma compilado, NO los archivos fuente del schema. Cuando agregás un modelo nuevo (ej. `MobileRelease`) sin generar migration y necesitás sincronizar prod, falla porque no encuentra el schema. Fix actual: `scp schema.prisma → VPS`, `docker cp → container`, `DATABASE_URL=$POS_DATABASE_URL npx prisma db push --schema=/tmp/schema.prisma`. Mejora futura: usar migrations propias (`prisma migrate deploy` en el deploy script) o incluir `schema.prisma` en la imagen Docker. Detectado al publicar primer manifest 2026-04-24 — endpoint tiraba 500 con "table public.mobile_releases does not exist".

**G-M33** — **Cloudflare R2 `pub-*.r2.dev` URL es para desarrollo, NO producción**. Cloudflare lo dice explícito en docs. Tiene rate limit, no permite Page Rules personalizadas, expone branding feo (`pub-f8234d800bb...r2.dev` da desconfianza al compartir por WhatsApp). Para prod: conectar custom domain en R2 → Settings → Custom Domains → "Connect Domain" → typear subdominio (ej. `apk-dy-pos.zgamersa.com`). Cloudflare auto-crea CNAME en la zona y emite cert SSL (~1 min). Beneficios: zero rate limit, zero egress fee, zero lock-in (si migrás a S3/otro, mantenés el dominio). Para POS Chile mobile: `apk-dy-pos.zgamersa.com` aplicado 2026-04-24, commit `a6feb73`.

**G-M34** — **Postgres en Prisma usa `@@map` para snake_case, queries crudas necesitan los nombres mapeados**. El modelo `MobileRelease` mapea a tabla `mobile_releases` con columnas snake_case: `apk_url`, `version_code`, `is_latest`, `published_at`, `published_by`, etc. Para `psql` o `executeRaw` hay que usar los nombres de tabla/columna reales (snake_case), NO los del cliente Prisma (camelCase). Ejemplo del session: `UPDATE mobile_releases SET apk_url = ...` funciona, pero `SET "apkUrl" = ...` falla con `column "apkUrl" does not exist`. Verificable corriendo `\d+ mobile_releases` en psql.

**G-M39** — **Expo SDK 54 / Metro bundler nuevo requiere Node 20+** (usa `Array.prototype.toReversed`). Default del proyecto era Node 18.20.8 → `pnpm --filter mobile start` aborta con `TypeError: configs.toReversed is not a function`. Fix: `apps/mobile/.nvmrc` con `20.19.5`. Sin `.nvmrc`, cualquier dev nuevo / agente choca al primer Metro start. Detectado 2026-04-28 al verificar app en Xiaomi.

**G-M40** — **NativeWind 4.2.x + react-native-css-interop@0.2.3 BREAK Metro bundle**. La directiva `@cssInterop set nativewind;` que NativeWind 4.2.x emite en el CSS NO es parseable por su propio css-interop@0.2.3 — aborta con `SyntaxError: Unexpected token Ident("set")` en `cssToReactNativeRuntime`. Single estable: pin EXACTO `"nativewind": "4.1.23"` (sin `^`) en `apps/mobile/package.json` → resuelve a css-interop@0.1.22 (sin la directiva). NativeWind 4.2.0/4.2.1/4.2.2/4.2.3 todas afectadas. NativeWind 5.0 está en preview only. Verificable con `apps/mobile/node_modules/.pnpm/react-native-css-interop@*` — debe ser 0.1.22, NO 0.2.x. Detectado 2026-04-28; commit pendiente.

**G-M41 (obsoleta G-M36)** — **`important: "html"` en `apps/mobile/tailwind.config.js` ROMPE el bundle Metro**. El comentario original (G-M36) asumía que `nativewind/preset` descartaba el prefijo en target native — falso: el output de Tailwind incluye `html .bg-primary { ... }` literal y va directo al pipeline `cssToReactNativeRuntime`, donde css-interop choca con el ident `html` antes del selector. Quitarlo es **obligatorio** para que el bundle compile. Si reaparece el problema de specificity en target web (átomos `r-*` de react-native-web ganando), resolver con un `tailwind.config.web.js` separado o con la API de NativeWind directamente — NO con el hack `important`. Removido 2026-04-28 junto con G-M40.

**G-M42** — **`expo install --fix` FALLA en pnpm workspace cuando `apps/mobile/.npmrc` y root `.npmrc` tienen distinto `public-hoist-pattern`**. Error: `ERR_PNPM_PUBLIC_HOIST_PATTERN_DIFF — This modules directory was created using a different public-hoist-pattern value`. Workaround: editar `apps/mobile/package.json` directo con las versiones canónicas SDK 54 y correr `pnpm install` desde la raíz (que respeta ambos `.npmrc`). Las versiones esperadas SDK 54 las imprime Metro al iniciar (sección "should be updated for best compatibility"). Detectado 2026-04-28; los 7 packages drift confirmados eran: `@react-native-community/netinfo` 12.0.1→11.4.1, `expo` 54.0.33→54.0.34, `expo-camera` 55.0.16→17.0.10 (era versión inválida), `expo-linking` 8.0.11→8.0.12, `expo-sqlite` 55.0.15→16.0.10, `expo-web-browser` 15.0.10→15.0.11, `react-native-svg` 15.15.4→15.12.1.

**G-M44 (audit consolidado 2026-04-28)** — **El "APK mobile roto" reportado en sesiones previas NO es un solo bug — son 6 a 8 bugs simultáneos** (Adenda V de `reporte.md`, SS1-SS8). Antes de tocar mobile en Fase 4, leer la adenda completa para entender la cadena: (SS1) `expo-font` instalado pero nunca cargado en `_layout.tsx` → fallback system-ui en APK release; (SS2) `SafeAreaView` importado de `react-native` (deprecated) → en APK release puede colapsar la altura del login y "no entra"; (SS3) `AppState.addEventListener` registrado a module-scope antes de que Hermes termine `initDb` → race que crashea silencioso; (SS4) `SecureStore` puede colgar la primera vez en APK release (Android) si KeyStore no está warm; (SS5) React Navigation usa `DefaultTheme` que pinta `background: #fff` puro ignorando NativeWind → "no se ven colores"; (SS6) Tab bar usa `useColorScheme()` que contradice G-M38 (forced light hasta dark theme oficial); (SS7) `network_security_config.xml` falta → APK release bloquea HTTP en cleartext (en debug funciona porque `usesCleartextTraffic="true"` está implícito); (SS8) NativeWind 4.2.3 + Hermes + new-arch tiene edge cases reportados arriba en clases dinámicas. **Implicación de proceso:** la siguiente persona/agente que trabaje en mobile debe atacar SS1-SS8 como una sola tanda (una hora cada uno aprox) — fixearlos sueltos genera la falsa sensación de "ya está" porque cada uno enmascara al siguiente. Estado: read-only, esperando autorización CEO/Worktree para arrancar.

**G-M43 (cierre M0, OBSOLETA G-M40)** — Diagnóstico definitivo del bundle bloqueado en SDK 54 + NativeWind 4.2.x: NO es un solo bug del parser de css-interop, son **3 problemas encadenados** que la sesión 2026-04-27 confundió. (1) `important: "html"` en `tailwind.config.js` genera `html .bg-primary { ... }` que rompe `lightningcss` (G-M41 confirmado). (2) `darkMode: ["class", "[data-theme='dark']"]` hace que `nativewind/preset` emita la directiva `@cssInterop set darkMode attribute data-theme='dark';` en el CSS — sintaxis nueva de css-interop@0.2.x. Si tienes css-interop@0.1.22 (de nativewind 4.1.23) la directiva rompe el parser. (3) `expo-router@6.0.23` (parte de SDK 54) hace `import "react-native-css-interop/jsx-runtime"` — export que solo existe en css-interop@0.2.x. Por lo tanto, el downgrade a `nativewind@4.1.23` para "evitar el bug del parser" es **CONTRAPRODUCENTE** una vez que removés `important: "html"` + `darkMode` complejo: te deja con un css-interop sin jsx-runtime que rompe expo-router. **Stack válido SDK 54 + NativeWind:** `nativewind@4.2.3` exact + `react-native-css-interop@0.2.3` como dep DIRECTA de `apps/mobile` (pnpm con symlinks NO expone transitivas a Metro — esto es el detalle que cierra el círculo) + `darkMode: "class"` simple + `important` removido. Verificado en commit `225c7b5` con bundle `Bundled 24932ms / 1877 modules` en Xiaomi Redmi Note 14. La gotcha G-M40 que decía "NativeWind 4.2.x rompe siempre el bundle" era falsa — derivaba de no haber probado removiendo `important: "html"` antes del downgrade.

**G-M25** — **Skill `privacy-compliance` creado y activo** en `.claude/skills/privacy-compliance/` (280 KB, 6240 líneas, 14 archivos). Cubre ciclo completo: Ley 19.628 + Ley 21.719, mapa PII del stack real, store policies campo-a-campo, ARCOP+ endpoints con Prisma, consent management, breach playbook, tabla subprocesadores. Incluye 3 scripts Python ejecutables (`pii_scanner.py` auditor, `privacy_policy_validator.py` score 0-100, `dsar_exporter.py` data export ARCOP+) y 3 templates production-ready (policy español-chileno con 15 secciones, consent banner React/Next, email respuestas DPO). **Local-only** (`.claude/skills/` gitignored como toda la infra DEE), disponible a cualquier agente Claude en esta máquina. Invocar con `/privacy-compliance` o mencionar "privacy"/"compliance" en conversación. Plan de rollout multi-agente en `docs/privacy-rollout-plan.md` (commit `3b5f3c9`) con 5 fases A-E distribuidas entre CLI/Worktree/Cowork/Gemini/Pierre.

---

## 📋 Pre-Requisitos (CEO / Pierre)

| Item | Costo | Estado | Bloquea |
|------|-------|--------|---------|
| Apple Developer Program | $99/año | ⏳ pendiente | M7 iOS submit |
| Google Play Developer | $25 one-time | ⏳ pendiente | M7 Android submit |
| Modelo impresora térmica | variable | ❌ descopado a v1.1 | — (M4 sin BT en v1) |
| `EXPO_PUBLIC_API_URL` en .env | gratis | ✅ M2 resuelto | — |
| EAS CLI login (`eas login`) | gratis | ⏳ pendiente | M7 build |
| **App record creado en ASC** (manual) | gratis | ⏳ pendiente | M7 iOS submit (ver G-M23) |
| **App record creado en Play Console** (manual) | gratis | ⏳ pendiente | M7 Android submit (ver G-M23) |
| **Privacy Policy URL hosteada** (`/privacidad`) | gratis | ⏳ pendiente | M7 submit BIDIRECCIONAL (ver G-M24) |
| **Abogado Dysa disponible** para revisar policy | variable | ⏳ pendiente | M7 (revisión final de policy) |
| **Assets reales de diseño** (6 PNGs icon/splash) | variable | ⏳ pendiente | M7 paso 3 |
| **DPAs firmados** (Sentry, PostHog, Vultr, Upstash) | gratis | ⏳ pendiente | M7 compliance |

> ⚠️ Apple Developer + Google Play + app records + Privacy Policy URL NO bloquean M1-M6. Solo bloquean el submit final en M7. El rollout de privacy compliance está planificado en `docs/privacy-rollout-plan.md` con fases paralelizables.

---

## 🏁 Criterios de Éxito ("100/100 Mobile")

- [ ] Paridad funcional 100% con web (todas las pantallas de M6 operativas)
- [ ] Offline real: crear venta sin internet → sincroniza al reconectar
- [ ] Tests E2E: Detox suite cubre login → caja → venta → impresión (Gemini)
- [ ] Accesibilidad: `accessibilityLabel` en todos los botones/inputs, VoiceOver/TalkBack OK
- [ ] TestFlight: build instalable en iPhone real (Pierre)
- [ ] Play Internal: build instalable en Android real (Pierre)
- [ ] OTA: `eas update` desplegado y recibido sin reinstalar app
- [ ] Crash reporting: evento de prueba visible en Sentry RN dashboard
- [ ] Iconos y splash: assets profesionales (no defaults de Expo)
- [ ] Performance: FlatList con 1000 productos sin jank (testeado con Flipper)

---

## 🔗 Referencias

- Repo web: [[pos-chile-monorepo]]
- API REST docs: `https://dy-pos.zgamersa.com/api/docs`
- Sentry org: `dy-company` · proyecto `pos-chile-mobile` (crear en M7)
- EAS project: vincular en M1 con `eas init`
