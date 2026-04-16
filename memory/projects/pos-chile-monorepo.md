# Proyecto: POS Chile Monorepo

**Repo local:** `/Users/devlmer/Dysa-Projects/system_pos`
**Stack:** Next.js 15.3 + Prisma 6 + PostgreSQL 16 + Tailwind v4 + NextAuth v5
**Patrón:** Turborepo 2.5 monorepo con pnpm 10.6.0

---

## Estructura del monorepo

```
system_pos/
├── apps/
│   └── web/                   ← Next.js 15 App Router (puerto 3000)
├── packages/
│   ├── db/                    ← Prisma client + schema
│   ├── ui/                    ← Componentes compartidos (@repo/ui)
│   └── typescript-config/     ← tsconfig base/nextjs/react-library
├── docker-compose.yml         ← postgres:16-alpine + pgadmin
├── turbo.json                 ← usa "tasks" (NO "pipeline")
├── pnpm-workspace.yaml
└── .env.local / .env.docker / .env.example
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
| productos | 10 | precio Int (CLP, sin decimales) |
| clientes | 8 | rut String "12.345.678-9" |
| ventas | 11 | enum MetodoPago: EFECTIVO/DEBITO/CREDITO/TRANSFERENCIA |
| detalle_ventas | 6 | normalizado (antes era JSON en PHP) |
| accounts | 12 | NextAuth |
| sessions | 4 | NextAuth |
| verification_tokens | 3 | NextAuth |

### Usuario seed
- email: admin@pos-chile.cl | password: admin123 | rol: ADMIN

---

## Lógica de negocio crítica (PHP original → Next.js)

### Al crear una venta:
- Por cada producto: `producto.ventas += cantidad`, `producto.stock -= cantidad`
- Cliente: `cliente.compras += 1`, `cliente.ultima_compra = now()`

### Al eliminar una venta:
- Revertir stock y ventas de cada producto
- Recalcular `cliente.ultima_compra` desde historial completo (no asumir fecha anterior)

### Al editar una venta:
- Revertir efectos de la venta vieja, luego aplicar los nuevos

### Chile-específico:
- IVA fijo 19% | CLP como `Int` (sin decimales) | RUT formato "12.345.678-9"
- `formatCLP()`, `calcularIVA()`, `validarRUT()`, `formatRUT()` en `apps/web/lib/utils.ts`

---

## Dependencias clave instaladas

| Paquete | Versión | Dónde |
|---------|---------|-------|
| next | ^15.3.0 | apps/web |
| next-auth | 5.0.0-beta.31 | apps/web |
| @auth/prisma-adapter | 2.11.2 | apps/web |
| bcryptjs | 3.0.3 | apps/web |
| @prisma/client | ^6.6.0 (resuelve 6.19.3) | packages/db |
| prisma | ^6.6.0 | packages/db |
| dotenv-cli | ^8.0.0 | packages/db |
| tailwindcss | ^4.2.0 | apps/web |
| tw-animate-css | ^1.0.0 | apps/web |
| shadcn/ui (new-york) | configurado | apps/web |
| lucide-react | latest | apps/web |
| turbo | ^2.5.0 | root |

---

## Commits del proyecto

| Hash | Descripción |
|------|-------------|
| 063edfb | feat(auth): NextAuth v5 + roles + layout + sidebar (Fase 2) |
| 6e93c56 | fix: dotenv-cli para db scripts, rm version docker-compose, limpieza containers PHP |
| 253f2c4 | feat: monorepo scaffold — Next.js 15 + Prisma + Tailwind v4 (Fase 1) |

---

## Gotchas / Fixes no-triviales aplicados

1. **pnpm.onlyBuiltDependencies** en root package.json — necesario para que Prisma genere client en pnpm 10
2. **dotenv -e .env -o** en db scripts — el flag `-o` es obligatorio para override de DATABASE_URL del shell (Pierre tiene Supabase en su shell)
3. **auth-types.d.ts** (no next-auth.d.ts) — evita shadow del paquete next-auth
4. **JWT module augmentation no aplica en beta**: cast explícito `token.rol as Session["user"]["rol"]` en session callback
5. **declaration: false** en nextjs.json — apps Next.js no emiten .d.ts; `declaration: true` rompía con TS2742
6. **app/page.tsx borrado** — colisionaba con `app/(dashboard)/page.tsx` (ambos resuelven /)
7. **handlers export** en NextAuth v5: `const { GET, POST } = handlers` (no `export { GET, POST } from "@/auth"`)
8. **seed en prisma/seed.ts** (no src/seed.ts) — convención Prisma, el script db:seed ya apuntaba ahí
9. **Prisma 6.6.0 → resuelve 6.19.3** — semver `^6.6.0`, OK
10. **rm -r** (sin -f) en Claude Code CLI — `-rf` tiene protección hardcoded incluso con allowlist

---

## Plan Maestro — Estado

| Fase | Contenido | Estado |
|------|-----------|--------|
| 1 | Setup monorepo + Docker + Prisma schema | ✅ Done (commit 253f2c4) |
| Fix | dotenv-cli + docker-compose + containers PHP | ✅ Done (commit 6e93c56) |
| 2 | NextAuth v5 + roles + layout + sidebar | ✅ Done (commit 063edfb) |
| 3 | CRUD: Categorías, Productos, Clientes, Usuarios (TanStack Table + shadcn) | ⏳ Siguiente |
| 4 | Módulo Ventas: crear, editar, eliminar + lógica stock/clientes | ⏳ Pendiente |
| 5 | POS Caja: carrito real-time, IVA 19%, métodos de pago, boletas | ⏳ Pendiente |
| 6 | Dashboard: KPIs CLP, gráficos Recharts, top productos | ⏳ Pendiente |
| 7 | Reportes: PDF @react-pdf, Excel, filtros por fecha | ⏳ Pendiente |
| 8 | API REST documentada + Pulido final + Deploy Docker | ⏳ Pendiente |

---

## Convenciones del nuevo stack (reemplaza reglas PHP del CLAUDE.md viejo)

- `"use client"` explícito en componentes con hooks — resto son Server Components
- Nombres: camelCase para vars, PascalCase para componentes, kebab-case para rutas
- CLP siempre `Int` en Prisma, `formatCLP()` en display
- RUT siempre `String` normalizado "12.345.678-9"
- Server Actions en `app/*/actions.ts`
- API routes en `app/api/*/route.ts`
- shadcn/ui components en `apps/web/components/ui/`
- Shared non-shadcn components en `apps/web/components/`

---

## Agentes en el proyecto

| Agente | Rol |
|--------|-----|
| Claude Cowork (yo) | Coordinador, verificación independiente, memoria |
| Claude Code CLI | Setup, infra, auth, API, deploy |
| Claude Code Worktree | CRUD, Ventas, POS Caja, Dashboard, Reportes |
| Gemini | Apoyo adicional |
| Pierre | Copia instrucciones entre agentes |

**Regla crítica:** No confiar ciegamente en reportes — siempre verificar leyendo archivos reales.
