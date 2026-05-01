---
title: Proyecto — POS Chile Monorepo
tags:
  - proyecto
  - pos-chile
  - nextjs
  - master
aliases:
  - POS Chile
  - Monorepo POS
---

# Proyecto: POS Chile Monorepo

**Repo local:** `/Users/devlmer/Dysa-Projects/system_pos`
**Stack:** Next.js 15.5 + Prisma 6.19 + PostgreSQL 16 + Tailwind v4 + NextAuth v5-beta.31
**Patrón:** Turborepo 2.9 monorepo con pnpm 10.6.0

> **🆕 2026-04-29 — PIVOT a SaaS confirmed.** El proyecto deja de ser
> "single-tenant para uso propio" y se convierte en **POS-as-a-Service
> con licencias vendibles**.
>
> **Identidad oficial** (sesión 2026-04-29):
> - Nombre del producto: **DyPos CL** (no más POS Chile / SystemQR / Dysa POS)
> - Owner: **Pierre Benites Solier** — empresa **Dyon Labs**
> - Email contacto/DPO: **private@zgamersa.com**
> - Atribución commits: `Co-Authored-By: Ulmer Solier <bpier@zgamersa.com>`
>
> **Modelo elegido**: deployment dedicado por cliente (Camino C) +
> hosting managed por Dyon Labs (cliente NO se hace cargo del fierro).
> Cada cliente con licencia recibe su propio Docker Compose (web +
> postgres + pgadmin) con dominio/subdominio propio, BD aislada, APK
> mobile con su branding. Aislamiento físico = imposible leak entre
> clientes.
>
> **Pricing (recomendación pendiente confirmación)**: Starter $24.990 /
> Pro $44.990 / Business $84.990 CLP/mes. Setup gratis. Onboarding
> Premium $150.000 opcional. Detalles en `docs/PRICING-STRATEGY.md`.
>
> **Distribución APK**: `apk-dypos.zgamersa.com` (subdominio confirmado).
>
> **Backup**: disco externo USB manual por ahora — el script
> `scripts/backup-project.sh` ya soporta override `BACKUP_DEST=/Volumes/...`.
>
> **Mobile editar venta**: NO se permite en mobile (anti-fraude). Solo
> ADMIN web puede con audit log + razón obligatoria. Filosofía completa
> en `docs/SALES-PHILOSOPHY.md`.
>
> Decisiones autoritativas: `memory/decisions/2026-04-29-saas-pivot-decisions.md`.
> Visión: `docs/VISION.md`. ADRs: `docs/adr/001-*.md`, `docs/adr/002-*.md`.
> Web actual `dy-pos.zgamersa.com` queda como **demo permanente** del owner.

## Mapa de contexto

- [[stack-tech]] — versiones exactas, deps por feature, gotchas por capa
- [[auth-patterns]] — NextAuth v5 patterns, middleware RBAC, gotchas beta
- [[security-owasp]] — audits OWASP, Gemini G1-G5, GAP-1/2, GAP-PROD-1/2
- [[business-logic]] — IVA, RUT, CLP, ventas, descuentos, devoluciones
- [[infra-docker]] — Compose, Dockerfile multi-stage, puertos, healthcheck
- [[agents-workflow]] — roles Cowork/CLI/Worktree/Gemini + protocolo verificación
- [[roadmap]] — gaps post-prod priorizados (GAP-01→GAP-11)
- [[pos-chile-mobile]] — plan maestro app React Native (Expo SDK 52) aprobado 2026-04-22

**Guía externa replicable**: [`OBSIDIAN-CLAUDE-SETUP.md`](../../OBSIDIAN-CLAUDE-SETUP.md) en la raíz del repo — documenta cómo replicar el segundo cerebro en proyectos nuevos (arquitectura + instalación paso a paso + checklist + gotchas + tiempo estimado).

**Roadmap post-prod**: [[roadmap]] — 11 gaps priorizados del audit 2026-04-21 (4 quick-wins + 4 esfuerzo medio + 3 nice-to-have). Cada ítem tiene agente sugerido + dependencias + criterio de completitud.

> [!success] Milestone 2026-04-19 — Estado producción 100/100
> **Proyecto declarado completo y production-ready.**
> - Build limpio en 2m22s, 68/68 tests en 1.07s, typecheck en 11.8s
> - 19 fases completadas + 5 audits de seguridad cerrados
> - PWA manifest + metadata global + health endpoint + README pro
> - Segundo cerebro Obsidian operativo en `memory/` (7 notas densas)
> - Último commit: `0f96905 merge(fase-19): polish final — badge consistency, animations, dark mode, loading states`

> [!info] Milestone 2026-04-20 — Segundo cerebro auto-actualizable
> **Memoria del proyecto ahora se actualiza sola.**
> - `.git/hooks/post-commit` captura cada commit en `memory/.pending-notes`
> - `/session-end` (actualizado) lee el buffer, procesa, commitea memory/, borra el buffer
> - Regla de merge obligatoria: después de cada merge a `main` → ejecutar `/session-end` (documentado en [[agents-workflow#Protocolo de cierre de fase]])
> - Convive con hook global de seguridad vía `core.hooksPath` local + copia del pre-commit (gotcha 36)
> - Verificado con 3 commits reales capturados automáticamente

> [!success] Milestone 2026-04-21 — Infraestructura de producción configurada
> **Deploy path listo, pendiente ejecutar el deploy.**
> - **VPS**: Vultr `devlmer-vps` · `64.176.21.229` · Ubuntu 24.04 · 2 vCPU · 4 GB · Santiago (`scl`) · ID `2bac3fef-5183-4359-90f5-9debedf6403c`
> - **DNS**: `dy-pos.zgamersa.com` → `64.176.21.229` (record A, proxied, Cloudflare)
> - **Zone**: `zgamersa.com` activa en Cloudflare Free (ID `aeaf91c17b83780d5b7120d7df6b170a`)
> - **MCPs registrados** (scope local `system_pos`): `vultr-mcp-server` (17 tools) + `cloudflare-mcp-server` (12 tools) + 21 globales pre-existentes
> - `.env.docker`: `NEXTAUTH_URL=https://dy-pos.zgamersa.com` ✅ · `NEXTAUTH_SECRET=` ⚠️ pendiente de generar con `openssl rand -base64 32`
> - **Bloqueantes pre-deploy**: generar NEXTAUTH_SECRET · verificar SSL mode Cloudflare = Full (strict) · instalar Docker en VPS
> - **Script de deploy listo**: `deploy.sh` en raíz (commit `be71aa5`) — 6 fases con rollback automático. Uso: `./deploy.sh` desde local tras setear NEXTAUTH_SECRET en `.env.docker`

> [!success] Milestone 2026-04-21 — Reorganización raíz + fixes VPS/SSL/CORS
> **Limpieza completa del repo y producción 100% estable.**
> - **Repo reorganizado** (commit `85ebcf2`): `deploy.sh`/`dev.sh` → `scripts/`, `design-preview.html` → `docs/design/`, `OBSIDIAN-CLAUDE-SETUP.md` → `docs/setup/`, `screenshots-v2/` → `docs/design/screenshots/`
> - **1.7 GB liberados**: `zip/` (PHP legacy) + `screenshots/` v1 eliminados del working tree (ya eran gitignored)
> - **Deploy path actualizado**: `./scripts/deploy.sh` (CLAUDE.md y rsync excludes actualizados)
> - **Raíz ≤13 entradas visibles** — monorepo limpio
> - **VPS fixes aplicados**:
>   - Login producción reparado (rebuild Docker con JWT-based `actions.ts` correcto — stale build era la causa)
>   - `systemqr.zgamersa.com`: SSL 526 → Let's Encrypt instalado (válido 2026-07-20, auto-renueva)
>   - `apiqr.zgamersa.com`: SSL 526 → Let's Encrypt instalado (válido 2026-07-20, auto-renueva) + CORS headers añadidos en nginx con `proxy_hide_header` para evitar duplicados
>   - Todos los subdominios del VPS ahora tienen Let's Encrypt (aprobi, dy-pos, expenseflow, systemqr, apiqr)
> - **Cloudflare**: acceso MCP confirmado (account `fa2fd1592fea9c324d39fe5d765d9cd5`)

> [!success] Milestone 2026-04-21 22:21 UTC-3 — **PROYECTO EN PRODUCCIÓN** 🚀
> **Deploy real ejecutado y verificado.**
> - Container `pos-web` arriba en VPS Vultr (`64.176.21.229:3000`)
> - `/api/health` responde `{"status":"ok","database":"connected","version":"2.0.0"}`
> - URL pública: **https://dy-pos.zgamersa.com** (HTTPS, Cloudflare Full strict)
> - 3 intentos de deploy necesarios — fixes descubiertos en vivo:
>   1. **ssh consume stdin** de bash scripts interactivos → fix `-n` (gotcha 79)
>   2. **rsync sin .gitignore filter** transfirió 73k archivos / 2.9 GB incluyendo `zip/` legacy y `ssh.md` con creds → fix `--filter=':- .gitignore'` + excludes (gotcha 80)
>   3. **`__Secure-` cookies en HTTP local** rompían login en dev → fix cookie name dinámico por scheme (gotcha 81)
> - Tras los 3 fixes: rsync 235 archivos / 1.1 MB → docker build exitoso → health check pasa en 1 reintento (502 → 200 en ~10s)
> - Pendiente: validación funcional de login en browser incógnito

---

## Estructura del monorepo

```
system_pos/
├── apps/
│   └── web/                        ← Next.js 15 App Router (puerto 3000)
│       ├── app/(dashboard)/        ← Rutas protegidas post-login
│       │   ├── categorias/         ← CRUD ✅ Fase 3
│       │   ├── productos/          ← CRUD ✅ Fase 3
│       │   ├── clientes/           ← CRUD ✅ Fase 3
│       │   ├── usuarios/           ← CRUD ✅ Fase 3
│       │   ├── ventas/             ← Módulo Ventas ✅ Fase 4
│       │   │   ├── nueva/
│       │   │   └── [id]/ (editar + detalle)
│       │   └── caja/               ← POS Caja ✅ Fase 5
│       ├── app/login/              ← Ruta pública ✅ Fase 2
│       ├── app/api/auth/           ← NextAuth handlers ✅ Fase 2
│       ├── components/ui/          ← shadcn/ui (new-york)
│       ├── components/             ← Sidebar, Header, DataTable, ConfirmDialog,
│       │                              VentaCarrito
│       ├── lib/utils.ts            ← cn, formatCLP, calcularIVA, validarRUT, formatRUT
│       ├── auth.ts                 ← NextAuth (Node, usa Prisma)
│       ├── auth.config.ts          ← NextAuth config (edge-safe)
│       ├── auth-types.d.ts         ← Tipos (NO next-auth.d.ts)
│       └── middleware.ts           ← usa auth.config.ts
├── packages/
│   ├── db/                         ← @repo/db — Prisma client + schema
│   │   ├── prisma/schema.prisma    ← 6 modelos POS + 3 NextAuth
│   │   ├── prisma/seed.ts          ← admin@pos-chile.cl / admin123
│   │   └── src/client.ts + index.ts
│   ├── ui/                         ← @repo/ui — componentes compartidos
│   └── typescript-config/          ← tsconfig base/nextjs/react-library
├── scripts/                        ← ← NUEVO (commit 85ebcf2)
│   ├── deploy.sh                   ← Deploy al VPS — ejecutar como ./scripts/deploy.sh
│   └── dev.sh                      ← Wrapper dev local
├── docs/                           ← ← NUEVO (commit 85ebcf2)
│   ├── design/
│   │   ├── preview.html            ← Prototipo UI histórico
│   │   └── screenshots/            ← UX audit capturas (ex screenshots-v2/)
│   └── setup/
│       └── obsidian-claude.md      ← Guía segundo cerebro (ex OBSIDIAN-CLAUDE-SETUP.md)
├── docker-compose.yml              ← postgres:16-alpine + pgadmin (sin version:)
├── turbo.json                      ← usa "tasks" (NO "pipeline")
├── pnpm-workspace.yaml
├── .env.docker / .env.example  (NO hay .env.local en raíz — va en apps/web/)
├── memory/                         ← Memoria del proyecto (este archivo)
└── CLAUDE.md                       ← Reglas del proyecto (actualizado)
```

---

## Base de datos PostgreSQL

**Container:** pos-postgres (healthy)  
**Puerto:** localhost:5432  
**BD:** pos_chile_db | **User:** pos_admin | **Pass:** pos_secret_2025  
**pgAdmin:** http://localhost:5050

### Tablas (9 total)

| Tabla | Cols | Notas |
|-------|------|-------|
| usuarios | 8 | enum Rol: ADMIN/CAJERO/VENDEDOR |
| categorias | 6 | — |
| productos | 11 | precio Int (CLP), stock Int, **ventas Int** (contador acumulado) |
| clientes | 10 | rut String, **compras Int**, **ultimaCompra DateTime?** |
| ventas | 11 | enum MetodoPago, clienteId nullable, numeroBoleta único |
| detalle_ventas | 6 | normalizado (ventaId, productoId, cantidad, precioUnitario, subtotal) |
| accounts | 12 | NextAuth |
| sessions | 4 | NextAuth |
| verification_tokens | 3 | NextAuth |

**Campos añadidos en Fase 4** (db:push aditivo, data preservada):
- `Producto.ventas Int @default(0)` — contador acumulado de unidades vendidas
- `Cliente.compras Int @default(0)` — contador de ventas del cliente
- `Cliente.ultimaCompra DateTime? @map("ultima_compra")` — fecha última compra

### Usuario seed
- email: admin@pos-chile.cl | password: admin123 | rol: ADMIN
- email: cajero@pos-chile.cl | password: cajero123 | rol: CAJERO (creado en pruebas Fase 3)

---

## Lógica de negocio crítica

### Al crear una venta (`crearVenta` en ventas/actions.ts):
```
$transaction:
  Por cada producto: stock -= cantidad, ventas += cantidad
  Si hay cliente: compras += 1, ultimaCompra = fecha venta
  Validar stock >= cantidad ANTES de transacción (error claro si no)
  Número boleta: nanoid formato B-YYYYMMDD-XXXXXXXX
```

### Al eliminar una venta (`eliminarVenta`):
```
$transaction:
  Por cada DetalleVenta: stock += cantidad, ventas -= cantidad
  Si había cliente:
    compras -= 1
    ultimaCompra = MAX(fecha) de ventas restantes del cliente
    (Si no hay más ventas → ultimaCompra = null)
    NO asumir fecha anterior — recalcular desde historial completo
```

### Al editar una venta (`editarVenta`):
```
$transaction:
  Revertir efectos de venta vieja (como eliminar)
  Aplicar efectos de venta nueva (como crear)
  Stock efectivo = stock actual + devolución vieja
```

### Chile-específico:
- IVA fijo 19% | CLP como `Int` | RUT "12.345.678-9"
- `formatCLP()`, `calcularIVA()`, `validarRUT()`, `formatRUT()` en `lib/utils.ts`

---

## Dependencias clave instaladas

| Paquete | Versión | Dónde |
|---------|---------|-------|
| next | ^15.3.0 | apps/web |
| next-auth | 5.0.0-beta.31 | apps/web |
| @auth/prisma-adapter | 2.11.2 | apps/web |
| bcryptjs | 3.0.3 | apps/web |
| @prisma/client | ^6.6.0 (→6.19.3) | apps/web + packages/db |
| prisma | ^6.6.0 | packages/db |
| dotenv-cli | ^8.0.0 | packages/db |
| tailwindcss | ^4.2.0 | apps/web |
| tw-animate-css | ^1.0.0 | apps/web |
| shadcn/ui (new-york) | configurado | apps/web |
| lucide-react | latest | apps/web |
| @tanstack/react-table | latest | apps/web |
| react-hook-form | latest | apps/web |
| @hookform/resolvers | latest | apps/web |
| zod | latest | apps/web |
| date-fns | latest | apps/web |
| nanoid | latest | apps/web |
| turbo | ^2.5.0 | root |

---

## Historial de commits

| Hash | Descripción |
|------|-------------|
| 24167c9 | perf(ux): elimina jank tab refocus (`backdrop-blur` removido de surfaces always-on) + cachea perfil header con `unstable_cache` 5min + revalidateTag(`usuario:{id}`) en 4 callsites |
| 1ae8226 | fix(dashboard): React #418 hydration (timeZone es-CL) + Recharts width(-1) en sparkline |
| d823990 | fix(deploy): aplicar `prisma migrate deploy` en cada deploy via container ad-hoc (incidente schema desync, gotcha 96) |
| 5c469c0 | chore(gitignore): excluir `.claude/launch.json` + `.claude/scheduled_tasks.lock` runtime |
| 4ac93ac | chore(sentry): filtrar `Error: aborted` (Node http abortIncoming, ruido browser/Cloudflare cancel) |
| 6b1db35 | feat(caja): admin `/cajas` CRUD + auditoría `/caja/movimientos` + `lib/nav-active.ts` (longest-prefix) — completa F-9 admin |
| 0d9c417 | fix(privacy): scrub PII en console.error pre-Sentry (gotcha 100) — 3 callsites login + comentario en error.tsx por gotcha 90 |
| 9d31048 | chore(actions): bump actions/checkout 4.2.2 → 6.0.2 (Dependabot PR #3) |
| a6feb73 | chore(mobile): R2 custom domain `apk-dy-pos.zgamersa.com` reemplaza `pub-*.r2.dev` (rate-limited) |
| b01fe99 | fix(auth): redirect a `/login` sin `callbackUrl` — URL limpia + cierra vector open-redirect |
| 4dbdd63 | fix(mobile): `apps/mobile/.npmrc` con hoisted linker + remueve `@shopify/react-native-skia` directo (transitivo de victory-native) |
| 7652fc6 | feat(mobile): Fase 5 build infra — `expo prebuild --platform android` committeado + gradle signing + `mobile-build-apk.sh` |
| d53d60e | feat(mobile): Fase 3 publish script — R2 upload (aws CLI S3) + manifest POST + verify GET |
| 436691b | feat(mobile): Fase 2 update checker — `MobileRelease` schema + `/api/mobile/manifest` + `useUpdateCheck` + `UpdateBanner` |
| 904c645 | chore(mobile): Fase 1 release infra — keystore generator + runbook + gitignore defense-in-depth |
| 003c8de | feat(privacy): MLV A.2 + A.3 — pseudonymize helper + página `/privacidad` pública |
| 7d118be | fix(qa): 6 hallazgos adversariales — **C5** bloqueo edición venta con devoluciones (UI + guard server + action) · **C4** precio mínimo $1 (era nonnegative) · **C7** helper text motivo devolución < 5 chars · **A3** `/devoluciones/[id]` 404 limpio |
| 85ebcf2 | chore(repo): reorganize root — `scripts/`, `docs/`, elimina `zip/` (1.7GB) + `screenshots/` (gitignored, ahora fuera de disco) |
| c06f9f9 | chore(design): mockup HTML `design-preview.html` (1668 líneas) — movido luego a `docs/design/preview.html` |
| 7a89ea8 | feat(tooling): `dev.sh` para control del entorno local (start/stop/status/logs) — movido luego a `scripts/dev.sh` |
| 70a084f | fix(deploy): `ssh -n` (stdin stealing) + rsync `--filter=':- .gitignore'` + excludes completos — primer deploy exitoso a prod |
| 6334025 | fix(auth): cookie name + trustHost alineados para dev HTTP local (USE_SECURE_COOKIES basado en NEXTAUTH_URL scheme) |
| e664915 | feat(ui): adopt SystemQR palette — naranja primario + ámbar + emerald + serif Instrument Serif + sidebar colapsable con localStorage |
| 947cfc0 | feat(auth): login manual con JWT (bypass `signIn()` por bug MissingCSRF v5 beta.31) + `AUTH_TRUST_HOST=1` env + Prisma singleton en todos los entornos |
| ef9ef79 | fix(auth): `trustHost: true` en `auth.ts` para NextAuth v5 detrás de proxy Cloudflare/Nginx — sin esto el login rompe en prod |
| cdb2b24 | fix(docker): `POS_DATABASE_URL` dummy en build stage — Prisma requiere la var para generar el cliente, no para conectarse |
| be71aa5 | feat(deploy): `deploy.sh` con rollback automático — rsync + scp `.env.docker` + backup VPS + health check + rollback |
| c9c662b | chore(security): gitignore `ssh.md`, `token.md`, `*.key`, `*.pem` (cierra brecha del pre-commit hook global) |
| e9f985b | feat(mobile): navegación responsive (drawer con `createPortal`) + fix overflow horizontal con `min-w-0` en flex items |
| 5cb5feb | fix(security): `audit:check` script + MODERATE uuid CVE aceptado (GAP-04) |
| 49a91a2 | fix(infra): healthcheck usa `127.0.0.1` — alpine resuelve `localhost` a IPv6, Next.js standalone escucha IPv4 (GAP-02 final) |
| c0f4687 | fix(infra): healthcheck `pos-web` en compose con `wget -q` (GAP-02 inicial) |
| 3f3b162 | fix(infra): `SENTRY_DSN` propagado via compose env vars al container (GAP-01) |
| 3fdefe9 | fix(caja): diseño boleta impresa — contraste max + tabular-nums + adaptación papel 58/80mm/A4 + HTML escape anti-XSS |
| 2fa2477 | fix(caja): reemplazar `window.print()` por nueva ventana autónoma — `@media print` frágil con Radix portal + framer-motion |
| 7d118be | fix(qa): corregir 6 hallazgos adversariales |
| 53c99e6 | fix(auth): **A6** login cajero crash (NEXT_REDIRECT propagation + unexpected error handling) + **C1** rate limit fallback en memoria cuando no hay Upstash |
| f766003 | chore(docker): parametrizar pgAdmin SMTP con env vars (Gmail App Password → .env.docker gitignored) |
| 4a97a7a | fix(ux): QA report — manifest 404 (rewrite + matcher) + date inputs remount/width/color-scheme + dark mode html bg + color-scheme |
| 5aa2e95 | chore(lint): migrate de `next lint` deprecado → ESLint flat config (`eslint.config.mjs` + FlatCompat) |
| 80df790 | chore(memory): gotchas 43-45 post-polish dashboard |
| 94f5104 | feat(dashboard): polish visual — stagger animations + fix cursor black bug (hsl/oklch fallout) |
| f8df449 | fix(ux): resolve hydration id mismatch (Radix useId bajo motion) + recharts SSR width(-1) warning |
| e005238 | fix(ux): boleta impresa completa (print CSS) + chart-colors por tema + FK P2003 friendly + modal persiste en error |
| afc8439 | docs: guía completa Obsidian + Claude segundo cerebro (replicable) → `OBSIDIAN-CLAUDE-SETUP.md` raíz |
| b138471 | chore(claude): documentar hook post-commit en Segundo Cerebro |
| 48f640f | chore(memory): protocolo cierre de fase con /session-end obligatorio |
| 77ef5a7 | chore(claude): /session-end procesa memory/.pending-notes del hook |
| 4e22798 | chore(memory): gitignore pending-notes del hook post-commit |
| b6e34f5 | chore(claude): auto-load memory/ al inicio de cada sesión |
| e879e6c | chore: remove datatables.net ghost dir + gitignore |
| 0f96905 | merge(fase-19): polish final — badge consistency, animations, dark mode, loading states |
| 02cb8a6 | polish(fase-19): badge consistency, animations, dark mode, loading states |
| 5ad3bef | chore(memory): session notes 2026-04-19 — fases 15-19 completadas |
| 7e7444c | docs(fase-19): comentarios arquitecturales + 11 tests edge case + cleanup |
| 5234212 | feat(prod): Fase 18 — PWA manifest, metadata global, health script, README |
| 2d0305a | merge(fase-17): pages premium — login, 404/error, empty states, reportes, alertas urgency |
| 50d047d | feat(fase-17): pages premium — login + error/404 + empty states + reportes + alertas urgency |
| 49c1625 | merge(fase-16): POS Caja premium — split 60/40, category pills, AnimatePresence, inline flow, shortcuts |
| cb44e3e | feat(caja-premium): rediseño POS Caja con flujo inline, category pills, AnimatePresence, shortcuts (Fase 16) |
| 7f9e7ed | merge(fase-15): UX Premium — sidebar premium, KPIs sparkline+counter+trend, skeletons, inputs RUT/CLP, empty states |
| 4c158df | feat(ux-premium): sidebar rediseñado, KPIs con sparkline+trend+counter, skeletons, inputs RUT/CLP (Fase 15) |
| dac94cc | chore(claude): agregar comando /session-end para cierre de sesión |
| 64fab2e | chore(memory): inicializar segundo cerebro — 7 notas con contexto real del proyecto |
| 81933a5 | fix(auth): RBAC funcional en middleware edge — session callback compartido (ver [[auth-patterns#Pattern 2]]) |
| 2b90ed8 | feat(security): security headers + Sentry instrumentation (GAP-1, GAP-2 OWASP) |
| 3bec5f5 | feat(security): checkEnv hardening + warnIfDisabledInProd (GAP-PROD-1/2) |
| 2d4f8ce | feat(ux): chart gradients + table hover + soft badges + icon-button tooltips (Gemini UX audit) |
| 7d36161 | fix(security): content-length avatar + FOR UPDATE devoluciones + formatCLP normalize (Gemini G1-G3) |
| fa0828b | test(utils): tests para calcularDesglose + verificación suite completa (47 tests) |
| 64fa064 | merge(fase-13): dark mode + transiciones de página + micro-animaciones |
| 30a2065 | feat(ux-pro): dark mode + transiciones de página + micro-animaciones (Fase 13) |
| 25c6aa7 | merge(fase-12): sistema de devoluciones parciales y totales con reversión de stock |
| a4830e3 | feat(devoluciones): sistema de devoluciones parciales y totales (Fase 12) |
| 4b051e3 | merge(fase-11): descuentos por porcentaje y monto fijo en ventas y caja |
| 33ae07e | feat(descuentos): descuentos % y monto fijo en ventas y caja (Fase 11) |
| a22d15b | merge(fase-10): alertas de stock bajo — panel, badge sidebar, banner dashboard |
| c691b0c | feat(alertas): sistema de alertas de stock bajo con badge, panel y banner (Fase 10) |
| 825d3e3 | merge(fase-9): Perfil de usuario — avatar, seguridad, actividad reciente |
| 4837a84 | feat(perfil): perfil de usuario con avatar, datos, password strength y actividad (Fase 9) |
| a3296ec | fix(docs): reemplazar swagger-ui-react por @scalar (React 19 nativo, sin peer dep warnings) |
| 80543c6 | feat(infra): rate limiting Upstash + Swagger UI + health endpoint (Fase 14) |
| 3f5003b | chore: eliminar archivos PHP/DEE obsoletos, limpiar config |
| 04d32f7 | fix(security): migrar xlsx → exceljs (fix M3 CVEs Prototype Pollution) |
| 75b7891 | docs: marcar Fase 8 como completada en CLAUDE.md |
| acdcbce | feat(api-v1): API REST + security fixes + vitest + Docker deploy (Fase 8) |
| fe9fcac | merge(fase-4): Módulo Ventas con lógica transaccional de stock |
| 60d5dd9 | feat(ventas): módulo completo crear/editar/eliminar + lógica stock (Fase 4) |
| 21682b0 | merge(fase-3): CRUD Categorías, Productos, Clientes, Usuarios |
| 23faa99 | feat(crud): Categorías, Productos, Clientes, Usuarios — TanStack + shadcn (Fase 3) |
| d25add8 | fix(auth): env vars + Prisma resolution + login action (E2E verified) |
| 063edfb | feat(auth): NextAuth v5 + roles + layout + sidebar (Fase 2) |
| 6e93c56 | fix: dotenv-cli + docker-compose + limpieza containers PHP |
| 253f2c4 | feat: monorepo scaffold — Next.js 15 + Prisma + Tailwind v4 (Fase 1) |

---

## Gotchas / Fixes no-triviales (NO repetir)

1. **pnpm.onlyBuiltDependencies** en root package.json — Prisma no genera en pnpm 10 sin esto
2. **dotenv -e .env -o** en db scripts — `-o` es obligatorio (Pierre tiene DATABASE_URL de Supabase en shell)
3. **POS_DATABASE_URL** (no DATABASE_URL) en PrismaClient — mismo motivo
4. **auth-types.d.ts** (no next-auth.d.ts) — evita shadow del paquete
5. **JWT cast explícito**: `token.rol as Session["user"]["rol"]` — bug v5 beta
6. **declaration: false** en nextjs.json — `declaration: true` rompe con TS2742
7. **app/page.tsx** NO debe existir junto a `app/(dashboard)/page.tsx`
8. **handlers export** NextAuth v5: `const { GET, POST } = handlers`
9. **seed en prisma/seed.ts** (no src/seed.ts) — convención Prisma
10. **rm -r** (no rm -rf) en Claude Code CLI — protección hardcoded
11. **apps/web/.env.local** debe estar en `apps/web/` (no raíz del monorepo)
12. **@prisma/client** como dep directa en apps/web — Turbopack strict isolation
13. **serverExternalPackages: ["@prisma/client"]** en next.config.ts
14. **login action v5**: `redirect: false` + `redirect("/")` manual
15. **client.ts POS_DATABASE_URL obligatoria** — ya no hay fallback hardcodeado (resuelto Fase 8)
16. **Turbo v2**: usar `"tasks"` no `"pipeline"` en turbo.json
17. **Tailwind v4**: sin `tailwind.config.js`, usa `@import "tailwindcss"` + `@theme inline`
18. **@tailwindcss/oxide** en `onlyBuiltDependencies` — binario nativo necesario en pnpm 10 + Tailwind v4
19. **sharp** en `serverExternalPackages` — necesario para procesamiento de imágenes en Node runtime
20. **Avatar base64 data URL en DB** — no requiere volumen Docker ni filesystem externo; sharp → 200×200 JPEG
21. **Node 20 File duck-typing** — `typeof (raw as Blob).arrayBuffer === "function"` (no `instanceof File`)
22. **Framer Motion instalado** en apps/web (^11.x) — disponible para todas las fases siguientes
23. **Sonner instalado** en apps/web — `<Toaster />` ya montado en root layout
24. **Prisma db:push requerido después de schema change** — tras merge de worktree con cambios en schema.prisma
25. **next-themes**: envolver en ThemeProvider con `attribute="class"` + `suppressHydrationWarning` en `<html>`
26. **template.tsx (NO layout.tsx)** para transiciones de página Framer Motion — template se remonta en cada ruta
27. **formatCLP normalize** — `.replace(/[\u202f\u00a0]/g, " ")` obligatorio para evitar hydration mismatch Node 20+ vs browser
28. **SELECT ... FOR UPDATE NOWAIT** en $transaction devoluciones — primera operación, bloqueo pesimista para concurrencia
29. **Content-Length check** en rutas de upload (avatar) — pre-filtro ANTES de await request.formData(); el check real es `file.size` después
30. **`/api/v1` excluido del middleware NextAuth** — usa helper propio (`requireAuth` en `app/api/v1/_helpers.ts`) + rate-limit Upstash. Desde commit `2edf51a` el helper acepta **Bearer token** (mobile M2) como primera opción, con fallback a cookie session (web SSR). Backwards compatible: callers viejos sin `request` param siguen funcionando. El tipo del parámetro es `Request` (Web API base), no `NextRequest` — ver Pattern 9 en [[auth-patterns]]
31. **`Permissions-Policy: usb=()`** deshabilita WebUSB intencionalmente — si se agregan lectores de barras/impresoras fiscales, cambiar a `usb=(self)` y revisar CSP
32. **`.claude/commands/` ignorado pero `session-end.md` se commitea con `git add -f`** — es un comando del proyecto aunque el dir esté gitignored
33. **Worktrees stale no se auto-limpian al mergear branch** — requiere `git worktree remove` explícito. Nunca `rm -rf` sobre `.worktrees/` porque deja refs zombie en `.git/worktrees/`
34. **`validarRUT` acepta `"0-0"` como válido** — matemáticamente pasa módulo 11 (cuerpo "0", suma 0, DV esperado 0). No es RUT real pero el comportamiento queda congelado por test. Si se quiere rechazar, añadir length mínima > 1 del cuerpo
35. **`Intl.NumberFormat es-CL` en Node 22+ emite U+202F** — la Fase 19 añadió regression guards explícitos en `utils.test.ts::formatCLP — hydration safety` (fallan si alguien refactoriza el `.replace`)
36. **`core.hooksPath` global rompe hooks per-repo** — el usuario tiene `~/.config/git/hooks/pre-commit` global (bloqueo de secretos) vía `core.hooksPath`. Esto hace que `.git/hooks/*` locales NO se ejecuten. Fix: `git config --local core.hooksPath .git/hooks` + **copiar el pre-commit global a `.git/hooks/pre-commit`** (si no, se pierde la protección anti-secretos en este repo). Ver [[agents-workflow#Cómo funciona el hook post-commit]]
37. **`memory/.pending-notes` es buffer entre commits y `/session-end`** — el hook post-commit escribe ahí cada commit; `/session-end` lo procesa y borra. Si nunca se ejecuta `/session-end`, acumula indefinidamente — no se pierde nada pero la memoria queda desactualizada
38. **`pnpm dev` puede salir con exit 0 y dejar zombie Node en puerto 3000** — el siguiente `pnpm dev` auto-bumpea a 3001 (Next.js detecta puerto ocupado). Fix: `lsof -i :3000` → `kill <PID>`. Causa común: señal externa (SIGTERM) que el proceso captura como clean-exit sin liberar el socket
39. ~~**Print CSS para Radix portal + DialogContent + motion transforms**~~ → **SUPERSEDED por gotcha 58.** El approach `@media print` (commit `e005238`) demostró ser frágil — abandonado en commit `2fa2477`. Historial preservado por trazabilidad
40. **ConfirmDialog onConfirm retorna `false` → modal queda abierto** — pattern adoptado en `confirm-dialog.tsx` para mostrar error inline + toast sonner sin cerrar. Aplicado en 5 tables (categorias, clientes, productos, usuarios, ventas). Pattern: `onConfirm: () => Promise<boolean | void>` — `false` preserva modal, `true`/`void` cierra
41. **Prisma `P2003` (FK violation) con mensaje amigable** — catch en `ventas/actions.ts` + pre-check de devoluciones antes de intentar delete. UX: en vez de error técnico, dice "Esta venta tiene devoluciones asociadas, elimínalas primero"
42. **Chart colors por tema** — `--chart-1..5` en `globals.css` tienen luminancia diferente para light/dark mode. Evita gradient de `--primary` (casi negro en light) en `VentasChart`/`Sparkline`; usa `--chart-1` (azul) por defecto
43. **`framer-motion` descuadra `useId` de Radix entre SSR y CSR** — `HeaderActions` (motion.div) envolvía `<DropdownMenu>` del `UserMenu`, el contador auto-generado por Radix divergía entre server y client → React emitía warning "tree hydrated but some attributes…" en cada navegación. Fix: pasar `id` estable manualmente al `DropdownMenuTrigger` (`id="user-menu-trigger"`). Regla general: cuando un tree con `useId`-dependiente vive dentro de un wrapper con transforms/animaciones client-only, pasar `id` estable o diferir el mount
44. **Recharts `width(-1) height(-1)` en SSR** — `ResponsiveContainer` mide el padre en el primer render; durante SSR el padre aún no tiene dimensiones → warning en consola. Fix (en `VentasChart`): `const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), [])` + gate `{mounted ? <ResponsiveContainer> … : null}`, más `minWidth={0} minHeight={0}` explícitos. Pattern replicable para cualquier chart Recharts
45. **`hsl(var(--token) / N)` FALLA si el token es `oklch(...)`** — Tailwind v4 + shadcn new-york usa `oklch` para las CSS vars, pero shadcn template original (pre-v4) envolvía en `hsl(var(--muted) / 0.3)`. Resultado: CSS inválido → browser hace fallback a **negro**. Síntoma visto: barra de chart "Sáb 18" fully black + tooltip cursor overlay negro. Fix en `ventas-chart.tsx`: `cursor={{ fill: "color-mix(in oklab, var(--chart-1) 10%, transparent)" }}`. Auditar: ningún `hsl(var(--…) / …)` debe quedar si el var es oklch. Usar `color-mix` o rgba directo
46. **`next lint` deprecated en Next 15.5** — pide setup interactivo en 15.3 sin config previa. Migrar a `eslint .` con **flat config** (`eslint.config.mjs` usando `FlatCompat` para cargar `next/core-web-vitals` + `next/typescript`). Deps: `eslint@^9`, `eslint-config-next@^15.3`, `@eslint/eslintrc`. Ignorar `.next/`, `node_modules/`, `public/`, `*.d.ts`. Relajar `no-explicit-any` a warn (interop Recharts/framer-motion) y `no-unused-vars` con prefix `_`
47. **`/manifest.json` 404 por PWA installers legacy** — Next 15 emite PWA manifest en `/manifest.webmanifest` (desde `app/manifest.ts`), pero browsers, Lighthouse y extensions piden `/manifest.json` por convención previa. Fix: `async rewrites()` en `next.config.ts` con `{ source: "/manifest.json", destination: "/manifest.webmanifest" }` + excluir `manifest.json` del matcher del middleware (antes era interceptado y redirigido a `/login`)
48. **`<input type="date">` no se re-sincroniza con props tras `router.push`** — el valor visual queda congelado aunque el prop cambie. Fix: `key={\`desde-${desde}\`}` fuerza remount del input cuando los props cambian. Más barato y robusto que un `useEffect` que actualice ref. Aplicado en `ventas/rango-fechas.tsx` y `reportes/reportes-workspace.tsx`
49. **`<input type="date">` con `w-auto` colapsa el widget nativo en Chromium** — el date picker queda visualmente oculto aunque haya valor. Fix: width fijo (ej. 160px). Aplica en cualquier filtro de fecha visible en header/sidebar
50. **Native widgets (date picker, scrollbars, selects) no respetan dark mode sin `color-scheme`** — `next-themes` setea `<html class="dark">` pero CSS `color-scheme` no se hereda automático. Fix: `color-scheme: light` en `:root`, `color-scheme: dark` en `.dark`. Opcional por-input: `className="[color-scheme:light] dark:[color-scheme:dark]"` para consistencia garantizada
51. **Flash blanco al togglear dark mode** — si solo pintas `background-color` en `body`, el viewport completo (bordes, overscroll) queda blanco en transición. Fix: agregar `background-color: var(--background)` también en `html`. `next-themes` alterna la clase antes de que el CSS repinte, así que el flash es puramente visual
52. **NextAuth v5 catch: propagar `NEXT_REDIRECT` ANTES que `instanceof AuthError`** — el mecanismo `redirect()` de Next.js 15 se lanza como objeto con `digest?.startsWith("NEXT_REDIRECT")` que a veces el `instanceof AuthError` captura por error (beta 31). Fix canónico en `login/actions.ts`: check `digest` primero y re-throw; luego `AuthError`; luego fallback `Sentry.captureException` + mensaje amigable sin re-throw → el cliente **nunca** recibe response malformada. Esto resolvió el crash A6 del QA de cajero
53. **Rate limit fallback en memoria (sin Upstash)** — pattern: `Map<key, {count, resetAt}>` con window 15 min + max 5 + prune anti-leak si `size > 5000`. Implementado en `lib/rate-limit.ts::checkMemoryRateLimit`. Useful para dev y prod sin Redis — no persiste entre restarts pero es protección real (antes solo se emitía `console.warn` y se seguía sin bloqueo). Pattern: intentar Upstash primero, cae a memoria si `!UPSTASH_REDIS_REST_URL`
54. **Gmail App Password NO detectable por el pre-commit hook** — el regex global del usuario (`~/.config/git/hooks/pre-commit`) cubre `ghp_`, `AKIA`, `AIza`, `sk-ant-`, `xox*` pero **no** Gmail App Passwords (formato `xxxx xxxx xxxx xxxx`). Gotcha descubierto commiteando docker-compose — se mitigó moviendo el secreto a `.env.docker`. Si vas a ampliar el regex del hook global: `[a-z]{4}\s[a-z]{4}\s[a-z]{4}\s[a-z]{4}` captura este formato
55. **pgAdmin `PGADMIN_CONFIG_*` se evalúa como Python literal** — por eso strings necesitan comillas internas: `PGADMIN_CONFIG_MAIL_SERVER: "'smtp.gmail.com'"`. Al mover a `.env.docker`, preservar wrapping: `PGADMIN_MAIL_PASSWORD="'valor'"` (comillas dobles externas para que Compose strip solo esas, comillas simples internas quedan en el valor) + en YAML usar fallback `"${VAR:-''}"` para evitar CSS inválido al resolver
56. **`dotenv` del sistema ≠ `dotenv-cli` de Node** — si tienes `python-dotenv` instalado globalmente (PATH), llamar `dotenv -e X -o -- comando` falla con `No such option: -o`. Los scripts del proyecto en `packages/db/package.json` corren el `dotenv-cli` local via `pnpm --filter @repo/db db:seed` (pnpm resuelve el binario en `node_modules/.bin`). No intentar correr el seed directo desde root con `dotenv` del sistema
57. **Archivos editados pueden ser revertidos silenciosamente durante la sesión** — observado en `login/actions.ts` y `rate-limit.ts`: edit → typecheck ok → build falla → archivos aparecen al estado pre-edit. Causa probable: linter/autoformat externo, o algún tool de dev server (Turbopack watch) que tiene una copia en memoria y sobreescribe disco al detectar "cambio externo". **Protocolo defensivo**: después de editar, hacer `git diff <archivo>` para confirmar disco antes del siguiente paso. Si se revirtió, re-aplicar. Considerar apagar dev servers antes de builds/edits críticos
58. **Imprimir boleta: `window.open()` autónoma, NO `@media print`** — el enfoque tradicional (CSS `@media print` sobre el componente React) es **frágil con Radix Dialog portal + framer-motion inline transforms**: los ancestros del portal tienen `overflow: hidden` + `transform: translate3d(...)` que `@media print` no siempre logra liberar. Pattern canónico (commit `2fa2477`): abrir `window.open("", "_blank", "width=...")` y escribir con `document.write()` HTML+CSS **autónomo** (sin Tailwind, sin React, CSS inline), luego `w.print()` + `w.close()`. Garantiza output uniforme cross-browser + independiente del árbol DOM actual
59. **`document.write()` en boletas requiere HTML-escape explícito** — React auto-escapa en JSX, pero la ventana autónoma de impresión usa `document.write()` con string concatenation de datos del DB (numeroBoleta, cliente.nombre, cliente.rut, items). **Vector XSS real** si un nombre de cliente contiene `<script>`. Fix: función `esc(s)` que mapea `& < > " '` a entidades HTML, aplicada a TODO string derivado de datos. Ver `caja/boleta-modal.tsx::handlePrint`
60. **Impresoras B&W / tinta clara requieren `print-color-adjust: exact`** — por defecto los browsers "optimizan" colores suaves al imprimir (descartan grises y reducen contraste). En boletas esto hace que `#555`/`#333` salgan ilegibles. Combo canónico: `print-color-adjust: exact` + `-webkit-print-color-adjust: exact` + `color: #000` puro en TODO + `font-weight: 500` como base + `font-variant-numeric: tabular-nums` en montos para alinear columnas
61. **Boleta multi-papel con media queries de tamaño** — térmicas 58/80mm necesitan padding 3mm y ancho máximo full; A4/Letter necesitan centrado y `max-width: 80mm` para no desperdiciar página. Pattern: `@page { size: auto; margin: 0 }` + `@media print and (max-width: 90mm)` (térmica) + `@media print and (min-width: 150mm)` (A4/Letter). Evita hacer UI para "elegir tamaño de papel" — el browser detecta por la impresora seleccionada
62. **MCPs con scope local** viven en `~/.claude.json` bajo `projects.<path>.mcpServers` — solo disponibles en ese proyecto. Usar `claude mcp add <name> -e KEY=value -- <command>` para registrar. Scope "user" para global: `--scope user`
63. **Matar proceso MCP NO dispara auto-respawn** en la sesión activa — Claude Code spawnea al inicio, si lo mueres se pierden todas las tools de ese MCP hasta **restart completo** de Claude Code. `claude mcp list` spawnea procesos frescos para health-check, por eso muestra "Connected" engañosamente — NO es el proceso que sirve la sesión actual
64. **Cambiar API key de un MCP requiere restart de Claude Code** — el proceso en memoria no relee env tras `claude mcp remove && claude mcp add`. El config on-disk se actualiza pero el proceso stdio sigue con env viejo. Flujo: `remove` → `add` con nueva key → **Cmd+Q + relaunch**
65. **Vultr "Autenticación fallida" con key correcta** — probable causa es "API IP Access Control" activado: rechaza calls de IPs no whitelisteadas. Ir a https://my.vultr.com/settings/#settingsapi → Access Control → agregar IP actual o desactivar
66. **`cf_get_zone` del MCP Cloudflare NO expone `ssl_mode`** — solo retorna info básica (dominio, plan, NS). Para verificar Full (strict) hay que ir al dashboard o extender el MCP agregando endpoint `/zones/{id}/settings/ssl`. **Crítico para `__Secure-` cookies de NextAuth**: si Cloudflare está en "Flexible SSL" (HTTPS público → HTTP al origin), las cookies se pierden silenciosamente
67. **MCPs de terceros guardarlos FUERA del repo** — proyectos como `vultr-mcp-server` y `cloudflare-mcp-server` son standalone, no son submodules. Ubicación canónica: `../` del repo (en `Dysa-Projects/` hermano de `system_pos/`), NO dentro del monorepo. Evita engordar el working tree con `node_modules` / `dist` del MCP (52–76 MB cada uno)
68. **Deploy pattern: rsync code + scp separado de `.env.docker`** — rsync con excludes (`node_modules/`, `.next/`, `.git/`, `.env.local`, `*.log`) para el código; `.env.docker` va por `scp` aparte para control explícito de qué secretos llegan al VPS. Razón: un `--include .env.docker` en rsync + rsync recursivo hace fácil accidentalmente subir `.env.local` si las reglas se reorganizan. Separación reduce blast radius
69. **Backup + rollback automático en VPS** (`deploy.sh`): antes de deploy crea `${VPS_DIR}.backup_${TIMESTAMP}` con `cp -r`; si el health check post-deploy falla después de 12×10s=2min, restaura del último backup. Cleanup: conserva los últimos 3 backups, elimina anteriores con `ls -dt ... | tail -n +4 | xargs rm -rf`. Simple, eficaz, sin dependencias externas (no k8s, no flux)
70. **Confirmation pattern para operaciones destructivas remotas** — `read -r CONFIRM; if [[ "$CONFIRM" != "deploy" ]]; then exit 0; fi` — obliga a TIPEAR la palabra "deploy" (no solo "y" o Enter). Previene deploys accidentales por `./deploy.sh <Enter>` durante una demo. Aplicable a cualquier script destructivo en CI/CD local
71. **Prisma en Docker build stage requiere `POS_DATABASE_URL` dummy** — `pnpm build` invoca el static analysis de Next.js que a su vez toca Prisma client. Prisma NO se conecta en build, pero **exige que la env var exista** para generar el cliente. Sin esto: build falla con `Environment variable not found: POS_DATABASE_URL`. Fix en `apps/web/Dockerfile`: `ARG POS_DATABASE_URL=postgresql://build:build@localhost:5432/build` + `ENV POS_DATABASE_URL=${POS_DATABASE_URL}` en el build stage. La URL real se inyecta solo en runtime via `.env.docker`. Commit: `cdb2b24`
72. **NextAuth v5 detrás de proxy (Cloudflare/Nginx) requiere `trustHost: true`** — por default v5 rechaza requests cuyo `Host:` header no coincide literalmente con `NEXTAUTH_URL`. Cloudflare proxy reescribe ese header (el origin ve la IP + puerto internos, no `dy-pos.zgamersa.com`) → NextAuth tira `UntrustedHost` → login falla silenciosamente en prod aunque todo lo demás esté bien. Fix: agregar `trustHost: true` al objeto de `NextAuth({...})` en `apps/web/auth.ts` **o** setear env `AUTH_TRUST_HOST=1` en el container (v5 respeta ambos). Commits: `ef9ef79` (código) + `947cfc0` (env). **Obligatorio para cualquier deploy que pase por CDN/reverse proxy**
73. **NextAuth v5 beta.31 `signIn("credentials")` desde Server Action falla con `MissingCSRF`** — `signIn()` internamente hace fetch server-to-server a `/api/auth/callback/credentials`, pero ese fetch no puede incluir la cookie CSRF del navegador (server-to-server no tiene cookies del cliente) → NextAuth rechaza el request. Workaround canónico en `apps/web/app/login/actions.ts` (commit `947cfc0`): **bypass completo de `signIn()`** — verificar credenciales directamente con `prisma.usuario.findUnique` + `bcrypt.compare`, luego emitir JWT con `next-auth/jwt::encode` y setear la cookie manualmente. Detalles críticos:
    - **`encode()` salt debe ser el nombre del cookie** (`__Secure-authjs.session-token` en prod, `authjs.session-token` en dev). NextAuth v5 usa el nombre del cookie como salt criptográfico para el JWT.
    - **Import correcto**: `import { encode } from "next-auth/jwt"` (NO `@auth/core/jwt` que no está en v5 beta.31).
    - **Limpiar cookie CSRF** (`__Host-authjs.csrf-token`) tras setear la sesión → fuerza regeneración en el próximo request.
    - **Fields obligatorios del JWT**: `sub`, `id`, `email`, `name`, `rol`, `iat`, `exp`, `jti` — los callbacks `session()` y `jwt()` de `auth.ts` los necesitan para propagar. Si falta `rol`, el middleware RBAC rompe.
74. **Prisma singleton debe aplicar en TODOS los entornos** — el pattern estándar "`if (NODE_ENV !== 'production') globalForPrisma.prisma = prisma`" solo cachea el client en dev. En prod Next.js re-evalúa el módulo (por Turbopack isolation, serverless cold starts, route-based chunking) y cada re-evaluación instancia un **nuevo `PrismaClient`** → **connection pool exhaustion** tras algunas horas de tráfico. Fix (commit `947cfc0`, `packages/db/src/client.ts`): eliminar el guard del `if` y setear `globalForPrisma.prisma = prisma` **siempre**. El singleton previene leaks de conexiones sin coste perceptible en dev (el cache ya estaba activo ahí).
75. **Docker `docker compose up` NO recrea containers si el código cambió pero la config no** — síntoma: corrés nuevo build, ves "container running", pero la app expone código viejo (digest errors, rutas obsoletas, bundles de un build anterior). Causa: Compose compara labels de env/image — si coincide, reutiliza el container. **Fix canónico en `deploy.sh`**: incluir `--force-recreate` en el `docker compose up`. Pattern completo: `docker compose --env-file .env.docker up -d --build --force-recreate --remove-orphans`. Sin `--force-recreate`, el rebuild de la imagen no garantiza reemplazo del container.
76. **Cloudflare SSL "Flexible" + origin con HTTPS redirect = `ERR_TOO_MANY_REDIRECTS`** — `Flexible` manda HTTPS público → HTTP al origin. Si el origin (Nginx/Next en container) responde con redirect HTTP→HTTPS, Cloudflare recibe un 301, reescribe a HTTPS público, el browser vuelve a entrar, el origin vuelve a redirigir → **loop infinito**. Síntoma: `curl -sI` devuelve `HTTP/2 301 ... location: https://<mismo-host>/` (redirect a sí mismo). **Regla obligatoria** cuando hay certs en origin (Vultr + Cloudflare proxied): SSL mode debe ser **"Full (strict)"** (ideal) o **"Full"** (tolera certs auto-firmados). Verificación del fix: nuevo `curl -sI` devuelve `307` con `location: /login?callbackUrl=...` (redirect de autenticación, NO loop)
77. **`curl` NO es equivalente al navegador para Server Actions de Next.js 15** — los Server Actions esperan campos hidden `$ACTION_REF_1`, `$ACTION_1:0`, `$ACTION_1:1`, `$ACTION_KEY` en el POST multipart. El navegador los inyecta automáticamente desde `<form action={...}>`; `curl --data` no los tiene → el Server Action los ignora o lanza 500. **Consecuencia práctica**: diagnosticar login/auth en prod con curl puede dar falsos negativos. **Regla**: antes de concluir "auth roto" en prod, **probar siempre en browser** (modo incógnito para evitar cookies stale). Curl solo sirve para health checks GET (como `/api/health`) y endpoints que NO usan Server Actions.
78. **`core.hooksPath` con path absoluto se rompe al reiniciar Claude Code** — el sandbox de Claude Code monta el repo en `/sessions/<uuid>/mnt/system_pos/` con UUID distinto por sesión. Si `git config --local core.hooksPath <path absoluto>` quedó seteado con el UUID de una sesión vieja, al reiniciar Claude Code el path apunta a un mount inexistente, **y git falla SILENCIOSAMENTE** — no hay warning ni error, los hooks simplemente no se ejecutan. Síntoma observado (hoy 2026-04-21): 3 commits pasaron sin ser capturados al `memory/.pending-notes` entre restarts para instalar MCPs Vultr/Cloudflare. **Fix canónico**: usar **path relativo** → `git config --local core.hooksPath .git/hooks`. Git lo resuelve contra `$PWD` del repo, sobrevive restarts del sandbox, funciona idéntico desde terminal macOS y desde la sandbox.
79. **`ssh` en bash scripts con `read` interactivos consume el stdin del script parent** — descubierto el primer día de deploy real. Síntoma: `set -euo pipefail` + un `read RUN_BUILD` aborta el script sin procesar la entrada. Causa: cada `ssh user@host "cmd"` del pre-flight lee stdin por default (lo pasa al remoto como input), consumiendo las líneas que alimentaba con `printf 'N\ndeploy\n' | ./deploy.sh`. Fix canónico: **TODAS las invocaciones de `ssh` en scripts de automation deben usar `-n`** (desactiva stdin) o `< /dev/null`. Aplicado en `deploy.sh::ssh_run` helper + la verificación inicial de conexión. Commit: `70a084f`. Regla general: si un bash script tiene cualquier `read` + invoca `ssh`, ambos compiten por stdin si no se separa explícitamente.
80. **`rsync . remote:/dir/` sin awareness del `.gitignore` transfiere TODO** — incluyendo `zip/` (1.3 GB legacy PHP), `node_modules/` raíz (pnpm con symlinks), `screenshots/`, `ssh.md` con creds, `memory/` (segundo cerebro dev-only), MCPs standalone. Observado hoy: 73,000+ archivos / 2.9 GB en VPS antes de abortar, disco al 86%, `ssh.md` con creds **leak a prod**. Fix canónico: `--filter=':- .gitignore'` (hace que rsync respete las reglas del gitignore) **+** excludes explícitos para archivos versionados pero dev-only: `memory/`, `.claude/`, `.obsidian/`, `vultr-mcp-server/`, `cloudflare-mcp-server/`, `CLAUDE.md`, `OBSIDIAN-CLAUDE-SETUP.md`, `ssh.md`, `token.md`, `*.key`, `*.pem`. Post-fix: 235 archivos / 1.1 MB. Verificar siempre con `rsync --dry-run --stats` antes del primer deploy real. Commit: `70a084f`
81. **`__Secure-` cookie prefix requiere HTTPS obligatoriamente** — si usás `cookieStore.set({ name: "__Secure-authjs.session-token", secure: true })` en dev local sobre HTTP, el browser **rechaza silenciosamente** la cookie. El login aparenta funcionar (Server Action redirige) pero la sesión no persiste. Fix canónico (commit `6334025`): detectar scheme desde `NEXTAUTH_URL` y alternar nombre del cookie: `const USE_SECURE_COOKIES = (process.env.NEXTAUTH_URL ?? "").startsWith("https://"); SESSION_COOKIE = USE_SECURE_COOKIES ? "__Secure-authjs.session-token" : "authjs.session-token"`. Los cookies `__Host-` para CSRF siguen la misma lógica. Aplica a `login/actions.ts` (login manual JWT) y cualquier otro lugar que escriba cookies de sesión.
58. **Editar venta con devoluciones rompe invariantes** — `editarVenta` revierte stock/contadores y re-aplica detalles, pero `Devolucion` ya consumió esos detalles vía `DevolucionItem` y ajustó stock por su cuenta. Editar produce stock duplicado/negativo y `compras`/`ultimaCompra` inconsistentes. **Defensa en 3 capas (commit `7d118be`)**: (a) UI: botón "Editar" `disabled` con tooltip si `venta.devoluciones.length > 0` en `ventas/[id]/page.tsx`; (b) Page guard: `prisma.devolucion.count` post-`notFound` en `ventas/[id]/editar/page.tsx` → `redirect(/ventas/${id})`; (c) Server action: pre-check en `editarVenta` después de cargar `ventaVieja` → retorna `{ ok: false, error }`. Mismo patrón ya existía para `eliminarVenta` (FK constraint) — ahora cubre edición también
59. **`Collecting build traces` ENOENT `.nft.json` es bug pre-existente Next 15.5 + Sentry/OpenTelemetry** — síntoma: `next build` compila ✅, types ✅, genera 12/12 páginas ✅, falla en serialización NFT con `ENOENT … _not-found/page.js.nft.json` (o ruta similar). Reproducible en `main` limpio sin cambios locales. **No bloquea deploy** — el bundle existe. Causa probable: interacción `serverExternalPackages` + instrumentación OTel que altera el grafo de dependencias trace. Workaround: ignorar el error de trace si compile + page-gen pasaron. Investigar upgrade Sentry SDK o `outputFileTracingIncludes`/`Excludes` cuando moleste en CI
60. **`<input type="number">` con `.nonnegative()` permite $0** — en formularios de precio (CLP) eso es venta gratis silenciosa. Usar `.min(1, "El precio debe ser mayor a $0")` en zod schema. Aplicado en `productos/producto-form.tsx`. Aplica también a precios de catálogo, fees, montos mínimos en general — `nonnegative` solo debe usarse para campos donde 0 sea semánticamente válido (stock inicial, descuento opcional, etc.)
82. **Build Docker obsoleto tras cambios en `actions.ts` da falso "código desplegado"** — síntoma observado en prod post-deploy (2026-04-21): login reportaba errores que **ya estaban corregidos en `actions.ts` local** desde commits atrás. Causa: `docker compose up -d --build` reutilizó cache de build intermedio; el container corría código viejo del Server Action. Complementa gotcha 75 pero específico para cambios en Server Actions (que Next.js compila fuera del bundle principal, más expuestos al cache). **Regla obligatoria**: tras cualquier modificación en `app/**/actions.ts` o archivos del flujo auth (`auth.ts`, `auth.config.ts`, `login/actions.ts`), el deploy **DEBE** incluir `--force-recreate` + idealmente `docker compose build --no-cache web` antes del `up`. `scripts/deploy.sh` ya incluye `--force-recreate` (commit `734fca8`); si el problema persiste con solo ese flag, agregar `--no-cache` manualmente al build. Validación del deploy: `docker exec pos-web grep -rE "<patrón esperado>" /app/apps/web/.next/server/` para confirmar que el binario tiene el código correcto.
83. **`localhost` en alpine resuelve a `::1` (IPv6), pero Next.js standalone escucha solo IPv4 `0.0.0.0`** — síntoma: healthcheck con `wget http://localhost:3000/...` desde dentro del container devuelve `Connection refused`, el container nunca pasa a healthy, aunque la app responde perfectamente desde el host. Descubierto durante GAP-02 (commit `49a91a2`). **Regla**: en cualquier comando DESDE DENTRO de un container alpine que necesite hit al propio server (healthchecks, sidecar probes, init scripts), usar **`127.0.0.1` explícito**, NO `localhost`. Alternativa: `HOSTNAME=::0 PORT=3000` para que Next.js escuche también IPv6, pero eso requiere patch al entrypoint. El fix más limpio es 127.0.0.1 en el consumer. Aplica a wget/curl/node-fetch indiferentemente.
84. **Alpine minimal NO trae `curl`, pero `wget` sí** — viene de BusyBox en `/usr/bin/wget` con interfaz ligeramente distinta (flags: `-q -O -` en vez de `-s -o -`, sin `-f`, sin `-v`). Para healthchecks de docker-compose en containers Node alpine, preferir `wget -q -O /dev/null URL || exit 1` sobre `curl -f URL`. Si se necesita curl por otras razones, agregar `RUN apk add --no-cache curl` al Dockerfile (adds ~500 KB)
85. **Ubuntu 24.04 cron.daily sin anacron: schedule vive en `/etc/crontab`** — por default Ubuntu 24.04 NO instala `anacron`. Entonces `ls /etc/anacrontab` falla y uno pensaría "no hay scheduler para cron.daily". **FALSO**: `/etc/crontab` tiene una entrada fallback: `25 6 * * * root test -x /usr/sbin/anacron || { cd / && run-parts --report /etc/cron.daily; }`. O sea, si anacron no existe, a las 06:25 UTC el cron nativo corre `run-parts /etc/cron.daily`. **Verificación pre-deploy de cualquier script en cron.daily/**: `cat /etc/crontab | grep cron.daily` — si existe esa línea, el schedule está garantizado sin anacron. No falta instalar nada
86. **`backdrop-blur` crea stacking context que atrapa `z-index` de hijos** — síntoma observado en mobile-nav (commit `e9f985b`): un drawer con `z-[9999]` quedaba renderizado DEBAJO del header porque el header tenía `backdrop-blur-*`. Causa: `backdrop-filter` crea un stacking context local igual que `transform`/`filter`/`opacity < 1`, y los descendientes ya no pueden escalar por encima del contenedor padre vía `z-index`. Fix canónico: **`createPortal` al `document.body`** para sacar el drawer del árbol DOM del header y reubicarlo como sibling directo de `<body>`. Pattern también útil para tooltips, modals, dropdown menus cuando hay `backdrop-blur` en ancestros. En Next.js App Router: `'use client'` + `createPortal(jsx, document.body)` dentro de `useEffect` que check `typeof window !== 'undefined'`
87. **Flex items tienen `min-width: auto` por default → rompen `overflow-x-auto`** — síntoma observado en prod mobile: tablas de productos/categorías/clientes/usuarios/ventas causaban **scroll horizontal de toda la página** en vez de scroll interno de la tabla. Causa: un `<div class="flex flex-col flex-1">` contiene `<main>` que contiene una `<table overflow-x-auto>`. El flex child (`<main>`) por default tiene `min-width: auto` — se estira al ancho REAL del contenido (la tabla gigante) **antes** de que `overflow-x-auto` se active. Fix: `min-w-0` explícito en ancestros flex (`div flex-col flex-1 min-w-0` y `main min-w-0`). Regla general: **cualquier flex/grid child que contenga algo con `overflow-x-auto`** necesita `min-w-0` explícito. Aplica a Tailwind `flex-col`, `flex-row`, `grid`. Commit `e9f985b`

88. **DEE `PROJECT_PROFILE.json` se auto-regenera — 2 triggers locales** — el profile del engine (dominio, tech scores, skills auto-activadas) ya no queda stale. Infra instalada 2026-04-22:
    - **Script**: `.claude/scripts/rescan-profile.sh` — wrapper de `orchestrate.py` que escribe atómicamente el profile, con lock anti-concurrencia y log rotado en `.claude/rescan.log`. Siempre exit 0 (nunca bloquea caller). Flag `--bg` para ejecutar con `nohup ... & disown`.
    - **Trigger 1 — SessionStart hook**: chequea `last_scan` en `PROJECT_PROFILE.json`; si > **24h** → dispara rescan en background ANTES del banner (no bloquea). Hook definido en `.claude/settings.json`.
    - **Trigger 2 — post-commit hook**: si el commit tocó manifests (`package.json`, `pnpm-workspace.yaml`, `turbo.json`, `**/package.json`, `prisma/schema.prisma`, `apps/*/app.json`, `apps/mobile/eas.json`, `requirements.txt`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `composer.json`) → rescan inmediato en background. El hook preserva su responsabilidad original de append a `memory/.pending-notes`.
    - **Compat worktrees**: ambos hooks detectan el main worktree con `git worktree list --porcelain | awk '/^worktree / {print $2; exit}'` y escriben al path principal — Worktree linked trees NO crean profiles duplicados.
    - **Local-only**: `.claude/settings.json` y `.claude/scripts/` están en `.gitignore`, así que esta infra vive por developer-machine. El `.git/hooks/post-commit` nunca se commitea (git no lo rastrea por diseño). Consecuencia: cada dev/agente que clona el repo debe re-instalar manualmente (futura mejora: publicar `/dee-install-hooks` command).
    - **Verificación rápida**: `tail -5 .claude/rescan.log` muestra los últimos triggers; `python3 -c "import json; print(json.load(open('.claude/PROJECT_PROFILE.json'))['last_scan'])"` confirma frescura.
    - **Gotcha de orchestrate.py**: busca `blueprints/ecosystems.json` UN nivel arriba del esperado (`$REPO/blueprints/` en vez de `$REPO/.claude/blueprints/`). El rescan script compensa inyectando el path correcto via Python wrapper inline — NO modificar `orchestrate.py` directamente (es infra compartida del engine).

90. **Sentry edge/client runtime no tiene `node:crypto` — split `lib/privacy.ts` ↔ `lib/privacy-edge.ts`** — `apps/web/lib/privacy.ts` usa `createHash("sha256")` para `pseudonymize()`; importarlo desde `sentry.edge.config.ts` o `sentry.client.config.ts` rompe el build edge bundle (`Module not found: 'crypto'`). Fix canónico (sesión 2026-04-26): crear `lib/privacy-edge.ts` con SOLO `truncateIP()` (regex puro, sin crypto) + en edge/client configs **redactar emails con string literal** (`"(redacted-edge)"` / `"(redacted-client)"`) en lugar de pseudonimizar. Server runtime (`sentry.server.config.ts`) sí puede importar `lib/privacy.ts` completo. Regla: cualquier helper que toque `node:crypto`, `fs`, `path` debe vivir en módulo separado del edge surface.

91. **Migraciones Prisma idempotentes obligatorias cuando dev DB tiene drift** — `packages/db/prisma/migrations/20260426*_*/migration.sql` (F-3 + F-9) usan: `CREATE TABLE IF NOT EXISTS`, `ALTER TYPE ... ADD VALUE IF NOT EXISTS`, `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` para FKs, `CREATE INDEX IF NOT EXISTS`. Razón: la dev DB ya tenía F-3/F-9 schema aplicado vía `db:push` durante experimentación, pero prod arranca clean. Sin idempotencia, `prisma migrate deploy` falla en dev (objeto ya existe) o en prod si re-corre. Pattern: **toda migración manual escrita-a-mano debe ser idempotente** (las generadas por `prisma migrate dev` no necesitan, pero las nuestras no se generan así porque el schema ya está aplicado). `migration_lock.toml` con `provider = "postgresql"` también es obligatorio para baseline.

92. **GitHub `gh` CLI con scope `workflow` requerido para tocar `.github/workflows/*.yml`** — sesión 2026-04-26 quedó bloqueada en PR #3 porque el token tenía `gist, read:org, repo` pero faltaba `workflow`. Síntoma: `gh pr merge` retorna error sobre permisos. Fix: `gh auth refresh -s workflow,repo,admin:repo_hook`. **Regla operativa**: si Cowork/CLI va a tocar workflows o secrets en CI, validar primero `gh auth status` muestra `workflow` en scopes. Setear secrets via `gh secret set NAME` requiere admin del repo (verificar con `gh api repos/OWNER/REPO --jq .permissions.admin`).

93. **`deploy-prod.yml` `push: branches: [main]` trigger falla 0s con Dependabot** — bot pushes corren con `GITHUB_TOKEN` restringido (sin secrets de production) → workflow falla en pre-flight con "workflow file issue" en cada PR auto-merged. Fix (commit `08e4d33`): remover el push trigger entirely, dejar solo `workflow_dispatch` con input `confirm == 'deploy'`. CLAUDE.md raíz ya marca `scripts/deploy.sh` como canonical — el workflow es OPCIONAL. Si en el futuro se quiere push trigger, agregar `if: github.actor != 'dependabot[bot]'` al job.

94. **Dependabot `npm` con `allow: direct + indirect` abre 12+ PRs/semana incluyendo majors riesgosos** — descubierto en sesión 2026-04-26 (Next 15→16, TypeScript 5→6, Expo SDK bumps llegaron en una sola noche). Decisión arquitectural: **Renovate para version updates** (grouping + scheduling adecuado vía `renovate.json`) + **Dependabot solo `github-actions`** (Renovate por default no maneja Actions). Para CVEs: GitHub Dependabot **Security Updates** (toggle en Settings → Code security & analysis) crea PRs solo para advisories, NO version bumps regulares. Config final en `.github/dependabot.yml` solo tiene `package-ecosystem: github-actions`.

95. **Worktrees branched de main viejo deben rebasearse antes de squash-merge** — F-9 worktree (`worktree-agent-a848a7aa`) fue creado desde commit `5b67622` (pre-F-5). Al volver al main para integrar, main había avanzado (08e4d33, 8863f82, 1f89fda). Sin rebase, `git merge --squash` introduciría conflictos en `dependabot.yml`/`ci.yml`. Pattern canónico: **DENTRO del worktree** correr `git fetch origin && git rebase origin/main` antes de hacer el commit final. Luego desde main: `git merge --squash <branch>`. Después: `git worktree remove <path> -f -f` (doble `-f` necesario si el agente sigue lockeando vía pid file en `.git/worktrees/<name>/locked`).

96. **`prisma migrate deploy` en cada deploy via container ad-hoc — Dockerfile multi-stage NO copia `prisma/`** — incidente prod 2026-04-27: deploy de F-3 + F-9 dejó BD sin `ventas.deleted_at` ni tablas `cajas`/`aperturas_caja`/`movimientos_caja`/`pagos_venta` → `P2022 column does not exist` en runtime → `/` devuelve 500 con digest. Causa raíz: el container `pos-web` corre código nuevo pero la BD se creó con `db push` al inicio y nunca aplicó migraciones. El Dockerfile multi-stage solo copia el cliente Prisma generado (no `packages/db/prisma/`) → imposible correr `migrate deploy` desde el container. Fix canónico (`scripts/deploy.sh` fase 5b/6, commit `d823990`): (a) `tar -czf prisma-migrations.tar.gz packages/db/prisma/`, (b) `scp` al VPS `/tmp/`, (c) `docker run --rm --network pos-chile-network -v /tmp/prisma:/app -e DATABASE_URL=postgresql://...@pos-postgres:5432/... node:22-alpine sh -c "cd /app && npx -y prisma@6.x migrate deploy"`, (d) cleanup `/tmp`. Las migraciones IDEMPOTENTES (gotcha 91) hacen seguro re-correr en cada deploy aunque no haya pendientes. Pattern usable también para `prisma db seed` post-deploy.

97. **`Date.toLocaleString` sin `timeZone` causa React #418 (text content mismatch)** — observado 2026-04-27 en `/` dashboard `ultimas-ventas.tsx`: server (Docker en UTC) renderiza fechas con TZ del proceso, browser cliente las renderiza con TZ local del usuario → strings divergen → React error #418. Fix (commit `1ae8226`): forzar `timeZone: "America/Santiago"` explícito en el `Intl.DateTimeFormat` o `formatFechaHora()`. Regla general: **cualquier formateo de fecha visible en SSR debe declarar timeZone explícito** — nunca confiar en TZ del runtime. Aplica a `formatFecha`, `formatFechaHora`, `formatHora`, formatters de reportes/boletas. Ya cubría dashboard chart pero no las "últimas ventas".

98. **Recharts `<ResponsiveContainer>` SSR width(-1) — diferir mount al cliente con flag `useEffect`** — pattern ya conocido para `VentasChart` (gotcha 44), pero olvidado al crear `Sparkline`. Síntoma: warning console "width(-1) height(-1) of chart should be greater than 0" en cada render SSR. Fix (commit `1ae8226`): `const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), []); return mounted ? <ResponsiveContainer>...</ResponsiveContainer> : <div className="placeholder" />`. **Replicable a cualquier wrapper Recharts** que viva en server component árbol. Considerar extraer helper `<ChartMount>` reusable si aparece más de 3×.

99. **Sentry "Error: aborted" del Node `_http_server abortIncoming` es ruido — filtrar en `beforeSend`** — abortIncoming ocurre cuando cliente cierra conexión antes que server termine response (browser refresh, fetch cancelado, Cloudflare health-check con timeout corto). Sentry lo marca super_low actionability — NO es bug nuestro. Fix (commit `4ac93ac`, `sentry.server.config.ts`): en `beforeSend(event, hint)` chequear `hint?.originalException?.message === "aborted"` o `event.exception?.values?.[0]?.value?.match(/^aborted$/i)` → `return null` (drop). Mantiene señal real (errors aplicativos) sin contaminar dashboard. Pattern aplicable a otros errors transientes conocidos (ECONNRESET, EPIPE de clientes que se desconectan).

100. **`console.error(err)` con objetos Prisma loguea PII raw a stdout — fix selectivo** — `error.meta.target` y a veces los parámetros de query incluyen `email`, `rut` u otros campos que `beforeSend` de Sentry sanitiza pero `console.error` escribe a stdout del container ANTES (Sentry lo recoge después). Si el container forwardea logs a Datadog/CloudWatch/journald, queda PII en plaintext. Fix canónico (commit `0d9c417`, 3 callsites en `login/actions.ts:127`, `api/v1/auth/login/route.ts:166` y un tercero): cambiar `console.error("[ctx] message:", error.message, error)` → `console.error("[ctx] message:", error.name + ": " + error.message)`. El stack completo va a Sentry donde `beforeSend` aplica `pseudonymize`. **Regla**: nunca pasar el objeto error completo a `console.error`/`console.log` en code paths que vean PII. Ver también gotcha 90 (split privacy.ts edge/server).

101. **Client component que importa enum desde `@repo/db` crashea bundle browser** — observado al crear `caja/movimientos/nuevo/movimiento-form.tsx`: el `'use client'` form importaba `TipoMovimientoCaja` del Prisma enum vía `@repo/db`, pero `packages/db/src/client.ts` evalúa `process.env.POS_DATABASE_URL` en module-scope → bundle browser tira `Cannot read property of undefined (reading 'POS_DATABASE_URL')` o falla silente al hidratar. Fix canónico (commit `6b1db35`): replicar el enum como string union local en el client component (`type TipoMovimientoCaja = "INGRESO" | "EGRESO" | "VENTA" | "DEVOLUCION" | "AJUSTE"`). Server actions sí pueden importar de `@repo/db`. **Regla**: `@repo/db` solo desde server runtime. Para shared types entre server/client, usar `@repo/api-client/types` (Zod-based, sin Node deps) o copiar local.

102. **Routing con prefijos comunes requiere longest-prefix-match para "active link"** — observado en sidebar tras agregar `/cajas` (admin) junto a `/caja` (POS): `pathname.startsWith("/caja")` matcheaba ambas, marcaba ambas activas a la vez. Y `/caja/movimientos` también disparaba `/caja` activo. Fix canónico (commit `6b1db35`, `lib/nav-active.ts`): helper `isNavActive(pathname, href)` que (a) requiere boundary `/` después del prefijo (`/caja` no matchea `/cajas`), (b) elige el match **más largo** entre rutas candidatas (`/caja/movimientos` gana sobre `/caja`). Reusable desde sidebar + mobile-nav. Pattern aplicable a cualquier nav con submenús.

103. **`backdrop-filter: blur` causa jank al volver de tab-freeze (Chromium Memory Saver / Safari background freeze / Firefox throttle)** — síntoma reportado 2026-04-27: al cambiar de pestaña y volver, la web "tarda unos segundos y se ve borrosa". Causa: el blur GPU-pesado tarda 1-2 frames extra al recomponer la capa cuando el compositor sale de tab-freeze. Más visible en surfaces always-on (header global, sticky table headers). Fix canónico (commit `24167c9`): **eliminar blur de surfaces persistentes** (`components/header.tsx`, `components/data-table.tsx` sticky thead, tooltips Recharts) — usar bg sólido. **Mantener blur ON-DEMAND** (mobile drawer overlay) porque solo aparece cuando se abre, costo aceptable. Regla: si el surface está visible 100% del tiempo en el viewport, NO usar `backdrop-filter`; si aparece on-demand <30% del tiempo, OK.

104. **`unstable_cache` para queries del layout dashboard — invalidar con `revalidateTag` desde TODAS las mutations** — el layout corre en CADA navegación del dashboard; sin cache, el `prisma.usuario.findUnique` para mostrar avatar/nombre del header cuesta 30-80ms de Postgres por click. Pattern canónico (commit `24167c9`, `app/(dashboard)/layout.tsx`): envolver en `unstable_cache(fn, ["dashboard-perfil", String(userId)], { revalidate: 300, tags: [`usuario:${userId}`] })`. **CRÍTICO**: agregar `revalidateTag(\`usuario:${id}\`)` en TODOS los callsites que mutan `Usuario` — sin esto, cambio de avatar/nombre tarda hasta 5min en reflejarse. En POS Chile son 4 callsites: `perfil/actions.ts::actualizarPerfil`, `usuarios/actions.ts::actualizarUsuario`, `api/perfil/avatar/route.ts::POST`, `api/v1/usuarios/me/route.ts::PUT`. Pattern aplicable a cualquier query frequent-read low-write (config global, session preferences, branding por tenant).

89. **Skill custom `privacy-compliance` existe en `.claude/skills/` — activado y listo** — creado 2026-04-23 para resolver el gap del CEO ("Privacy Policy URL pública — borrador legal + página /privacidad"). Cubre Ley 19.628 + Ley 21.719 + Apple App Privacy + Google Data Safety con foco exclusivo en el stack POS Chile. **280 KB · 6240 líneas · 14 archivos** (1 SKILL.md + 8 references + 3 scripts Python funcionales + 3 templates production-ready). Invocable con `/privacy-compliance`. Incluye `pii_scanner.py` que detectó 15 campos PII del schema actual + 2 findings high genuinos (usos de console.log con PII sin `pseudonymize()` — pendiente de arreglar antes de activar Sentry en prod). **Local-only** (`.claude/skills/` gitignored). Plan de rollout multi-agente en `docs/privacy-rollout-plan.md` con 5 fases A-E distribuidas entre CLI/Worktree/Cowork/Gemini/Pierre; cubre endpoints ARCOP+, consent banner, RAT, DPAs, app privacy + data safety forms. **Comparación con bar existente**: senior-security = 44 KB, senior-architect = 72 KB, mobile-design = 268 KB, privacy-compliance = 280 KB (tier más alto del ecosistema). No duplicar contenido legal en `memory/context/` — el skill es la fuente de verdad; memory/ solo apunta al skill.

---

## Plan Maestro — Estado

| Fase | Contenido | Agente | Commit(s) | Estado |
|------|-----------|--------|-----------|--------|
| 1 | Setup monorepo + Docker + Prisma | CLI | 253f2c4 | ✅ |
| fix | dotenv-cli + docker + limpieza | CLI | 6e93c56 | ✅ |
| 2 | NextAuth v5 + roles + layout + sidebar | CLI | 063edfb | ✅ |
| fix | E2E auth: env vars + Prisma resolution | CLI | d25add8 | ✅ |
| 3 | CRUD: Categorías, Productos, Clientes, Usuarios | Worktree | 23faa99+21682b0 | ✅ |
| 4 | Módulo Ventas: crear/editar/eliminar + stock | Worktree | 60d5dd9+fe9fcac | ✅ |
| 5 | POS Caja: carrito real-time, IVA, métodos pago, boleta | Worktree | fe13e63+7220423 | ✅ |
| 6 | Dashboard: KPIs CLP, Recharts, top productos | Worktree | bc89c09+b3be397 | ✅ |
| 7 | Reportes: PDF @react-pdf, Excel, filtros fecha | Worktree | 3c6f96d+024f48b | ✅ |
| 8 | API REST + Security + Vitest + Docker Deploy | CLI | acdcbce+75b7891 | ✅ |
| fix | Scalar API docs (reemplaza swagger-ui-react) | CLI | a3296ec | ✅ |
| 14 | Infra Pro: rate limiting Upstash + health endpoint | CLI | 80543c6 | ✅ |
| 9 | Perfil usuario: avatar, datos, password strength, actividad | Worktree | 4837a84+825d3e3 | ✅ |
| 10 | Alertas stock bajo | Worktree | c691b0c+a22d15b | ✅ |
| 11 | Descuentos en ventas | Worktree | 33ae07e+4b051e3 | ✅ |
| 12 | Devoluciones | Worktree | a4830e3+25c6aa7 | ✅ |
| 13 | UX Pro: dark mode + animaciones globales | Worktree | 30a2065+64fa064 | ✅ |
| 15 | UX Premium: sidebar, KPIs sparkline+counter+trend, skeletons, inputs RUT/CLP | Worktree | 4c158df+7f9e7ed | ✅ |
| 16 | POS Caja premium: split 60/40, category pills, AnimatePresence, shortcuts | Worktree | cb44e3e+49c1625 | ✅ |
| 17 | Pages premium: login, 404/error, empty states, reportes, alertas urgency | Worktree | 50d047d+2d0305a | ✅ |
| 18 | Production hardening: PWA manifest + metadata + health + README + gitignore | CLI | 5234212 | ✅ |
| 19a | Docs arquitecturales + tests edge (hydration, RUT, boundary) + cleanup | CLI | 7e7444c | ✅ |
| 19b | Polish final: badge consistency + animations + dark mode + loading states | Worktree | 02cb8a6+0f96905 | ✅ |
| F-2 | Hardening: CSP + rate-limit fail-closed (500ms) + Sentry PII scrub | CLI | 590049c | ✅ |
| F-3 | Soft-delete ventas + AuditLog (Ley 21.210, retención 6 años) | Worktree | 5b67622 | ✅ |
| F-5 | CI/CD pro: workflows reusables + branch protection + Dependabot/Renovate | CLI | 01e3528+8863f82+1f89fda | ✅ |
| F-9 | Caja: split tender + apertura/cierre + movimientos + Z-tape | Worktree | 4ab6e31 | ✅ |
| F-10 | Mobile a11y + ios.privacyManifests + Maestro E2E | CLI | 614ed07 | ✅ |

---

## Agentes del proyecto

| Agente | Rol asignado |
|--------|-------------|
| Claude Cowork (yo) | Coordinador, verificación independiente, memoria, redacción de instrucciones |
| Claude Code CLI | Infra, auth, fixes puntuales, API, deploy, hotfixes |
| Claude Code Worktree | Features grandes (worktree nuevo por tarea, merge a main al terminar) |
| Gemini | Security audit, tests, code review, docs API |
| Pierre | Copia instrucciones entre agentes |

### Reglas de workflow para futuros planes

1. **Cada instrucción debe indicar explícitamente el agente destinatario** al inicio:
   `AGENTE: Claude Code CLI` / `AGENTE: Claude Code Worktree` / `AGENTE: Gemini`

2. **Cada instrucción debe incluir un paso de verificación** que el agente ejecute antes de reportar:
   - Type-check (`pnpm type-check`)
   - Build (`pnpm build`)
   - Tests si aplica (`pnpm test`)
   - Prueba funcional manual (describir qué probar en el navegador/API)
   - Leer los archivos modificados y confirmar que los cambios son correctos

3. **Cowork verifica independientemente** cada reporte antes de confirmar:
   - Leer archivos reales (nunca confiar solo en el reporte del agente)
   - Ejecutar verificación propia si hay dudas

4. **Gemini siempre reporta con evidencia**: código exacto, línea, archivo. Cowork verifica.

5. **Worktree**: worktree nuevo por fase/feature, merge --no-ff a main, luego eliminar worktree y branch.

### Rol de Gemini — Audit 1 (Fase 8) + Audit 2 (Fase 13)

**Audit 1** — Security Audit + Tests vitest. Integrados en commit acdcbce (Fase 8):
- `apps/web/lib/__tests__/utils.test.ts` — 20 tests (validarRUT, formatRUT, calcularIVA, formatCLP)
- `apps/web/lib/__tests__/reportes-fecha.test.ts` — 18 tests
- `apps/web/vitest.config.ts`
- **38/38 tests passing**

### Hallazgos de Seguridad (TODOS RESUELTOS en Fase 8)

| ID | Hallazgo | Severidad | Estado |
|----|----------|-----------|--------|
| C1 | `/api/productos` sin `auth()` | CRÍTICO | ✅ auth() + 401 agregado |
| C2 | URL hardcodeada en `packages/db/src/client.ts` | CRÍTICO | ✅ Eliminada, throw si no hay POS_DATABASE_URL |
| A1 | `NEXTAUTH_SECRET` débil por defecto | ALTO | ✅ `lib/check-env.ts` valida en prod + detecta "cambiar" |
| A2 | `authorized` callback sin RBAC | ALTO | ✅ `adminRoutes=["/usuarios"]` → redirect si rol ≠ ADMIN |
| M1 | Listado usuarios visible a no-ADMIN | MEDIO | ✅ Cubierto por fix A2 |
| M2 | `buscarProductos/Cliente` sin restricción | MEDIO | ✅ Accesibles solo con sesión válida (auth en server actions) |
| M3 | `xlsx` 0.18.5 CVEs | MEDIO | ✅ Migrado a exceljs ^4.4.0 — commit 04d32f7 |
| M4 | Login sin rate-limiting | MEDIO | ✅ TODO documentado en login/actions.ts (Upstash en prod) |
| B2 | bcrypt cost 10 | BAJO | ✅ Subido a 12 en crear y editar usuario |
| ~~B3~~ | ~~Sin índice en `fecha`~~ | ~~BAJO~~ | ❌ FALSO POSITIVO — `@@index([fecha])` ya existía desde Fase 1 |

**Audit 2** — Security review Fases 9-12. Resueltos en commit 7d36161:

| ID | Hallazgo | Severidad | Estado |
|----|----------|-----------|--------|
| G1 | Avatar route: 2MB check post-readBody DoS | ALTO | ✅ Content-Length pre-check + 413 |
| G2 | devoluciones $transaction: read sin lock → race condition | CRÍTICO | ✅ SELECT FOR UPDATE NOWAIT como primera op |
| G3 | formatCLP: `\u202f`/`\u00a0` → hydration mismatch React | MEDIO | ✅ `.replace(/[\u202f\u00a0]/g, " ")` |
| G4 | bcrypt timing attack en cambiarPassword | INFO | ❌ Falso positivo — opera sobre sesión propia |
| G5 | $queryRaw SQL injection / BigInt overflow en alertas | INFO | ❌ No aplica — template literal parametrizado |

**Audit 3** — OWASP Top 10 (commit `2b90ed8`): 2 gaps cerrados.

| ID | Hallazgo | Severidad | Estado |
|----|----------|-----------|--------|
| GAP-1 | Security headers faltantes (X-Frame-Options, HSTS, etc.) | ALTO | ✅ 5 headers en `next.config.ts` |
| GAP-2 | Sin observability en auth events | MEDIO | ✅ Sentry `login_failure` + `login_rate_limited` |

**Audit 4** — Producción hardening (commit `3bec5f5`): 2 gaps cerrados.

| ID | Hallazgo | Severidad | Estado |
|----|----------|-----------|--------|
| GAP-PROD-1 | `checkEnv` solo validaba presencia, no calidad | ALTO | ✅ `INVALID_SECRET_PATTERNS` + longitud mínima 32 + 10 tests |
| GAP-PROD-2 | Rate-limit silencioso en prod sin Upstash | MEDIO | ✅ `warnIfDisabledInProd` en login + API |

**Audit 5** — Gemini UX (commit `2d4f8ce`): mejoras visuales + a11y en icon-buttons (tooltips obligatorios).

**Fix crítico post-audit** — RBAC middleware edge (commit `81933a5`):
El callback `session` solo estaba en `auth.ts` (Node), el middleware edge no lo ejecutaba → `auth.user.rol` = undefined → `/usuarios` redirigía a `/` incluso para ADMIN. Fix: mover callback `session` a `auth.config.ts` (edge-safe). Validado E2E 4/4 Playwright. Detalle en [[auth-patterns#Pattern 2]].

**Suite de tests final: 68/68 passing** (commit `7e7444c` añade +11: 3 boundary checkEnv + 2 hydration safety formatCLP + 6 validarRUT edge cases)

> [!info] 3 falsos positivos verificados contra Gemini (documentados en [[security-owasp]])
> - **G4** — `cambiarPassword` "timing attack": N/A, opera sobre la sesión propia del usuario.
> - **G5** — `$queryRaw` "SQL injection": N/A, es template literal parametrizado (comentario aclaratorio en `apps/web/app/(dashboard)/alertas/actions.ts`).
> - **B3** — "sin índice en `fecha`": el índice `@@index([fecha])` existía desde Fase 1 en `schema.prisma`.

> **Regla crítica:** No confiar ciegamente en reportes — siempre verificar leyendo archivos reales. Ver [[agents-workflow#3. Cowork verifica independientemente]].

## Sesión 2026-04-26 — Sprint hardening F-2/F-3/F-5/F-9/F-10

**Contexto**: post-recovery de main con orphans + integración de paquete F-2/F-5 entregado por CLI paralelo + delegación explícita CEO ("hazlo tu, tienes acceso").

### Decisiones técnicas

- **Sentry edge/client privacy split**: `lib/privacy-edge.ts` (sin crypto, solo `truncateIP`) + redacción literal de emails en edge/client configs. Server config mantiene `pseudonymize()` con sha256 → ver gotcha 90.
- **F-3 soft-delete + AuditLog**: `Venta.deletedAt/deletedBy/deletionReason` + `AuditLog` model + `AuditAccion {CREATE,UPDATE,DELETE,RESTORE}`. Ley 21.210 SII obliga retención 6 años — soft-delete preserva trazabilidad. `restaurarVenta` ADMIN-only con validación de stock. `VENTAS_VISIBLES = { deletedAt: null }` en `lib/db-helpers.ts` para queries default.
- **F-9 split tender + caja**: `MetodoPago.MIXTO` (cache cuando `pagos.length > 1`) + `PagoVenta[]` + apertura/cierre con `Caja`/`AperturaCaja`/`MovimientoCaja` + Z-tape print-friendly. UI en `caja/{abrir,cerrar,movimientos/nuevo,[aperturaId]/cierre}`. `crearVenta` ahora resuelve apertura activa automáticamente.
- **Migraciones idempotentes**: `IF NOT EXISTS`, `ADD VALUE IF NOT EXISTS`, `DO $$ EXCEPTION WHEN duplicate_object` — gotcha 91.
- **F-2 hardening**: CSP completo en `next.config.ts` headers + rate-limit con `Promise.race(500ms)` fail-closed (antes era silently-pass) + `captureMessageSafe` wrappers que respetan `beforeSend` PII scrub.
- **F-5 CI/CD**: `ci.yml` reusable via `workflow_call` + branch protection vía `gh api PUT /repos/.../branches/main/protection` (5 secrets seteados desde Cowork con admin scope) + Dependabot tightening (gotcha 94).
- **F-10 mobile**: `app.json::ios.privacyManifests` (NSPrivacyTracking false + 2 RequiredReason APIs + 3 DataTypes para Apple) + Maestro YAML E2E + a11y labels.
- **Deploy-prod workflow fix**: removido push trigger, solo workflow_dispatch (gotcha 93).
- **Dependabot avalanche cierre**: 10 PRs cerradas + 2 SHA bumps mergeadas + config restringida solo a github-actions (gotcha 94).
- **Worktree rebase pattern**: F-9 worktree rebase a origin/main antes de squash-merge (gotcha 95).

### Pendientes user-only

- PR #3 merge: requiere `gh auth refresh -s workflow,repo,admin:repo_hook` (gotcha 92)
- Sentry DSN: pegar en GH secrets como `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN`
- Renovate App: install desde GitHub Marketplace
- EAS submit iOS: requiere Apple Developer account interactivo

## Sesión 2026-04-27 — Stabilization F-3+F-9 prod + UX polish

**Contexto**: post-merge de F-3+F-9 a prod, deploy expuso 2 incidentes runtime (schema desync + React #418) + ruido Sentry detectado + admin gap en UI cajas. Cierre con PR #3 Dependabot mergeada.

### Decisiones técnicas

- **Incidente schema desync prod (gotcha 96)**: deploy F-3+F-9 dejó BD sin columnas/tablas → P2022 → 500 en `/`. Causa: Dockerfile no copia `prisma/`, `deploy.sh` nunca aplicaba migrations. Fix definitivo: nueva fase 5b/6 que tar+scp+`migrate deploy` via container `node:22-alpine` ad-hoc unido a `pos-chile-network`. Migrations idempotentes (gotcha 91) hacen seguro re-correrlas.
- **PII en console.error pre-Sentry**: el `beforeSend` de Sentry pseudonimiza, pero `console.error(err)` con objetos Prisma escribe `meta.target` (email/rut) a stdout del container ANTES → si forwarder de logs (Datadog/journald) lo captura, leak. Fix en 3 callsites login: `error.name + ": " + error.message` only. Error completo va a Sentry filtrado. Comentario explícito en `error.tsx` del por qué NO usa `captureExceptionSafe` (gotcha 90).
- **Sentry filter "Error: aborted"**: abortIncoming Node http es ruido (browser cancela / Cloudflare health-check). `beforeSend` retorna null si match. Mejora signal-to-noise sin perder bugs reales.
- **Admin /cajas + /caja/movimientos auditoría**: cierra gap operativo de F-9 (antes requería SQL para gestionar registradoras y auditar movimientos). CRUD ADMIN-only en `/cajas`. `/caja/movimientos` con filtros (rango, tipo, caja, usuario, apertura, motivo) + 5 cards totales + cap 1000 filas. CAJERO ve solo sus aperturas.
- **`lib/nav-active.ts` longest-prefix**: resolución doble — `/caja` no matchea `/cajas` (boundary `/`) y `/caja/movimientos` gana sobre `/caja` (más específico). Reusable desde sidebar + mobile-nav.
- **Client components NO importan `@repo/db`** (gotcha 101): replicar enums local. Aplica también a futuros forms con enums (`Rol`, `MetodoPago`, `AuditAccion`).
- **React #418 + Recharts width(-1)**: timeZone "America/Santiago" explícito en `formatFechaHora` (`ultimas-ventas`) + sparkline gate de mount con `useEffect` (mismo pattern que `VentasChart` ya tenía).
- **Dependabot PR #3 mergeada**: actions/checkout 4.2.2 → 6.0.2. Confirma que el flujo Dependabot post-tightening (gotcha 94) funciona — solo bumps de github-actions, sin avalanche npm.
- **`.gitignore` artifacts Claude Code**: `.claude/launch.json` + `.claude/scheduled_tasks.lock` runtime-only.
- **Tab refocus jank UX (commit `24167c9`)**: bug reportado por usuario "al volver a la pestaña, la web tarda y se ve borrosa". Doble fix: (a) `backdrop-filter: blur` removido de surfaces always-on (header, sticky table headers, Recharts tooltips) — gotcha 103; (b) `unstable_cache` 5min sobre el `findUnique` del perfil en `(dashboard)/layout.tsx` con `revalidateTag(\`usuario:{id}\`)` agregado en 4 callsites de mutación — gotcha 104.
- **Reporte ejecutivo `reporte.md`** generado en raíz para entregar al CEO + Worktree. Documento vivo — appendear ahí en lugar de crear paralelos. (Tamaño actualizado en sesión 2026-04-28: 2.752 líneas, 11 secciones + 6 adendas — ver sesión siguiente).

### Pendientes user-only

- Verificar en prod browser que `/` carga sin error #418 ni warnings sparkline (smoke test post-deploy).
- Sentry dashboard: confirmar que "Error: aborted" ya NO aparece como issue.
- Si llegan más migraciones manuales: usar IDEMPOTENT defensive pattern (gotcha 91) — generar baseline solo desde `prisma migrate dev` cuando posible.
- 2 errores TS bloqueantes CI antes del primer push: `restaurar-boton.tsx` import `restaurarVenta` + `badge-styles.ts` falta `MIXTO`.
- Decidir si `reporte.md` se commitea como `docs(reporte): ...` separado o se mueve a `docs/reporte.md` permanente.

## Sesión 2026-04-28 — Cierre M0 mobile + audit consolidado pre-Fase 4

**Contexto**: bundle Metro mobile bloqueado durante 2 sesiones (NativeWind 4.2.x + SDK 54) finalmente diagnosticado y cerrado. CEO + Worktree pidieron audit profesional exhaustivo del estado completo (web + mobile + infra + brand + risk) antes de arrancar Fase 4. Sesión opera en modo **read-only/diagnóstico** por instrucción explícita del usuario ("solo encontrar, no actuar — el reporte es el contrato").

### Decisiones técnicas

- **Cierre M0 mobile (G-M43)**: stack válido SDK 54 + NativeWind = `nativewind@4.2.3` exact + `react-native-css-interop@0.2.3` como dep DIRECTA (pnpm symlinks no exponen transitivas a Metro) + `darkMode: "class"` simple + `important` removido. El downgrade previo a 4.1.23 era contraproducente porque rompía el `import "react-native-css-interop/jsx-runtime"` que hace `expo-router@6`. Bundle confirmado en Xiaomi Redmi Note 14 (24932ms / 1877 modules). Commits `225c7b5` + `82d7cc1` + `b4aa32a`.
- **`MetodoPago.MIXTO` drift packages/api-client (commit `82d7cc1`)**: el enum vivía en `packages/db` pero `packages/api-client` no había sido regenerado tras F-9 → mobile crashearía guaranteed la primera vez que recibiera una venta MIXTO desde la API. Fix puntual; queda gotcha sistémico pendiente sobre cómo sincronizar enums entre paquetes (candidato a script `pnpm gen:enums` o a generar el cliente desde OpenAPI/Prisma directamente).
- **Audit consolidado en `reporte.md` (untracked, 2.752 líneas, 6 adendas)**: 62 hallazgos críticos cubriendo 14 dimensiones técnicas (auth, security, db, perf, a11y, i18n, observability, deploy, testing, mobile, brand, legal, ops, risk). Estructura final:
  - Adenda I-IV: web + infra + cumplimiento legal Ley 19.628/21.719/21.210
  - **Adenda V (SS1-SS8)**: root cause APK mobile roto = 6-8 bugs simultáneos no un solo culpable (expo-font no cargado / `SafeAreaView` deprecated de `react-native` rompe login / AppState listener race con `initDb` / `SecureStore` puede colgar primera vez en APK / `DefaultTheme` React Navigation pinta blanco / tab bar `useColorScheme` contradice G-M38 / Network Security Config falta para HTTP / NativeWind+Hermes+new-arch edge case)
  - **Adenda VI**: gotchas operativos consolidados (sync enums packages, brand chaos 5 nombres, Int4 CLP overflow >$2.147B, 0 CHECK constraints en DB)
- **Plan F-1..F-15 distribuido**: tareas asignadas por owner (CEO=decisiones estratégicas D1-D5, Worktree=features grandes, Cowork=coordinación+verificación, CLI=quick wins infra/scripts, Pierre=copies+legal+placeholders DYSA). Día 1 = 15 quick wins (~6h, baja backlog 62→47).
- **Brand identity chaos detectado**: 5 nombres distintos en uso simultáneo (POS Chile / Dyon / Dy / SystemQR / zgamersa) entre web + mobile + dominios + Sentry org + Cloudflare R2. Bloquea submit Apple/Google porque el nombre del store debe coincidir con copy/legal. CEO debe decidir nombre canónico (D1).
- **Modo standby explícito**: tras entregar mensajes a CEO + Worktree, NO ejecutar más cambios hasta recibir instrucción (D1-D5 confirmadas / Worktree asigna primer item / Pierre entrega 5 placeholders DYSA para `/privacidad`). El reporte es el contrato — modificaciones futuras van como Adenda VII.

### Gotchas reforzados (no nuevos, pero validados en sesión)

- **G-M43 reemplaza G-M40** (que era falsa): el bundle no se rompía por NativeWind 4.2.x sino por la combinación de 3 problemas encadenados.
- **G-M40 marcada como OBSOLETA** en `pos-chile-mobile.md` línea 356.

### Pendientes user-only / próximos owners

- **CEO**: confirmar D1 (nombre canónico de marca) + D2 (proveedor SII e-boleta DTE) + D3 (Apple Developer + Google Play accounts) + D4 (presupuesto Pierre Legal Dysa para revisar policy) + D5 (timing F-8 SII vs F-11 mobile submit).
- **Worktree**: leer `reporte.md` completo (2.752 líneas) y asignar primer item de F-1..F-15 al CLI.
- **Pierre**: entregar 5 placeholders DYSA (razón social, RUT, dirección, email DPO, teléfono) para reemplazar en `apps/web/app/privacidad/page.tsx`.
- **CLI (cuando autorizado)**: ejecutar día 1 = 15 quick wins (M9n hooksPath relativo, sync MetodoPago entre paquetes, isDark=false default mobile, etc.).
- `reporte.md` sigue UNTRACKED — decidir si commitear como `docs/reporte-2026-04-28.md` o mantener volátil hasta que el plan F-1..F-15 esté en ejecución.

---

## Sesión 2026-04-28 / 29 — Cierre Día 1-5 + Pivot SaaS DyPos CL

**Contexto**: Worktree (rol Cowork por sesión) ejecuta 28 commits cubriendo
Día 1-5 del plan CCC + pivot estratégico a SaaS. Sesión maratónica que pasa
de "estabilizar mobile" → "establecer DyPos CL como producto comercial".

### Decisiones técnicas (28 commits, agrupadas)

**Día 1 — Quick wins (13 commits)**: M9c hook violation `_DebugLoadingBanner`,
M9d `.env.example` con NEXT_PUBLIC_SENTRY_DSN/URL/AUTH_SECRET, TURBO cache
fix (lint/type-check sin `^build`, inputs explícitos, globalEnv 12 vars),
infra Docker M9k (pgadmin pin 8.14) + M9l (mem_limit/cpus en 3 services) +
M9m (HEALTHCHECK Dockerfile), deps muertas M9g (web: @radix-ui/react-label,
@repo/ui, date-fns) + M9h (mobile: expo-image, expo-system-ui, victory-native
~3 MB bundle), CV1 follow-up MIXTO badge mobile, M9o avatar.tsx + stockBadge,
M9p circular dep cajas (extraer types.ts), PDF3+XLS1 sanitizeFilename helper,
CV2-3 split tender shared schema + clienteId nullable.

**Día 2 — SS1-SS6 mobile UX (6 commits)**: SS6 tab bar isDark=false fijo,
SS2 SafeAreaView import desde `react-native-safe-area-context`, SS3 AppState
listener movido a useEffect con cleanup + nuevo flag `syncStore.isReady`,
SS5 SystemQRTheme custom para React Navigation (background ivory en vez de
blanco), SS4 SecureStore.getItemAsync con timeout 3s race (evita app
colgada en Keystore corrupto), SS1 useFonts gate carga Inter 4 weights antes
del primer render. **Verificación visual real en device**: app instalada vía
push manual a `/sdcard/Download/` + open desde Mi File Manager (MIUI bloquea
adb install incluso con toggle USB Security ON), login renderizando con
tipografía Inter Bold + ivory background + SafeArea respetada.

**Día 3-4 — Schema hardening (4 commits)**: SCH3 partial unique
`AperturaCaja(caja_id) WHERE estado='ABIERTA'` + `MobileRelease(platform)
WHERE is_latest=true` (con limpieza pre-constraint de duplicados existentes),
SCH2 23 CHECK constraints DB-level (precio/stock/cantidad/montos
non-negative + descuentoPct entre 0-100 + monto pagos/devolución positivo),
F-3 extension soft-delete a Cliente + Devolucion + MovimientoCaja (3
columnas nuevas + FK SET NULL + helpers `CLIENTES_VISIBLES` /
`DEVOLUCIONES_VISIBLES` / `MOVIMIENTOS_CAJA_VISIBLES`), SCH1 INT→BigInt
deferred a F-8 SII sprint con guardrail intermedio: 4 CHECK constraints
con cap 1.5B CLP que fallan con error claro antes del overflow real
(2.147B), migration path documentado en SQL + schema.prisma.

**Día 5 — Testing infra (4 commits)**: jest-expo + 25 tests pasando + tsc
mobile 100% limpio (los 23 errores TS pre-existentes desaparecen tras
agregar @types/jest), CI mobile gate paralelo al `web` (job
`mobile (type-check + lint + test:ci)`), syncStore.test.ts + authStore.test.ts
con 21 tests críticos del path offline-first/auth, husky + lint-staged
versionados como DX1 (incluye hook funcionando end-to-end al primer commit
post-install).

**F-6 piloto (1 commit)**: setup global Vitest con `prismaMock`
(DeepMockProxy + vitest-mock-extended), `authMock`, `revalidatePathMock`,
auto-wire `vi.mock` para `@repo/db` / `@/auth` / `next/cache` /
`next/navigation`. 11 tests `crearVenta` happy + error paths (8 cubiertos)
sin tocar BD real. Total 91 tests web pasando.

**Pivot SaaS DyPos CL (3 commits)**:
- `scripts/backup-project.sh` — backup completo del proyecto a path
  externo con timestamp + git SHA + dirty flag, rotación N snapshots,
  exclusiones para que pese ~138MB en 5s (vs 6.5GB con node_modules +
  builds + .turbo + releases).
- `docs/VISION.md` + `docs/adr/001-arquitectura-saas-deployment-dedicado.md`
  + `docs/adr/002-multi-tenant-future-migration.md` — visión, decisión
  Camino C (deployment dedicado por cliente, no multi-tenant compartido),
  trigger explícito para migrar a Camino A (>20 clientes, costo VPSs
  >$250/mes, F-8 SII en 5+ clientes, coverage tests >70%, CEO confirma).
- `docs/PRICING-STRATEGY.md` (research mercado SMB Chile + 3 planes
  $24.990/$44.990/$84.990) + `docs/SALES-PHILOSOPHY.md` (mobile NO edita
  ventas, anti-fraude documentado) + `LICENSE` (propietaria con DPO
  Pierre Benites Solier — `private@zgamersa.com`) + `SECURITY.md`
  (canal disclosure, scope, SLAs por severidad, cumplimiento Ley 19.628 +
  21.719). Identidad oficial: producto **DyPos CL**, owner **Pierre
  Benites Solier**, empresa **Dyon Labs**, atribución commits
  `Co-Authored-By: Ulmer Solier <bpier@zgamersa.com>` (a partir de
  commit `03e8a66+`; history previa con Co-Authored-By Claude se
  mantiene como rastro honesto).

### Gotchas nuevos detectados (G-M45 a G-M50)

- **G-M45 — pnpm path en `transformIgnorePatterns` de jest-expo**:
  las deps reales viven en `node_modules/.pnpm/<pkg>@<ver>_<hash>/node_modules/<pkg>/`.
  El regex default no las matchea (espera `node_modules/<pkg>/`), causa
  `SyntaxError: Cannot use import statement outside a module` en
  `react-native/jest/setup.js` y `expo-modules-core/.../*.ts`. Fix:
  prefix opcional `(?:.*?node_modules/)?` antes de la lista de paquetes
  + patrón `[\\w-]*` para cubrir scopes (`expo-*`, `@expo/*`,
  `@react-native-*`).
- **G-M46 — jest-expo 54 incompatible con jest 30**: peer dep wants
  `^27 || ^28 || ^29`. Pin `jest@^29.7.0` + `@types/jest@^29.5.14` o
  romperá con `jest-watch-typeahead` peer warning + posibles fallos
  runtime.
- **G-M47 — APK install bloqueado por MIUI Security incluso con
  toggle "USB Security" ON**: `adb install` retorna
  `INSTALL_FAILED_USER_RESTRICTED`. Workaround verificado: `adb push
  apk /sdcard/Download/` + abrir manualmente desde Mi File Manager.
  Posiblemente requiere SIM activa + Mi account logueada en Xiaomi
  para destrabar.
- **G-M48 — Dev build mobile sin Metro corriendo se queda en splash**:
  el APK dev build (`expo run:android`) NO embebe el bundle JS, lo
  descarga de Metro al arrancar. Si Metro no está up + `adb reverse
  tcp:8081 tcp:8081` no está activo, app queda en logo. Para test en
  device con APK release real, usar `expo build` o EAS Build (que
  embebe bundle).
- **G-M49 — Branch protection main bloquea push directo si hay status
  check requerido pendiente**: `web (type-check + lint + test + build)`
  exigido. Workaround temporal: bypass habilitado para push directo,
  pero hoy 2026-04-29 falló silenciosamente sin mensaje. Investigar
  mañana — posiblemente race con CI run anterior incompleto.
- **G-M50 — `DyPos CL` es la marca canónica**, no más `POS Chile` /
  `SystemQR` / `Dysa POS` / `pos-chile`. Pendiente Bloque 3 mañana
  para find/replace en código (UI, README, package.json, app.json
  mobile manifest). Mientras tanto la documentación SaaS ya usa el
  nombre correcto.

### Estado final sesión

- **Commits totales**: 28 (Día 1: 13 / Día 2: 6 / Día 3-4: 4 / Día 5: 4
  / SaaS pivot: 3) + 2 commits memory previos = 30 commits sesión.
- **Backlog**: 62 → 31 ítems críticos (-50%).
- **Tests**: mobile 0 → 46, web 80 → 91. CI gate web + mobile activos.
- **Schema DB**: 0 → 27 CHECK constraints + 2 partial uniques + 4 modelos
  con soft-delete + 4 guardrails Int4.
- **Docs estratégicos**: VISION + 2 ADRs + LICENSE + SECURITY +
  PRICING-STRATEGY + SALES-PHILOSOPHY + decisiones autoritativas
  en `memory/decisions/2026-04-29-saas-pivot-decisions.md`.
- **Backup script** funcional + verificado.
- **Push pendiente**: 3 commits locales (`03e8a66`, `4b10aa8`,
  `01571d0`) — falla por branch protection, retomar mañana.

### Bloques pendientes para próxima sesión (mañana)

🔴 **Bloque 3 (Branding)**: find/replace en código y configs.
- `apps/web/app/login/page.tsx` y headers → "DyPos CL"
- `apps/mobile/app.json` (`name`, `slug`, `displayName`) → "DyPos CL"
- `apps/mobile/app/(auth)/login.tsx` título → "DyPos CL"
- `package.json` raíz `name` (¿`dypos-cl-monorepo`?)
- README.md raíz reescrito profesional
- PWA manifest web

🔴 **Bloque 4 (Multi-tenant prep)**: `scripts/provision-tenant.sh` que
genere para un cliente nuevo:
- Carpeta `~/Dyon-Tenants/<slug>/` con docker-compose.yml + .env.docker
  pre-poblado
- Postgres seed inicial (admin user, IVA 19% Chile, monedas CLP)
- DNS subdominio (manual o via API Cloudflare si aplica)
- APK build con branding

🔴 **Bloque 5 (UI admin mobile releases + nginx APK)**:
- `/dashboard/mobile-releases` con form upload + form publicar
- nginx vhost `apk-dypos.zgamersa.com` servir `/var/www/apks/`

🔴 **Bloque 6 (Mobile gaps)**:
- Editar cliente desde mobile (PATCH `/api/v1/clientes/:id`)
- Editar perfil propio completo (nombre + avatar, no solo password)

🔴 **Bloque 7 (Deploy a prod)**:
- `scripts/backup-project.sh` antes
- `./scripts/deploy.sh` con todo lo acumulado
- Verificación browser incógnito gotcha 77

🔴 **Bloque 8 (cierre)**:
- Resolver branch protection push fallido
- `/session-end` final + push

### Notas para Cowork al iniciar próxima sesión

1. **Cargar PRIMERO** `memory/decisions/2026-04-29-saas-pivot-decisions.md`
   — todo el contexto SaaS está ahí.
2. **NO re-preguntar** las 8 decisiones — Pierre las contestó.
3. **Continuar desde Bloque 3** (branding) — tiene mayor dependencia
   downstream.
4. **Verificar** que la web actual `dy-pos.zgamersa.com` siga ON y
   funcional (es la demo del owner para prospects).
5. **Push fallido** — investigar GitHub branch protection antes de
   intentar más commits.

---

## Sesión 2026-04-30 (continuación) — Fase 0 audit Codex

**Contexto**: nuevo agente Codex auditó el estado post-Bloques 3-7 SaaS
pivot y propuso Fase 0 "cierre de deudas críticas antes de nuevas
features". 8 preguntas con respuestas verificadas + plan de 7 sub-fases.
Pierre adoptó el plan; ejecución completa en una sesión.

### Smoke prod inicial (Codex requirement, antes de tocar código)

Ejecutado vía Claude_in_Chrome MCP con browser real (no curl).
Fecha/hora: 2026-04-30 19:20-19:45 CLT.

- Login admin (admin@pos-chile.cl / admin123) ✅ + Logout ✅
- Login cajero (cajero@pos-chile.cl / cajero123) ✅
- /, /caja, /ventas como admin ✅
- /mobile-releases admin → UI publicar + listing 4 releases reales ✅
- /mobile-releases cajero → redirect /?error=admin-required (RBAC) ✅
- /caja cajero → flujo "Abrir caja Mistura 1 — Santa Isabel" ✅
- /api/health → DB connected, version 2.0.0 ✅
- Branding "DyPos CL" + sidebar correcto + dark mode ✅

### Bug crítico detectado por Codex y fixeado (Fase 0.1)

`editarVenta` actualizaba subtotal/total/detalles pero NO PagoVenta[],
montoRecibido, ni vuelto. Editar venta MIXTO de $100k → $80k dejaba
los pagos sumando $100k → invariante `total === sum(PagoVenta.monto)`
violada silenciosamente. Reportes Z desbalanceados, riesgo fraude.

Fix en commit `4b2e6cc` (apps/web/app/(dashboard)/ventas/actions.ts):
replicada lógica `crearVenta` líneas 180-230 dentro de editarVenta.
En el `$transaction` ahora `tx.pagoVenta.deleteMany` precede a
`tx.venta.update` con nested create de pagos nuevos. Suma validada,
metodoPago rollup recalculado (MIXTO si pagos > 1), vuelto y
montoRecibido recalculados si hay efectivo.

### Commits Fase 0 (5 commits)

- **`4b2e6cc`** fix(ventas) editarVenta + 33 tests F-6 (Fase 0.1+0.2):
  - editarVenta sincroniza pagos
  - editarVenta.test.ts (8 tests del invariante)
  - eliminarVenta.test.ts (7 tests soft-delete + audit)
  - restaurarVenta.test.ts (8 tests RESTORE + admin gate)
  - crearDevolucion.test.ts (10 tests parcial/total/edge cases)

- **`ae99b53`** fix(infra) backup BD auto + CI push a main (Fase 0.3+0.4):
  - deploy.sh nuevo step "5a-bis Backup BD prod" con pg_dump | gzip a
    /var/backups/dypos-cl-db/pre-deploy-YYYYMMDD-HHMMSS.sql.gz, chmod
    600, rotación últimos 14 dumps. Path impreso en logs explícitamente
    + comando restore manual. Cierra G-M53.
  - ci.yml trigger agregado a push a main (antes solo PRs y feature/*).
    Ahora CI corre real en cada push y branch protection se cumple
    naturalmente.

- **`2d508d6`** feat(infra) bind mount /var/www/apks en pos-web (Fase 0.5):
  - docker-compose.yml volumes para servicio web.
  - VPS: mkdir + chown 1001:1001 /var/www/apks/{android,ios}.
  - VPS: nginx vhost /etc/nginx/sites-available/apk-dypos en HTTP 80
    (SSL pendiente DNS+certbot manuales).

- **`a9bfb8d`** fix(ci) set env vars en step Test web (Fase 0.4 follow-up):
  - POS_DATABASE_URL + NEXTAUTH_SECRET mock en CI Test step. Bug
    detectado al activar trigger main: el factory `vi.mock("@repo/db")`
    hace `importActual` → ejecuta el módulo real → exige las env vars.

### Verificaciones Fase 0 (todos los exit criteria de Codex)

| Criterio | Status | Evidencia |
|---|---|---|
| Smoke prod inicial | ✅ | admin + cajero + RBAC + 5 rutas + health |
| Bug split tender corregido | ✅ | actions.ts fix + 8 tests editarVenta |
| Tests críticos agregados | ✅ | 33 tests nuevos, 125/125 web pasando |
| Backup BD auto verificado | ✅ | pre-deploy-20260430-185958.sql.gz 26 KB |
| CI corregido | ✅ | Run 25193364714 web+mobile ✅ en main |
| nginx APK | 🟡 | vhost + bind mount OK, DNS+SSL pendientes manual |
| Deploy prod exitoso | ✅ | health 200, version 2.0.0 post-deploy |
| Smoke final | ✅ | /mobile-releases UI live con 4 APKs reales |

### Gotcha nuevo

- **G-M54 (Vitest + Prisma client + CI env vars)**: cuando
  `vi.mock("@repo/db", async () => { const actual = await
  vi.importActual(...) })` se invoca en setup global para preservar
  enums, el `importActual` ejecuta el módulo real `@repo/db/src/client.ts`
  que valida `POS_DATABASE_URL`. En CI sin esa env var, el mock falla.
  Fix: setear POS_DATABASE_URL + NEXTAUTH_SECRET mock en step Test del
  workflow (mismo patrón que ya hace step Build). URLs mock OK porque
  Prisma client real nunca conecta en tests.

### Hallazgos extra del smoke

- Sistema POS prod tiene datos reales: 2 ventas históricas
  (B-20260428-Z0RU6R3N + B-20260426-D202CTEX), 1 caja "Mistura 1 —
  Santa Isabel", 4 mobile releases ya publicadas (v1.0.1 → v1.0.3
  con v1.0.3 latest, fixes documentados en notes).
- Avatar custom admin (gotcha 13 base64) funcionando.
- Dark mode usuario persistido.

### Pendientes operacionales no-código (Pierre)

🟡 **DNS Cloudflare**: agregar A record `apk-dypos` → IP VPS
   (proxied ON). Sin esto, apk-dypos.zgamersa.com retorna NXDOMAIN.

🟡 **SSL Let's Encrypt** (post-DNS):
   `ssh root@VPS && certbot --nginx -d apk-dypos.zgamersa.com \
   --email private@zgamersa.com --agree-tos -n`
   certbot edita el vhost agregando SSL automáticamente.

🟡 **Re-deploy con docker-compose.yml updated** (commit 2d508d6):
   El bind mount `/var/www/apks` se aplicó hoy con el deploy.
   Verificado: `docker inspect pos-web --format '{{.Mounts}}'` muestra
   el mount activo.

### Fase 0 Status Final

**100% cerrada** según exit criteria. Pendientes son operacionales
externos (DNS Cloudflare + SSL) que el script de deploy NO puede
hacer porque requieren credenciales que no están en el VPS.

Backlog: 27 → 23 ítems críticos. Total acumulado desde audit inicial:
62 → 23 (-63%).

---

## Sesión 2026-04-30 — Cierre Bloques 3-7 SaaS pivot DyPos CL

**Contexto**: continuación de la sesión 2026-04-29. Pierre confirmó las 8
respuestas a la planeación SaaS. Ejecución sistemática Bloques 3-7 + cierre.

### Decisiones técnicas y commits

**Workaround del push (G-M51)**: ayer el `git push origin main` falló
silenciosamente. Investigado hoy: `osxkeychain` interactive prompt sin TTY
hace que git push se cuelgue. Fix verificado: `GIT_TERMINAL_PROMPT=0
GIT_ASKPASS=true git push origin main --porcelain`. Sirve para automation
y CI. Documentado en gotcha G-M51 abajo.

**Bloque 3 — Branding (commit `7bbf9d7`)**: rebrand find/replace en 20
archivos (apps/web + apps/mobile + package.json root). Todos los nombres
flotantes ("POS Chile", "pos-chile", "SystemQR", "Dysa POS") → "DyPos CL"
en UI visible y "dypos-cl" en slugs. Decisión técnica: NO se cambian los
IDs técnicos `slug: "pos-chile-mobile"`, `scheme: "poschile"`,
`bundleIdentifier: "cl.zgamersa.poschile"` porque cambiarlos = nueva app
en stores + reset data del APK ya instalado en device físico de Pierre.
Cuando se publique a Play/App Store, decidir vía ADR si mantener IDs
legacy o migrar a `cl.dyonlabs.dyposcl`.

**Bloque 4 — provision-tenant.sh (commit `1af557b`)**: script bash
~520 líneas que automatiza creación de un cliente nuevo con su propio
Docker Compose en `~/Dyon-Tenants/<slug>/`. Genera 5 archivos:
docker-compose.yml (con puertos únicos calculados por hash MD5 del slug
% 100 para offset 0-99), .env.docker (con secretos rotables generados
con openssl rand -base64 32), seed-admin.sql (INSERT idempotente),
tenant-info.json (metadata para soporte), README.md (operación cliente).
Validaciones: slug kebab-case, RUT formato CL, plan en {starter, pro,
business}. Verificado generando demo "ferreteria-demo" con éxito.

**Bloque 5 — UI admin mobile releases + nginx runbook (commit `48f369b`)**:
- `/dashboard/mobile-releases` con 3 server actions (publicarRelease,
  eliminarRelease, marcarLatest) + form upload APK + listing por
  plataforma con badges latest/build/minVersion. Solo accesible para
  rol ADMIN. APKs guardados en `APK_STORAGE_DIR` (default
  `/var/www/apks/<platform>/`). Anti-rollback check (versionCode debe
  ser mayor al latest actual). Max 100 MB por APK.
- `docs/setup/nginx-apk-distribution.md` — runbook completo para
  configurar el subdominio `apk-dypos.zgamersa.com`: DNS Cloudflare,
  vhost nginx con SSL Let's Encrypt, MIME types, cache headers, bind
  mount Docker → host filesystem (UID 1001), troubleshooting, backup
  con rclone a R2.
- nav-config.ts entry "Mobile APK" en grupo Administración (admin only).

**Bloque 6 — Mobile editar cliente + perfil (commit `b3ccf4e`)**: cierra
gap reportado por owner. App móvil ya permitía CREAR cliente y CAMBIAR
password, pero NO permitía editar campos básicos:
- 2 schemas nuevos en `@repo/api-client`: ActualizarClienteRequestSchema
  (RUT inmutable) + ActualizarUsuarioMeRequestSchema (solo nombre por
  ahora; email es identificador login JWT subject).
- Rename `apps/mobile/app/(tabs)/mas/clientes/[id].tsx` →
  `[id]/index.tsx` para habilitar sub-rutas en expo-router.
- Nueva pantalla `[id]/editar.tsx` con form pre-poblado, validaciones
  cliente-side (email, nombre obligatorio), manejo 404/422/400 con
  Alerts específicos. RUT mostrado read-only con explicación.
- Botón "Editar cliente" agregado al detalle.
- Perfil mobile: edición inline del nombre con TextInput + Guardar/
  Cancelar. Email read-only con texto explicativo. Avatar (mobile)
  queda DEFERRED como follow-up: requiere `expo-image-picker` no
  instalado, base64 ~50-100 KB inflaría JWT/sessión, necesita
  validación tamaño + recorte.

**Bloque 7 — Deploy a prod**:
- Backup BD prod manual antes (25 KB sql.gz en /tmp del VPS).
- Backup local del proyecto: 143 MB en 5s.
- `./scripts/deploy.sh` ejecutado. Las 4 migrations (SCH3 + SCH2 + F-3
  ext + SCH1 guardrail) aplicaron limpio en producción.
- Smoke test desde VPS: `pos-web Up healthy`, `/api/health` retorna
  `{"status":"ok","database":"connected","version":"2.0.0"}`.
- `.env.docker` actualizado con APK_STORAGE_DIR + APK_PUBLIC_BASE_URL
  (gitignored, no commiteado).

### Gotchas nuevos

- **G-M51 (git push hang con osxkeychain)**: cuando git push pide
  credenciales y no hay TTY (background tasks, scripts no-interactivos),
  el comando se cuelga indefinidamente. Workaround verificado:
  `GIT_TERMINAL_PROMPT=0 GIT_ASKPASS=true git push origin main`. La
  combinación deshabilita el prompt interactivo y obliga a usar
  credenciales ya guardadas en keychain. Si las credenciales están
  inválidas, falla limpio con exit 1 en lugar de colgarse.

- **G-M52 (deploy.sh prompts dobles)**: el script pide 2 confirmaciones
  ("¿Correr build local?" y "¿Proceder con deploy?"). Para automation:
  `printf 'n\ndeploy\n' | ./scripts/deploy.sh`. La 'n' al primer
  prompt skipea el build local; "deploy" al segundo confirma.

- **G-M53 (deploy.sh NO backupea BD prod)** — **SUPERSEDED / CERRADO en
  Fase 0.3 (commit `ae99b53`)**. `scripts/deploy.sh` ahora hace `pg_dump`
  automático en fase 5a-bis antes de `prisma migrate deploy`, con
  rotación a 14 dumps en `/var/backups/dypos-cl-db/`. Ya NO es un gotcha
  activo. Ver `docs/architecture/deploy-ops.md §4` y `database.md §3`.

### Estado final sesión

- Commits hoy: 4 (Bloque 3-6) + 1 push pendiente del workaround push.
- Backlog: 31 → 27 ítems críticos (-13%). Total acumulado: 62 → 27
  desde el audit inicial (-56%).
- Tests: web 91 + mobile 46 = 137 pasando. tsc verde web + mobile.
- **Producción deployada con todo el stack actualizado**. Las migraciones
  SCH2/SCH3/F-3 ext/SCH1 ahora viven en prod.
- UI mobile releases ya disponible en `/dashboard/mobile-releases`
  cuando se complete el setup nginx (manual, runbook listo).
- Script provision-tenant.sh listo para crear el primer cliente real.

### Pendientes operacionales (manuales, no código)

🟡 **Setup nginx + DNS** para `apk-dypos.zgamersa.com`:
- Cloudflare DNS A record
- nginx vhost (config en runbook)
- SSL Let's Encrypt: `certbot --nginx -d apk-dypos.zgamersa.com`
- mkdir + chown /var/www/apks/{android,ios} (UID 1001)
- bind mount en docker-compose.yml prod: `/var/www/apks:/var/www/apks`

🟡 **F-13 Sentry mobile** sigue diferida — requiere rebuild APK +
crear proyecto Sentry. Cuando Pierre tenga tiempo de reinstalar APK
en Xiaomi.

🟡 **F-8 SII e-boleta** sigue diferida — requiere RFC 4 proveedores DTE
(OpenFactura, Haulmer, SimpleAPI, Bsale API) + decisión Pierre. 6-8
semanas calendario, no es código.

🟡 **F-6 tests web restantes** — eliminarVenta + crearDevolucion.
Setup F-6 ya está commiteado, escribir esos 2 tests es trabajo de
2-3h sesión dedicada.

🟡 **`reporte.md` untracked** — sigue siendo gestionado por CCC, no
commitear desde Cowork.

---

## Sesión 2026-04-30 · Fase 1 — Arquitectura Oficial cerrada

**Contexto:** Codex aprobó cierre de Fase 0 y autorizó Fase 1 con alcance
docs-only: crear el manual maestro técnico de DyPos CL como fuente de
verdad estructural del sistema.

### Decisiones técnicas

1. `reporte.md` se reubica como `docs/audits/audit-2026-04-28.md` con
   header `SUPERSEDED` apuntando a `memory/projects/pos-chile-monorepo.md`
   y `docs/architecture/README.md` como fuentes vigentes. Se preserva
   contenido íntegro para trazabilidad histórica.

2. `docs/architecture/` queda como **fuente de verdad arquitectónica**
   del sistema. 9 documentos:
   - `README.md` — visión general + diagrama Mermaid stack completo.
   - `frontend.md` — Next.js 15 RSC, Tailwind v4, shadcn/ui.
   - `backend.md` — Server Actions, API v1 REST, NextAuth, contratos Zod.
   - `database.md` — Prisma 6, soft-delete, AuditLog, 6 migrations.
   - `mobile.md` — Expo SDK 54, stores zustand, sync offline-first.
   - `deploy-ops.md` — `scripts/deploy.sh` con backup auto + rollback.
   - `tenant-provisioning.md` — Camino C SaaS dedicado.
   - `testing-ci.md` — Vitest + Jest + GitHub Actions.
   - `decision-log.md` — ADRs vivos + 10 items `DECISION_REQUIRED`.

3. `docs/README.md` actualizado como índice navegable apuntando a
   `architecture/`, `adr/`, `audits/`, runbooks, etc.

4. Cada doc separa explícitamente **tareas Pierre vs agentes** y lista
   gotchas activos por área. Items que requieren input humano marcan
   `DECISION_REQUIRED` en `decision-log.md` (10 abiertos: branch
   protection, cobertura, e2e mobile, push, OTA, monitoreo externo,
   smoke automatizado, CSV import, pgbouncer, retención backups).

### Verificación gate

- `pnpm --filter web type-check` ✅
- `pnpm --filter @repo/mobile type-check` ✅
- `pnpm --filter web lint` ✅
- `pnpm --filter @repo/mobile lint` ✅
- `pnpm --filter web test` → **125 / 125** ✅ (con Node 22)
- `pnpm --filter @repo/mobile test` → **46 / 46** ✅
- `pnpm --filter web build` ✅

### Gotcha nuevo registrado

🟡 **G-NODE22** — Tests web (vitest 4 + rolldown) requieren Node 22+
local. Node 18 falla con `SyntaxError: 'styleText' not exported from
node:util`. CI ya usa Node 22; localmente: `nvm use 22` antes de
correr suite. No es bug del repo.

### Commits

- `aa3e2f5` — `docs(architecture): Fase 1 — manual maestro técnico DyPos CL`

### Estado al cierre

✅ Fase 0 cerrada (sesión anterior, 2026-04-30).
✅ Fase 1 cerrada — manual maestro técnico vivo en `docs/architecture/`.

---

## Sesión 2026-04-30 · Fase 2A — Ops/Infra externa cerrada

**Contexto:** Codex aprobó cierre Fase 1 con dos ajustes menores
(corregir fecha "2026-04-29" → "2026-04-30" en sesión anterior; marcar
G-M53 explícitamente como SUPERSEDED) y autorizó Fase 2A como bloque
docs+template-only para cerrar deuda operacional externa.

### Ajustes menores aplicados

- Fecha corregida: "Sesión 2026-04-29" → "Sesión 2026-04-30" para Fase 1.
- G-M53 reescrito en memory como SUPERSEDED/CERRADO (Fase 0.3, commit
  `ae99b53`), no como gotcha activo. En docs ya estaba marcado closed
  en `database.md`, `deploy-ops.md` y `decision-log.md`.

### Decisiones técnicas Fase 2A

1. **DR-11 fundamentado** — inspección directa del contenido:
   - `AGENTS.md` (213 líneas) = clon de `CLAUDE.md` con sólo 9 líneas
     distintas (rename "Claude" → "Codex", path `.claude/` → `.Codex/`).
     Sin secretos. **Recomendación:** versionar como stub que referencie
     `CLAUDE.md` para evitar drift; preserva descubribilidad para Codex
     sin duplicar reglas.
   - `.agents/skills/` = 65 skills genéricos del Devlmer Ecosystem
     Engine (`algorithmic-art`, `brand-identity`, `code-reviewer`...).
     No específicos al proyecto. **Recomendación:** gitignore.
   - `.codex/` = runtime local Codex (15 agentes `.toml` + 3 hooks
     genéricos + `hooks.json` con linters PHP/Python/TS). **Recomendación:**
     gitignore.
   - Pierre confirma; agente NO aplica gitignore aún sin veredicto.

2. **DR-12 formalizado** — Sentry mobile con plan completo de 9 pasos
   (proyecto Sentry, DSN custodia, config Expo, sourcemaps, rebuild APK,
   reinstall device, crash test, doc release flow). Trabajo: 2h agente
   + 30min Pierre. Gatillo: ventana libre con device a mano.

3. **Checklist externo creado** — `docs/operations/external-setup-checklist.md`
   con 8 secciones (DNS, SSL, validación APK, branch protection,
   UptimeRobot, off-site backup, custodia credenciales, estado al cierre).
   Cada paso incluye comandos exactos, validación, y formato de reporte.

4. **Script backup off-site preparado** — `scripts/backup-offsite.sh`
   como template S3-compatible (B2/S3/Wasabi/R2). Falla rápido si faltan
   `OFFSITE_BACKUP_*` en `.env.docker`. Incluye procedimiento restore-test
   mensual. **No ejecutable** hasta que DR-10 cierre con provider elegido.

5. **`docs/README.md`** actualizado con `operations/` en el índice.

### Lo que NO se hizo (intencional)

- ❌ No se tocaron Cloudflare DNS, GitHub Settings, ni provider externo
  alguno — son tareas exclusivas de Pierre por custodia de credenciales.
- ❌ No se aplicó `.gitignore` de `.agents/`/`.codex/`/`AGENTS.md` —
  Pierre debe confirmar veredicto DR-11 primero.
- ❌ No se ejecutó `backup-offsite.sh` — DR-10 requiere decisión Pierre.
- ❌ No se rebuild APK ni se tocó Sentry — DR-12 requiere ventana
  device + DSN Pierre.
- ❌ No features nuevas. No SII. No CSV import. No UX polish.

### Verificación gate

- `pnpm --filter web type-check` ✅
- `pnpm --filter web lint` ✅
- `pnpm --filter @repo/mobile type-check` ✅
- `pnpm --filter @repo/mobile lint` ✅
- `bash -n scripts/backup-offsite.sh` ✅
- Tests + build no afectados (último gate completo verde en commit
  `aa3e2f5` de Fase 1 — cambios Fase 2A son docs + shell exclusivos).

### Commits

- `b60f0f3` — `docs(ops): Fase 2A — checklist externo Pierre + DR-11/DR-12 + backup-offsite template`
- `8611c5e` — `fix(ops): Fase 2A patch — keyword UptimeRobot real + path VPS consistente`

### Patch Fase 2A (post-review Codex)

Codex detectó dos inconsistencias operativas que se corrigieron antes
de aceptar Fase 2A:

1. **Keyword UptimeRobot incorrecta**: el checklist proponía `"ok":true`
   pero `/api/health` real (`apps/web/app/api/health/route.ts`) responde
   `{"status":"ok","database":"connected","version":"2.0.0"}`. Corregido
   a `"status":"ok"` con fallback documentado a "solo HTTP 200" si
   UptimeRobot no matchea JSON compacto.

2. **Path VPS inconsistente**: `deploy.sh:24` usa
   `VPS_DIR="/opt/pos-chile"` (path real vigente) pero el checklist,
   `backup-offsite.sh`, `tenant-provisioning.md` y `deploy-ops.md`
   usaban `/opt/dypos-cl`. Riesgo: Pierre copia un cron y falla en
   prod. Fix:
   - `scripts/backup-offsite.sh`: `APP_DIR="${APP_DIR:-/opt/pos-chile}"`
     configurable; `ENV_FILE` deriva de `APP_DIR`. Tenants futuros
     pueden override sin tocar el script.
   - Todas las refs `/opt/dypos-cl` en docs y scripts → `/opt/pos-chile`
     (verificado: 0 ocurrencias residuales).

3. **Bonus**: comentarios de restore-test en `backup-offsite.sh` ahora
   consultan tablas Postgres reales (snake_case por `@@map` en
   schema.prisma) — `ventas`, `productos`, `clientes`, `audit_logs`
   en una query con `UNION ALL` — no nombres de modelos Prisma como
   `"Venta"` que no existen en Postgres.

Gate post-patch: `bash -n` OK, `type-check` web + mobile OK.

### Estado al cierre

✅ Fase 2A cerrada — toda la deuda operacional documentada en formato
   accionable para Pierre. 6 items operacionales pendientes son
   estrictamente "credentials-required", no técnicos.

🟡 **Bloqueo crítico**: Pierre debe ejecutar items 1-6 del checklist
   externo (DNS, SSL, branch protection, UptimeRobot, decisión backup
   provider) para que DyPos CL sea operable como SaaS serio multi-tenant.

🟢 Próxima fase libre: 2B (backend hardening) / 2C (UX polish) /
   2D (mobile + Sentry) — depende de qué priorice Pierre.

---

## Sesión 2026-04-30 — DR-11 cerrado por Pierre/Codex

**Contexto:** tras Fase 2A, Pierre pidió que Codex actuara sobre las tareas
de dueño que sí estaban disponibles en el repo local.

### Decisión DR-11

- `.agents/` queda en `.gitignore` porque contiene 65 skills genéricos del
  Devlmer Ecosystem Engine, no artefactos específicos del producto DyPos CL.
- `.codex/` queda en `.gitignore` porque es runtime local de Codex (agentes
  `.toml` + hooks), no fuente del producto.
- `AGENTS.md` se versiona como stub breve que apunta a `CLAUDE.md` como
  fuente canónica. La copia completa anterior duplicaba reglas y podía
  divergir de `CLAUDE.md`.

**Estado:** DR-11 cerrado. No se tocaron Cloudflare, GitHub Settings,
UptimeRobot ni off-site backups porque requieren credenciales externas de
Pierre.

---

## Sesión 2026-04-30 · Fase 2B-P0 — Backend/API hardening cerrada

**Contexto:** Codex aprobó Fase 2B-P0 con alcance acotado tras un
mini-audit de los 18 endpoints `/api/v1/*` que detectó (entre otros)
que `POST /api/v1/ventas` carecía de idempotency — riesgo de ventas
duplicadas en escenario `syncStore` mobile retry tras red inestable.
Q1-Q4 respondidas: idempotency solo en ventas; envelope estándar
`{ error, code?, details? }` con 10 códigos canónicos; tests de
contrato dentro del sprint; `Idempotency-Key` reutiliza `row.id`
(nanoid existente en `sync_queue`) — sin migración SQLite.

### Decisiones técnicas

1. **Store idempotency híbrido** (`apps/web/lib/idempotency.ts`):
   Upstash Redis si está configurado (SETNX atómico, TTL 24h, prod);
   memoria in-process como fallback (dev/CI/prod sin Upstash —
   degradación documentada). In-flight lock para concurrencia con
   polling 5s. Status <500 se cachea (incluyendo 4xx negocio
   determinístico); 5xx no se cachea para permitir retry.

2. **Envelope estándar `{ error, code?, details? }`** con 10 códigos
   canónicos en type `ApiErrorCode`. `error` siempre presente
   (backwards compat). `details` para Zod preserva `issues[]`
   estructurado (path + message + code) — no string aplanado.

3. **`jsonError` extendido** mantiene compat: firma vieja
   `jsonError(message, status)` sigue funcionando. Nueva firma
   `jsonError(message, status, opts)` agrega `{ code, details, headers }`.

4. **`jsonZodError(zodError)`** nuevo helper: emite 422 +
   `code: "VALIDATION_FAILED"` + `details.issues[]`. Convención
   REST: 400 = body NO JSON; 422 = JSON válido + Zod fail.

5. **`withIdempotencyResponse(request, scope, userId, handler)`**
   wrapper de alto nivel. Sin header → ejecución directa (graceful
   degradation pre-2B). Con header → dedupe via store. Header
   `Idempotent-Replay: true` en cache hit.

6. **`POST /api/v1/ventas`** refactor: lógica core extraída a
   `createVenta(args)` que retorna `{ status, body }` — habilita
   wrapping idempotency. Body no-JSON → 400 + VALIDATION_FAILED.
   Zod fail → 422 + VALIDATION_FAILED + details.issues. Errores de
   negocio (caja cerrada, stock, producto) etiquetados con
   `code: BUSINESS_RULE`.

7. **Mobile `db/sync.ts`**: `flushSyncQueue` envía `Idempotency-Key:
   row.id` en cada retry. `row.id` ya era nanoid 21 chars persistido
   en `sync_queue` desde M5 — el comentario en `schema.ts` ya lo
   anticipaba como idempotency key. Sin migración SQLite.

8. **`packages/api-client`**: `post/put/patch/delete` aceptan
   `opts.headers` per-request (no breaking — param opcional).

9. **`/auth/login` mantenido como excepción documentada**: devuelve
   body raw (no `{data}` envelope) porque la APK desplegada lo
   consume así. Cambiar romperia compat. Documentado en backend.md.

### Tests añadidos (31 nuevos)

- `apps/web/lib/__tests__/idempotency.test.ts` — 7 tests del store.
- `apps/web/app/api/v1/__tests__/helpers.test.ts` — 12 tests de helpers.
- `apps/web/app/api/v1/ventas/__tests__/contract.test.ts` — 10 tests
  de contrato (idempotency miss/hit, 422 Zod, 409 stock, etc.).
- `apps/mobile/__tests__/syncIdempotency.test.ts` — 2 tests
  (mobile envía Idempotency-Key + retry reutiliza misma key).

### Verificación gate

- `pnpm --filter web type-check` ✅
- `pnpm --filter web lint` ✅
- `pnpm --filter web test` → **155 / 155** ✅ (12 suites)
- `pnpm --filter web build` ✅
- `pnpm --filter @repo/mobile type-check` ✅
- `pnpm --filter @repo/mobile lint` ✅
- `pnpm --filter @repo/mobile exec jest --watchman=false` → **48 / 48** ✅

### Lo que NO se hizo (intencional)

- ❌ Sin migración Prisma — toda la persistencia idempotency vive en
  Upstash o memoria. Si en futuro se requiere DB persistent store,
  abrir ADR con mini-diseño antes de migrar.
- ❌ Idempotency NO aplicada masivamente. Solo `POST /api/v1/ventas`
  en este sprint. El helper `withIdempotencyResponse` es genérico
  para extender luego a devoluciones, movimientos caja, clientes,
  productos — sin nuevas migraciones.
- ❌ Shape de `/auth/login` intacto.
- ❌ Sin `/api/v2`.
- ❌ Sin UI visual.
- ❌ Sin breaking de APK desplegada (clientes mobile pre-2B siguen
  funcionando — header opcional).

### Gotcha nuevo registrado

🟡 **G-IDEMP-MEM**: Sin `UPSTASH_REDIS_REST_URL` configurado, la
garantía de idempotency degrada a memoria in-process. Si el container
`pos-web` reinicia (deploy, crash, scale), las keys se pierden y un
retry mobile post-reinicio puede duplicar la venta. Aceptado como
degradación intencional Fase 2B-P0; mitigación = configurar Upstash
en `.env.docker` (cubierto por DR-06/DR-10 pendientes).

### Commits

- `9a9fda7` — `feat(api): Fase 2B-P0 — error envelope + idempotency POST /api/v1/ventas`
- `c864565` — `fix(api): Fase 2B-P0 patch — header invalido 400 + fingerprint mismatch 409`

### Patch Fase 2B-P0 (post-review Codex)

Codex pidió dos parches de calidad antes de aceptar Fase 2B-P0:

1. **Header `Idempotency-Key` inválido NO debe degradar silenciosamente.**
   `readIdempotencyKey` reescrito como tri-estado discriminado
   (`absent | valid | invalid`). `withIdempotencyResponse` con header
   inválido (whitespace, símbolos, vacío, >200 chars) → **400 +
   `VALIDATION_FAILED` + `details: { header: "Idempotency-Key" }`** sin
   ejecutar el handler. Antes degradaba a "sin dedupe" silencioso —
   cliente creía estar protegido cuando no lo estaba.

2. **Misma key + body distinto debe rechazar 409.** Nuevo helper
   `computeFingerprint(body)` con SHA-256 sobre JSON canonical (keys
   ordenadas alfabéticamente; arrays mantienen orden). `IdempotencyEntry`
   ahora incluye `fingerprint?: string`. En cache hit con fingerprint
   distinto → **409 + `CONFLICT` + error "Idempotency-Key reutilizado
   con un payload distinto"** sin re-ejecutar. Entries pre-patch
   (sin fingerprint) hacen replay normal (compat).

`POST /api/v1/ventas` calcula fingerprint del payload post-Zod (no
del body raw) y lo pasa al wrapper.

`WithIdempotencyResult<T>` rediseñado como union discriminada por
`conflict` para narrowing TS limpio.

### Tests añadidos en el patch (+10)

- `idempotency.test.ts`: fingerprint mismatch → conflict; mismo
  fingerprint → replay; `computeFingerprint` order-independent.
- `helpers.test.ts`: header inválido → 400 sin ejecutar; header vacío
  → 400; fingerprint distinto → 409 CONFLICT; mismo fingerprint →
  replay; `readIdempotencyKey` tri-estado (absent/valid/invalid).
- `contract.test.ts`: misma key + body distinto → 409 + CONFLICT sin
  duplicar; misma key + body idéntico (campos en otro orden) →
  replay; header inválido → 400 + VALIDATION_FAILED.

### Gate post-patch

- `pnpm --filter web type-check` ✅
- `pnpm --filter web lint` ✅
- `pnpm --filter web test` → **165 / 165** ✅
- `pnpm --filter @repo/mobile type-check` ✅
- `pnpm --filter @repo/mobile exec jest --passWithNoTests --watchman=false`
  → **48 / 48** ✅

---

## Sesión 2026-04-30 · Fase 2B-P1 — API contract completion cerrada

**Contexto:** Codex aceptó Fase 2B-P0 con patch y aprobó pasar a 2B-P1
para completar el contrato API antes de UX. Alcance acotado: agregar
schemas faltantes en `@repo/api-client`, adoptarlos en handlers REST
sin romper wire format, tests de contrato mínimos, docs.

### Schemas nuevos en `packages/api-client/src/types.ts`

- `CrearProductoRequestSchema` / `ActualizarProductoRequestSchema`
- `CategoriasListResponseSchema` (array directo, sin paginación)
- `UsuariosListResponseSchema` (paginado, sin password)
- `AperturaCajaSchema` + `EstadoAperturaSchema` enum
- `MovimientoCajaSchema` + `TipoMovimientoCajaSchema` enum
- `AbrirCajaRequestSchema`, `CerrarCajaRequestSchema`,
  `RegistrarMovimientoRequestSchema`
- `DevolucionListResponseSchema`

### Handlers actualizados (sin breaking)

- `POST/PUT /api/v1/productos[id]`: usan los schemas compartidos +
  `jsonZodError`. Codes asignados: `VALIDATION_FAILED` (body invalid /
  Zod), `DUPLICATE` (código barras), `NOT_FOUND` (id inexistente),
  `INTERNAL_ERROR` (fallback).
- `POST /api/v1/caja/aperturas`: idem + `BUSINESS_RULE` cuando
  `abrirCaja` action retorna `ok:false`.
- `PATCH /api/v1/caja/aperturas/[id]`: idem + `BUSINESS_RULE` en
  cierre fallido + `VALIDATION_FAILED` para id no numérico.
- `POST /api/v1/caja/aperturas/[id]/movimientos`: idem.

Los wire formats no cambiaron — clientes existentes (mobile actual)
siguen funcionando. Mobile podrá adoptar los schemas en una fase
futura para validar responses runtime.

### Tests añadidos (+30, total web 195/195)

- `productos/__tests__/contract.test.ts` (10): body invalid → 400,
  Zod fail → 422 + path issues, duplicate → 409 DUPLICATE, happy
  path 200, RBAC CAJERO 403, PUT id inexistente → 404 NOT_FOUND,
  PUT parcial.
- `caja/__tests__/contract.test.ts` (9): aperturas POST/PATCH +
  movimientos POST. Cubren Zod fail + happy + business error 422.
- `__tests__/list-schemas.test.ts` (11): valida shapes de las
  respuestas de lista contra los nuevos schemas (Categorias,
  Usuarios, Devoluciones, AperturaCaja individual, MovimientoCaja
  individual). Defensa en profundidad: si el handler emite shape
  distinto, el schema lo detecta.

### Verificación gate

- `pnpm --filter web type-check` ✅
- `pnpm --filter web lint` ✅
- `pnpm --filter web test` → **195 / 195** ✅ (15 suites)
- `pnpm --filter web build` ✅
- `pnpm --filter @repo/mobile type-check` ✅
- `pnpm --filter @repo/mobile lint` ✅
- `pnpm --filter @repo/mobile exec jest --passWithNoTests --watchman=false`
  → **48 / 48** ✅

### Lo que NO se hizo (intencional)

- ❌ Sin migración DB.
- ❌ Sin idempotency masiva (solo `/ventas` conserva).
- ❌ `/auth/login` intacto.
- ❌ Sin breaking mobile — APK desplegada sigue operando con el wire
  format anterior. Mobile podrá adoptar los nuevos schemas en una
  fase futura sin romper el contrato.
- ❌ No se añadieron schemas para responses no listadas (productos
  individual ya tenía `ProductoSchema`; aperturas individual ahora
  tiene `AperturaCajaSchema`; usuario individual tiene `UsuarioSchema`).

### Commits

- `741ff4b` — `feat(api): Fase 2B-P1 — API contract completion (schemas compartidos)`

### Estado al cierre

✅ Fase 2B-P1 cerrada — contrato API completo en `@repo/api-client`,
   handlers usando schemas compartidos y envelope `{error, code, details}`
   estándar en endpoints críticos (productos, caja). 195 tests web
   pasando.

🟢 Próxima fase: **2C — Frontend UX polish** (desarrollo visible,
   ya no docs/contratos).

🟡 Bloqueos operacionales pendientes Pierre (acumulados): DR-01
   branch protection, DR-06 UptimeRobot, DR-10 off-site backups,
   items checklist externo (DNS/SSL apk-dypos).

### Estado al cierre

✅ Fase 2B-P0 cerrada — backend con error envelope estándar, idempotency
   crítica funcionando, status codes consistentes y tests de contrato.

🟢 Próxima fase libre: continuar 2B-P1 (extender idempotency a
   devoluciones/movimientos/clientes/productos + schemas compartidos
   adicionales + más tests de contrato) o cambiar de track a 2C
   (UX polish) / 2D (mobile + Sentry).

🟡 **Bloqueos operacionales pendientes Pierre** (ya documentados Fase
   2A): DR-01 branch protection, DR-06 UptimeRobot, DR-10 off-site
   backups, items checklist externo (DNS/SSL apk-dypos).

---

## Sesión 2026-05-01 · Fase 2C — Frontend UX polish cerrada

**Contexto:** primera fase de desarrollo visible tras el cimiento
profesional de Fases 0/1/2A/2B. Codex aprobó alcance acotado:
unificar patrones visuales de las rutas operativas del dashboard sin
rediseño desde cero, manteniendo cero cambios de contrato backend.

### Mini-audit previo

Audit por inspección de código de 8 rutas (`/`, `/caja`, `/ventas`,
`/productos`, `/clientes`, `/devoluciones`, `/perfil`, `/mobile-releases`).

Hallazgos clave: 5 estilos distintos de page header coexistían;
2 patrones de stats KPI (Card-en-Card vs divs hand-rolled); banner de
productos con `amber-50/950` hardcoded; botones `/caja` como
`<Link>` con clases custom; tab "Seguridad" en perfil con label
duplicado mobile; `/mobile-releases` rompía layout con `container
mx-auto`; sin `error.tsx` por sección.

### Decisiones técnicas

1. **3 componentes Server-puros nuevos** en `apps/web/components/`:
   - `page-header.tsx` (`<PageHeader title subtitle? action? meta? />`).
     Política: NO iconos en h1 por defecto. `/` mantiene header
     premium con `font-display` como excepción documentada.
   - `kpi-card.tsx` (`<KpiCard label value sublabel? tone? />`).
     Tones: default | amber | destructive | success.
   - `ui/alert.tsx` con cva (`<Alert variant>` + Title/Description).
     Variants: default | warning | destructive | success.

2. **Adopción en 7 rutas** sin breaking funcional. Botones `<Link>`
   en `/caja` ahora usan `Button` con variants outline/destructive.
   Badge custom de apertura → `Badge` componente. Banner de productos
   → `Alert variant="warning"`. KPIs unificados con `KpiCard`.
   `/clientes` ganó 3 KPIs derivados de datos en memoria (sin queries
   extra). Devoluciones perdió el icono `RotateCcw` del h1.
   `/perfil` mobile muestra "Datos | Clave | Actividad" (fix label).
   `/mobile-releases` alineado al layout estándar.

3. **`app/(dashboard)/error.tsx`** — error boundary anidado al
   segmento. Conserva sidebar + header. `<Alert variant="destructive">`
   + Reintentar + Volver al dashboard. Reporta a Sentry.

4. **`docs/architecture/frontend.md`** ampliado con sección 4.1
   (componentes UX unificados con ejemplos) y 4.2 (política error
   boundaries).

### Smoke browser (Claude_in_Chrome MCP) verificado

- **Desktop 1280×800**: `/`, `/ventas`, `/productos`, `/clientes`,
  `/devoluciones`, `/perfil`, `/mobile-releases` — todas las rutas
  con PageHeader/KpiCard/Alert correctamente renderizados. KPIs
  reales en `/ventas` ($225.145 total facturado, $9.381 ticket
  promedio). `/devoluciones` $29.194 monto devuelto.
- **Tablet 768×1024**: hamburger button visible (sidebar oculto).
- **Mobile 375×812**: hamburger + brand "DyPos CL"; `/perfil` tabs
  muestran "Datos | Clave | Actividad" (fix del label confirmado).
- `/caja` redirige correctamente a `/caja/abrir` cuando no hay
  apertura activa.
- RBAC del cajero NO se pudo smoke-testear localmente (BD dev no
  tiene seed `cajero@pos-chile.cl`); cubierto por tests + smoke prod
  previo (Fase 0.6).

### Verificación gate

- `pnpm --filter web type-check` ✅
- `pnpm --filter web lint` ✅
- `pnpm --filter web test` → **195 / 195** ✅ (sin regresiones)
- `pnpm --filter web build` ✅
- `pnpm --filter @repo/mobile type-check` ✅
- `pnpm --filter @repo/mobile lint` ✅
- `pnpm --filter @repo/mobile exec jest --passWithNoTests --watchman=false`
  → **48 / 48** ✅

### Commits

- `2fc90bd` — `feat(ui): Fase 2C bloque A — PageHeader, KpiCard, Alert components`
- `bf66dc9` — `feat(ui): Fase 2C bloque B — adopcion PageHeader/KpiCard/Alert en rutas P0`
- `406533d` — `feat(ui): Fase 2C bloque C — error boundary del dashboard`
- `8ccc77f` — `docs(architecture): Fase 2C — frontend.md con componentes UX unificados`

### Gotcha nuevo registrado

🟡 **G-DEV-CAJERO**: la BD local de desarrollo no tiene seed del
usuario `cajero@pos-chile.cl/cajero123`. Solo admin. Para testear RBAC
del cajero localmente: agregar seed o crear desde `/usuarios` UI.
Backlog P2 (Fase 2E candidato — fixtures dev).

### Lo que NO se hizo (intencional)

- ❌ Sin cambios backend / API / DB.
- ❌ Sin rediseño visual mayor — preservó identidad existente.
- ❌ No duplicé CTAs "Nuevo X" en header cuando ya viven en toolbar
  de la tabla con dialog (productos, clientes).
- ❌ Sin tests Vitest de componentes visuales — vitest config "node"
  sin React plugin; smoke browser cubre validación visual.
- ❌ Sin deploy prod (Codex no autorizó).

### Backlog P2 acumulado

- `POST /api/v1/devoluciones` aún con schema local (Fase 2B-P1
  observación 1).
- Migrar `msg.includes("Unique")` a Prisma error code `P2002` en
  productos (Fase 2B-P1 observación 2).
- Seed `cajero@pos-chile.cl` en BD dev local (G-DEV-CAJERO).
- DR-01 branch protection (Pierre, GitHub UI).

### Estado al cierre

✅ Fase 2C cerrada — UI consistente, profesional, responsive verificado
   en 3 viewports, dark mode preservado vía tokens, error boundary
   anidado mantiene navegación cuando algo falla.

🟢 Próxima fase candidatos: 2D mobile+Sentry, 2E fixtures dev, 3A
   features comerciales (CSV import, etc.).

---

## Sesión 2026-05-01 · Fase 2D — Sentry mobile (DR-12 implementado)

**Contexto:** Pierre informó que tenía device físico conectado a la
Mac. Codex aprobó audit previo + autorizó implementación. Yo (agente)
intenté crear el proyecto Sentry vía MCP (org `dy-company`); el token
del MCP no tiene scope `project:write` (HTTP 403 "Your organization
has disabled this feature for members"). Pierre creó manualmente el
proyecto `pos-chile-mobile` (platform: React Native, team:
`dy-company`) en https://dy-company.sentry.io y me pasó el DSN.

### Cambios técnicos

1. **Instalación** — `pnpm add @sentry/react-native@~7.2.0` (versión
   recomendada por `npx expo install` para SDK 54).

2. **Config**:
   - Plugin `@sentry/react-native/expo` agregado a `app.json/plugins`.
   - DSN guardado en `apps/mobile/.env` (gitignored confirmado vía
     `git check-ignore`). Var name `EXPO_PUBLIC_SENTRY_DSN` (Expo
     inyecta al bundle JS).
   - Bump `version` 1.0.4 → 1.0.5; `versionCode` 5 → 6; iOS
     `buildNumber` 5 → 6.

3. **Wrapper `apps/mobile/lib/sentry.ts`**:
   - `initSentry()` — chequea DSN no vacío antes de inicializar.
     Idempotente. Degradación silenciosa sin DSN.
   - `sentryWrap()` — re-export de `Sentry.wrap` para error boundary
     global del render tree.
   - `captureExceptionSafe()` / `captureMessageSafe()` — sanitizan
     `extra` antes de enviar; NO-OP si Sentry no está activo.
   - `beforeSend` hook — pseudonimiza `email`/`rut`/`telefono`/`phone`
     con FNV-1a + djb2 (16 chars hex). Elimina completos
     `password`/`token`/`authorization`/`cookie`. Trunca
     `user.ip_address` a /24 (IPv4) o /48 (IPv6).

4. **Wire-in en `app/_layout.tsx`**:
   - `initSentry()` invocado tras todos los imports, antes del primer
     render.
   - `export default sentryWrap(RootLayout)` instala error boundary
     global automático.

5. **Crash test gated por `__DEV__`** en `app/(tabs)/mas/perfil.tsx`:
   botón `[DEV] Disparar crash test Sentry` que lanza
   `throw new Error("sentry-mobile-test (intentional)")`. En release
   builds Hermes inlinea `__DEV__ = false` y tree-shakea el bloque.

### Bug encontrado y workaround

🟠 **Bug `_interopRequireWildcard` jest-expo + babel-preset-expo**:
con `import * as Sentry` o `import { init }`, los named exports en
jest tienen las keys enumeradas por `Object.keys` pero acceder a
`Sentry.init` retorna `undefined`. Confirmado experimentalmente con
`Object.getOwnPropertyDescriptor` que muestra descriptor sin `value`.

**Workaround aplicado**: en `lib/sentry.ts`, late-binding via
`function getSentry() { return require("@sentry/react-native") }`
dentro de cada función que usa Sentry. En runtime RN/Metro no hay
diferencia funcional. Documentado con comentario explícito en el
archivo.

### Tests añadidos (+25 mobile, total 73/73)

- `apps/mobile/__tests__/sentry.test.ts`:
  - `pseudonymize`: 16 chars hex, determinístico, distinto por input,
    string vacío.
  - `sanitize`: PII keys → `*Hash`, secret keys eliminadas, recursivo,
    case-insensitive, primitivos intactos, valor no-string mantiene
    key original.
  - `truncateIp`: IPv4 → /24, IPv6 → /48, no-IP intacto.
  - `initSentry`: degradación silenciosa sin DSN; whitespace tratado
    como vacío; con DSN llama `Sentry.init` con `beforeSend`;
    idempotente.
  - `beforeSend`: sanitiza `event.extra`, `event.user.email` (→ hash +
    delete email), `event.user.ip_address` (→ truncado), `event.request.data`
    (password eliminado).
  - `capture*` helpers: NO-OP sin Sentry, sanitizan extras con Sentry.

### Verificación gate

- `pnpm --filter web type-check` ✅
- `pnpm --filter web lint` ✅
- `pnpm --filter web test` → **195 / 195** ✅
- `pnpm --filter web build` ✅
- `pnpm --filter @repo/mobile type-check` ✅
- `pnpm --filter @repo/mobile lint` ✅ (cero warnings)
- `pnpm --filter @repo/mobile exec jest --watchman=false` → **73 / 73**
  ✅ (48 + 25 nuevos)

### Commits

- `c26a449` — `feat(mobile): Fase 2D — Sentry RN integrado con PII pseudonymization`

### Pendiente Pierre (handoff)

1. Verificar keystore activo (NO `.broken`):
   `keytool -list -keystore ~/.android-keystores/pos-chile-release.keystore`.
2. Prebuild + build APK release con `./scripts/mobile-build-apk.sh`.
3. `adb install -r releases/pos-chile-v1.0.5-vc6.apk` (preserva data
   local: SQLite, sesión, queue offline).
4. Tap el botón crash test en /perfil → verificar evento llega a
   https://dy-company.sentry.io/projects/pos-chile-mobile/.
5. Si MIUI Security bloquea instalación: `adb push` a
   `/sdcard/Download/` + instalar manual via Mi File Manager
   (gotcha G-M47).

### Estado al cierre

✅ DR-12 **CERRADO** (2026-05-01) — verificación end-to-end completa
   en device físico (Xiaomi 2406APNFAG, Android 15). Issue
   `POS-CHILE-MOBILE-1` capturado en https://dy-company.sentry.io/
   issues/POS-CHILE-MOBILE-1: "Error: sentry-mobile-test (intentional)"
   con culprit `onPress(index.android)`, 1 evento, 1 user.

### Smoke device físico (cronología real)

1. Pierre creó proyecto Sentry `pos-chile-mobile` en org `dy-company`
   y pegó DSN en `apps/mobile/.env` (gitignored).
2. Pierre corrió `expo prebuild --platform android --clean`
   regenerando carpeta `android/` (esto eliminó `keystore.properties`
   con los secretos — re-creado luego con valores de password manager).
3. **Bug 1**: `expo prebuild --clean` borró el bloque release signing
   de `app/build.gradle`. Pierre lo reinjectó.
4. **Bug 2**: Gradle invocaba `node` de PATH (Node 18) en lugar del
   Node 22 del nvm shell. Metro 0.83 falla con
   `configs.toReversed is not a function`. Fix: `nodeExecutableAndArgs
   = [System.getenv("NODE_BINARY") ?: "node"]` en `app/build.gradle`.
5. **Bug 3**: pnpm strict no auto-hoistea `@babel/plugin-transform-
   react-jsx` requerido por `babel-preset-expo` transitivamente.
   Fix: agregar como devDep directa en `apps/mobile/package.json`.
6. **Bug 4**: Sentry plugin intenta subir sourcemaps sin auth token
   y falla. Fix: `SENTRY_DISABLE_AUTO_UPLOAD=true` en build env.
7. **Bug 5**: APK actualmente en device estaba debug-signed (no
   release). `adb install -r` con APK release-signed falla con
   `INSTALL_FAILED_UPDATE_INCOMPATIBLE`. Fix: `adb uninstall` +
   `adb install` limpio.
8. **Bug 6**: MIUI Security bloqueó `adb install`
   (`INSTALL_FAILED_USER_RESTRICTED`). Fix: `adb push` a
   `/sdcard/Download/` + instalación manual via Mi File Manager
   (gotcha G-M47 confirmado nuevamente).
9. **Bug 7**: APK release apuntaba a `localhost:3000` y Android 15
   bloquea cleartext HTTP. Fix: cambiar `EXPO_PUBLIC_API_URL` a
   `https://dy-pos.zgamersa.com` (prod, HTTPS).
10. **Bug 8**: Metro cache reusó bundle viejo con `localhost:3000`
    bakeado pese a cambiar el `.env`. Fix: limpiar
    `/var/folders/<user>/T/metro-cache*` antes de rebuild.
11. **Bug 9**: Crash test gated por `__DEV__` no se renderiza en
    release. Fix: relajar el gate temporalmente para validación
    inicial; commit follow-up vuelve a gatear.
12. Build #4 OK con URL prod bakeada. APK 1.0.5+vc6 firmada con
    keystore release nuevo (SHA-1 `B1:B6:73:...`).
13. Reinstall via `adb install -r` (firmas iguales, preserva data).
14. Pierre login admin prod + tab Más → Perfil → tap "Crash test
    Sentry".
15. Logcat confirma captura: `io.sentry.UncaughtExceptionHandler
    Integration.uncaughtException(...:152)`.
16. ~1 min después, issue `POS-CHILE-MOBILE-1` aparece en dashboard
    Sentry.

### Gotchas nuevos registrados (Fase 2D)

- 🟡 **G-MOB-NODE22**: gradle Metro requiere Node 22+. `app/build.gradle`
  ya tiene `nodeExecutableAndArgs = [System.getenv("NODE_BINARY") ?:
  "node"]` — basta exportar `NODE_BINARY` antes del build.
- 🟡 **G-MOB-PNPM-BABEL**: `@babel/plugin-transform-react-jsx` debe
  declararse como devDep directa en `apps/mobile/package.json` (pnpm
  strict no auto-hoistea peer deps de `babel-preset-expo`).
- 🟡 **G-MOB-METRO-CACHE**: cambios en `.env` NO se reflejan en
  rebuilds si Metro cache no se limpia. Borrar
  `/var/folders/$USER/T/metro-cache*` antes de rebuild crítico.
- 🟡 **G-MOB-CLEARTEXT**: APK release no permite HTTP a `localhost`
  ni IP LAN sin `network_security_config.xml`. Usar HTTPS prod o
  agregar config explícito.
- 🟡 **G-MOB-PREBUILD-KEYSTORE**: `expo prebuild --clean` BORRA
  `apps/mobile/android/keystore.properties` y el bloque release
  signing en `app/build.gradle`. Tener listos los passwords antes
  de prebuild + reinjectar signing block.
- 🟡 **G-MOB-FIRMA-DEBUG**: APK debug-signed y APK release-signed NO
  son intercambiables. `adb install -r` falla con UPDATE_INCOMPATIBLE.
  Primer install tras pasar de debug → release requiere
  `adb uninstall` + `install` limpio.
- 🟡 **G-MOB-SENTRY-AUTH-TOKEN**: build local corre con
  `SENTRY_DISABLE_AUTO_UPLOAD=true` para evitar fallo de sourcemap
  upload. Para subir sourcemaps en CI, generar token en
  Sentry → API → Auth tokens → scope `project:write`.

### Pendientes operativos (no bloquean Fase 2D)

- Volver `apps/mobile/.env` `EXPO_PUBLIC_API_URL` a `localhost:3000`
  para dev local (cuando se necesite). Hoy apunta a prod para que
  la APK que tiene Pierre en device pueda autenticar.
- Generar `SENTRY_AUTH_TOKEN` para sourcemap upload (G-MOB-SENTRY-
  AUTH-TOKEN).
- Cleanup APK: `releases/pos-chile-v1.0.5-vc6.apk` (115 MB) en repo —
  `releases/` está gitignored, no se commitea, pero ocupa espacio.

### Commits

- `c26a449` — `feat(mobile): Fase 2D — Sentry RN integrado con PII pseudonymization`
- `94bd5c6` — `chore(memory): session notes Fase 2D cierre`
- `3bd1f47` — `feat(mobile): Fase 2D follow-up — Sentry validado prod (POS-CHILE-MOBILE-1)`

---

## Sesión 2026-05-01 · Fase 3A — CSV import productos cerrada

**Contexto:** primera fase comercial — onboarding rápido para clientes
con catálogos grandes (DR-08). Codex aprobó alcance acotado con
decisiones específicas por chat (Q1.1 a Q10).

### Cambios técnicos

1. **`apps/web/app/(dashboard)/productos/import-helpers.ts`** (puro,
   sin "use server"): constantes (5 MB / 5k filas), tipos exportados
   (`RowError`, `ParsedRow`, `ImportPreview`, `ImportSummary`), parser
   CSV inline (sin papaparse para evitar bundle bloat), normalizadores
   chilenos (`parsePrecioChileno`, `parseBoolEs`, `parseCsvText`),
   `parseRowsToProductos` con validación por fila, `buildCsvTemplate`
   para descarga.

2. **`apps/web/app/(dashboard)/productos/import-actions.ts`** ("use
   server"): solo Server Actions async (`previewImportProductos`,
   `commitImportProductos`). Resuelve categorías por nombre, detecta
   duplicados intra-CSV (error) y en DB (warning), bulk insert via
   `createMany` + bulk update opcional dentro de
   `prisma.$transaction`, AuditLog accion CREATE + diff
   `PRODUCTOS_IMPORT_CSV`.

3. **`apps/web/app/(dashboard)/productos/import-csv-dialog.tsx`**
   (Client): state machine idle→parsing→preview→committing→done,
   dropzone nativo con drag/drop, botón "Descargar plantilla" via
   Blob client-side, tabla preview (max 100 filas visibles),
   checkbox "Actualizar productos existentes" si hay duplicates en
   DB, confirm disabled cuando hay errores.

4. **`productos-table.tsx`**: botón "Importar CSV" (variant outline)
   en toolbar al lado de "Nuevo producto". Mismo gate (disabled si
   no hay categorías activas).

5. **`docs/architecture/decision-log.md`**: DR-08 marcado IMPLEMENTADO
   con resumen de decisiones aprobadas.

### Decisiones aprobadas (Pierre 2026-05-01)

| Q | Decisión |
|---|----------|
| Q1.1 | categoría por nombre (no id) |
| Q1.2 | precio acepta `1990`, `1.990`, `$1.990`; rechaza `1990,50` |
| Q2 | duplicados → skip default + checkbox "actualizar" |
| Q3 | categoría inexistente → error por fila (NO auto-crear) |
| Q4 | pre-validación all-or-nothing |
| Q5 | 5 MB / 5.000 filas máximo |
| Q6 | solo web (no mobile) |
| Q7 | Server Action (no API REST en este sprint) |
| Q8 | sin Idempotency-Key |
| Q9 | AuditLog accion CREATE + diff `PRODUCTOS_IMPORT_CSV` |
| Q10 | tests unit + contract + smoke browser |
| Extra | "Descargar plantilla CSV" con headers + 2 filas ejemplo |

### Tests añadidos (+43 web, total 238/238)

`apps/web/app/(dashboard)/productos/__tests__/import-csv.test.ts`:

- `parsePrecioChileno`: 6 formatos válidos + 4 inválidos.
- `parseBoolEs`: variantes es-CL.
- `parseCsvText`: BOM, quotes, CRLF, delimiter `,`/`;`, vacíos.
- `parseRowsToProductos`: headers requeridos, rangos, fila vacía,
  múltiples errores por fila.
- `buildCsvTemplate`: round-trip → 2 filas parseables sin error.
- `previewImportProductos` contract: file size, row count, duplicates
  intra-CSV, duplicates en DB, categoría inexistente, RBAC CAJERO.
- `commitImportProductos` contract: bulk createMany + AuditLog, skip
  default, update con flag, error si categoría desaparece, RBAC.

### Verificación gate

- `pnpm --filter web type-check` ✅
- `pnpm --filter web lint` ✅
- `pnpm --filter web test` → **238 / 238** ✅
- `pnpm --filter web build` ✅
- `pnpm --filter @repo/mobile type-check` ✅
- `pnpm --filter @repo/mobile lint` ✅
- `pnpm --filter @repo/mobile exec jest --watchman=false` → **73 / 73**

### Smoke browser desktop 1280×800

- `/productos` → toolbar muestra "Importar CSV" + "Nuevo producto".
- Click "Importar CSV" → dialog abre con dropzone + "Descargar plantilla"
  + texto "Máx. 5 MB · 5.000 filas".
- Wire-in OK.

### Lo que NO se hizo (intencional)

- ❌ Schema DB intacto.
- ❌ Sin endpoint REST `/api/v1/productos/import` (Q7 — Server Action only).
- ❌ Sin idempotency (Q8 — admin confirma manualmente).
- ❌ Sin auto-creación de categorías (Q3).
- ❌ Sin mobile UI (Q6 — solo web).

### Gotcha nuevo registrado

🟡 **G-WEB-USE-SERVER**: archivos con `"use server"` en Next.js NO
permiten exports no-async (consts, tipos, helpers sync). Si necesitas
helpers puros para usar tanto desde Server Actions como Client
Components, ponlos en archivo aparte sin `"use server"`. Patrón
adoptado: `import-actions.ts` ("use server") + `import-helpers.ts`
(sin directiva).

### Commits

- `a6977ab` — `feat(web): Fase 3A — CSV import productos para onboarding rápido`

### Estado al cierre

✅ Fase 3A cerrada — onboarding comercial desbloqueado. Cliente con 500+
   productos puede subir CSV en lugar de capturar uno por uno.

🟢 Próxima fase aprobada por Pierre: **documentación funcional para
   dueño/cliente** (manuales de uso, no técnicos). Candidato.

🟢 Próxima fase: **3A** — features comerciales. Candidatos por orden
   de prioridad comercial: CSV import productos (DR-08, desbloquea
   onboarding cliente con catálogo grande), onboarding tenants
   automatizado (iterar `provision-tenant.sh`), smoke prod automatizado
   (DR-07).

---

## Sesión 2026-05-01 · Fase 2C.1 — Consistencia visual completa cerrada

**Contexto:** seguimiento natural de 2C. Codex aprobó cerrar la
adopción de `PageHeader/KpiCard/Alert` en TODAS las rutas operativas
restantes (no solo P0 como en 2C). Cero cambios backend / contratos
/ DB. El cimiento ya estaba — esta fase solo pinta consistencia.

### Mini-audit previo

20 rutas restantes auditadas. Hallazgos: 5 estilos de header coexistían
todavía; banners hardcoded `amber-50/950` en /usuarios, /cajas, /caja/
movimientos; `StatCard` local en /caja/movimientos con tones extra
no presentes en `KpiCard`; iconos en h1 de /alertas; Card-en-Card
pesado en /reportes y /alertas; sub-rutas /caja/* y /ventas/* con
flex+div ad-hoc.

Excluidas del swap (3): `/docs` (solo redirect), `/devoluciones/[id]`
(solo notFound), `/caja/[aperturaId]/cierre` (vista print-friendly
con layout específico).

### Cambios técnicos

**Bloque 1 — Catálogo / admin / herramientas (5 rutas):**
- `/categorias`, `/usuarios`, `/cajas`: PageHeader. Banners amber
  hardcoded → `Alert variant="warning"` con tokens.
- `/alertas`: PageHeader sin icono `AlertTriangle` (política nueva
  NO iconos en h1). 3 Card-en-Card → 3 KpiCard con tone destructive
  cuando bajoStockCount > 0.
- `/reportes`: PageHeader. 3 Card numéricas → 3 KpiCard. La 4ª
  (Métodos usados) se mantiene como Card porque es lista.

**Bloque 2 — Sub-rutas /caja (4 rutas):**
- `/caja/abrir`, `/caja/cerrar`, `/caja/movimientos/nuevo`:
  PageHeader (max-w preservados).
- `/caja/movimientos`: StatCard local (con tones muted/info que no
  se usaban) eliminado. Reemplazado por KpiCard. Nuevo tone
  `warning` (orange-700/400) agregado al `KpiCard` global para
  retiros (acción reversible — semántica distinta de `amber`
  que indica atención persistente). Banner truncamiento amber
  hardcoded → `Alert variant="warning"`.

**Bloque 3 — Ventas / Devoluciones detalles + forms (5 rutas):**
- `/ventas/nueva`: PageHeader con action="Volver a ventas".
- `/ventas/[id]`: PageHeader con title + subtitle font-mono
  (numeroBoleta) + action slot que mantiene los 3 botones
  condicionales (Volver / Devolución / Editar enabled|disabled).
- `/ventas/[id]/editar`: PageHeader con title que incluye
  numeroBoleta inline (font-mono).
- `/ventas/eliminadas`: PageHeader.
- `/devoluciones/nueva` (2 ramas):
  - Rama bloqueada (devolución total): `Card border-destructive` →
    `Alert variant="destructive"` con CTA "Ver detalle de la venta".
  - Rama "todos devueltos": `Card amber-300/950` → `Alert
    variant="warning"`. Iconos `AlertTriangle` removidos del título.

### Smoke browser (Claude_in_Chrome MCP) verificado

Desktop 1280×800: las 14 rutas tocadas verificaron PageHeader/KpiCard/
Alert correctamente. KPIs reales en `/reportes` (Total facturado,
Ticket promedio, IVA 19% incluido), `/caja/movimientos` (Movimientos,
Ingresos, Egresos, Retiros, Neto sobre caja). `/ventas/[id]` con los
3 botones condicionales (Volver, Nueva devolución, Editar).

Mobile 375×812: hamburger button + heading "Alertas de Stock" sin
icono renderizan correctamente.

### Verificación gate

- `pnpm --filter web type-check` ✅
- `pnpm --filter web lint` ✅
- `pnpm --filter web test` → **195 / 195** ✅ (sin regresiones)
- `pnpm --filter web build` ✅
- `pnpm --filter @repo/mobile type-check` ✅
- `pnpm --filter @repo/mobile lint` ✅
- `pnpm --filter @repo/mobile exec jest --passWithNoTests --watchman=false`
  → **48 / 48** ✅

### Cobertura final del sistema (post-2C + 2C.1)

22 rutas dashboard:
- 21 usan PageHeader (excepción `/` premium).
- 11 usan KpiCard.
- 7 usan Alert (warning + destructive variants).
- 3 excluidas con justificación documentada.

### Commits

- `bd5d595` — `feat(ui): Fase 2C.1 bloque 1 — catalogo/admin/herramientas`
- `ce66f2c` — `feat(ui): Fase 2C.1 bloque 2 — sub-rutas /caja`
- `e83c4ce` — `feat(ui): Fase 2C.1 bloque 3 — ventas/devoluciones detalles+forms`

### Lo que NO se hizo (intencional)

- ❌ `/docs`, `/devoluciones/[id]`, `/caja/[aperturaId]/cierre`
  excluidas con justificación documentada.
- ❌ Sin cambios backend / API / DB / contratos.
- ❌ Sin tests Vitest de componentes (config "node" sin React plugin).
- ❌ Sin deploy prod.

### Estado al cierre

✅ Fase 2C.1 cerrada — TODA la consistencia visual del dashboard
   completada. App densa, profesional, responsive, dark mode preservado.
   Cero rutas con headers ad-hoc o KPIs hand-rolled (excepto la home
   premium documentada).

🟢 Próxima fase: **2D Mobile + Sentry** (cuando Pierre tenga ventana
   con device físico) o **2E Dev fixtures/seed** (desbloquea smoke
   RBAC local del cajero — G-DEV-CAJERO).

---

## Sesión 2026-05-01 · Fase 2E — Dev fixtures/seed cajero cerrada

**Contexto:** Codex aprobó Fase 2E como bloque corto para cerrar
`G-DEV-CAJERO` y dejar smoke local reproducible. Codex también pidió
patch oportunista del último residuo visible del patrón viejo:
`apps/web/app/(dashboard)/alertas-banner.tsx` con
`border-amber-300/bg-amber-50` hardcoded.

### Audit previo

- `packages/db/prisma/seed.ts` ya existía y era idempotente con
  `upsert` para admin + cajero — pero G-DEV-CAJERO se gatilló
  porque la BD local NO tenía el seed ejecutado (falta documentación
  visible para nuevos devs/agentes).
- Comando oficial: `pnpm --filter @repo/db db:seed`.
- Mismo .env (POS_DATABASE_URL=DATABASE_URL apuntan a
  `pos_chile_db@localhost:5432`).

### Cambios técnicos

1. **Seed extendido** con dataset mínimo:
   - 2 usuarios (admin + cajero, passwords conocidas dev only).
   - 1 caja "Caja Principal" en "Mostrador" — `findFirst+create`
     porque `Caja` no tiene unique key; flag `activa` preservada/
     restaurada en re-runs.
   - 1 categoría "Almacén" — upsert por `nombre @unique`.
   - 5 productos con códigos `DEMO-7800001..5` (Coca-Cola 1.5L,
     Pan de molde, Leche entera, Arroz 1kg, Aceite vegetal) —
     upsert por `codigoBarras @unique`.
   - 1 cliente "Cliente Demo" con RUT `11.111.111-1` (formato
     válido pero ficticio) — upsert por `rut @unique`.

2. **Patch oportunista `alertas-banner.tsx`** — migrado a
   `Alert variant="warning"` + `AlertTitle` + `AlertDescription` +
   `Button`. Animación `AnimatePresence+motion` (height 0 → auto +
   opacity) preservada — la sensación "vivo" del banner se mantiene.
   Cierra el último residuo del patrón viejo en el dashboard.

3. **Documentación en `CLAUDE.md`** — nueva subsección "🌱 Seed
   local (Fase 2E)" en Infraestructura Docker. Documenta comando,
   contenido, idempotencia, cuándo correrlo, advertencia "no usar
   en prod".

### Verificación

- Seed run #1: crea todo, IDs admin=1, cajero=2, caja=3, cat=5,
  productos=17-21, cliente=4.
- Seed run #2 (idempotencia): mismos IDs, sin duplicados.
- Login `admin@pos-chile.cl/admin123` → Dashboard "Hola,
  Administrador".
- Login `cajero@pos-chile.cl/cajero123` → Dashboard "Hola, Cajero".
- RBAC cajero: sidebar oculta sección "Administración" (Usuarios,
  Cajas, Mobile APK, API Docs). Navegar a `/usuarios` redirige
  server-side al Dashboard.

### Gate

- `pnpm --filter web type-check` ✅
- `pnpm --filter web lint` ✅
- `pnpm --filter web test` → **195 / 195** ✅
- `pnpm --filter web build` ✅
- `pnpm --filter @repo/mobile type-check` ✅
- `pnpm --filter @repo/mobile lint` ✅
- `pnpm --filter @repo/mobile exec jest --passWithNoTests --watchman=false`
  → **48 / 48** ✅

### Commits

- `121bd37` — `feat(dev): Fase 2E — seed local extendido + alertas-banner migrado a Alert`

### Gotcha cerrado

✅ **G-DEV-CAJERO** — cerrado. Cualquier nuevo agente/dev ahora puede
   correr `pnpm --filter @repo/db db:seed` y tener admin + cajero +
   dataset mínimo en su BD local sin fricción.

### Estado al cierre

✅ Fase 2E cerrada. Tres deudas chicas cerradas en un commit
   oportunista: G-DEV-CAJERO, último residuo amber hardcoded,
   documentación seed faltante.

🟢 Próxima fase: **2D Mobile + Sentry** (cuando Pierre tenga ventana
   con device) o **3A** features comerciales (CSV import productos
   primero — desbloquea onboarding de cliente con catálogo grande).
