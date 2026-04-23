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
**Estado:** 📋 Plan aprobado — M1 pendiente arranque CLI

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

### Endpoint nuevo en web (requerido para M2)

```typescript
// apps/web/app/api/v1/auth/login/route.ts — NUEVO
// POST { email, password } → { token: JWT, user: { id, email, rol } }
// Stateless — no usa cookies, devuelve JWT en body para mobile
// Mismo bcrypt.compare + encode() que loginAction server action
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
| M2 | Auth: endpoint /api/v1/auth/login stateless, JWT en expo-secure-store, refresh, route guards | CLI | 1-2 días | 🔄 en progreso |
| M3 | Navegación + Dashboard: bottom tabs (Caja/Ventas/Dashboard/Más), KPIs Victory Native | Worktree | 2 días | ⏳ pendiente |
| M4 | POS Caja nativo: scanner expo-camera, carrito, IVA, métodos pago, impresión ESC/POS BT, cash drawer | Worktree | 3-4 días | ⏳ pendiente |
| M5 | Offline-first: expo-sqlite + Drizzle, sync queue, conflict resolution (server-wins stock) | Worktree | 3 días | ⏳ pendiente |
| M6 | Listados paridad: Ventas, Clientes, Productos, Categorías, Usuarios, Alertas, Devoluciones, Descuentos, Reportes, Perfil | Worktree | 4-5 días | ⏳ pendiente |
| M7 | Build & Deploy: EAS Build, TestFlight + Play Internal, EAS Update OTA, iconos/splash, Sentry RN, PostHog | CLI | 2-3 días | ⏳ pendiente |

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

---

## 📋 Pre-Requisitos (CEO / Pierre)

| Item | Costo | Estado | Bloquea |
|------|-------|--------|---------|
| Apple Developer Program | $99/año | ⏳ pendiente | M7 iOS |
| Google Play Developer | $25 one-time | ⏳ pendiente | M7 Android |
| Modelo impresora térmica | variable | ⏳ pendiente | M4 print |
| `EXPO_PUBLIC_API_URL` en .env | gratis | ⏳ pendiente | M2 |
| EAS CLI login (`eas login`) | gratis | ⏳ pendiente | M7 |

> ⚠️ Apple Developer y Google Play NO bloquean M1-M6. Se puede desarrollar y testear en simulador/emulador sin cuenta de stores. Solo bloquean el submit final en M7.

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
