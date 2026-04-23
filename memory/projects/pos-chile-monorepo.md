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
