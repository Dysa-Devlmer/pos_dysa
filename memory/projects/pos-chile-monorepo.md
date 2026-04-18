# Proyecto: POS Chile Monorepo

**Repo local:** `/Users/devlmer/Dysa-Projects/system_pos`
**Stack:** Next.js 15.3 + Prisma 6 + PostgreSQL 16 + Tailwind v4 + NextAuth v5
**Patrón:** Turborepo 2.5 monorepo con pnpm 10.6.0

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

### Rol de Gemini — COMPLETADO (entre Fase 7 y 8)
Security Audit + Tests vitest. Integrados en commit acdcbce (Fase 8):
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

> **Regla crítica:** No confiar ciegamente en reportes — siempre verificar leyendo archivos reales.
