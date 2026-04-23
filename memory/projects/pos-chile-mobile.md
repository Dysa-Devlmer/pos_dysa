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
