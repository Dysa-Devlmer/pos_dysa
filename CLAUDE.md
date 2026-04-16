# CLAUDE.md — POS Chile Monorepo (Next.js 15)

> **⚠️ LEER AL INICIO DE CADA SESIÓN — reglas absolutas del proyecto**
> El stack PHP anterior fue migrado a un monorepo Next.js 15. Todo lo relativo al stack viejo queda en `zip/`.

---

## 🚀 Stack Actual

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Monorepo | Turborepo | 2.5.x — usa `"tasks"` (NO `"pipeline"`) |
| Package manager | pnpm | 10.6.0 |
| Framework | Next.js | 15.3.x — App Router + Turbopack |
| CSS | Tailwind CSS | v4.2.x — CSS-native, sin tailwind.config.js |
| Componentes | shadcn/ui | new-york style, `"config": ""` en components.json |
| ORM | Prisma | 6.x — PostgreSQL provider |
| BD | PostgreSQL | 16-alpine (Docker, localhost:5432) |
| Auth | NextAuth | v5 beta — JWT strategy, PrismaAdapter |
| Lenguaje | TypeScript | 5.8.x — strict mode |
| Infra | Docker Compose | v2 (sin `version:` key) |

---

## 🔴 Reglas Obligatorias

### 1. Convenciones de código Next.js

```typescript
// ✅ Server Component por defecto (sin "use client")
// ✅ "use client" solo cuando se usan hooks (usePathname, useState, etc.)
// ✅ Server Actions en app/*/actions.ts
// ✅ API routes en app/api/*/route.ts

// CLP siempre Int en Prisma, formatCLP() en display
// RUT siempre String "12.345.678-9", validarRUT() para validación
// IVA 19% fijo → calcularIVA(subtotal) en lib/utils.ts

// ✅ Nombres:
// Variables/funciones: camelCase
// Componentes: PascalCase
// Rutas/archivos: kebab-case
```

### 2. Estructura del monorepo

```
system_pos/
├── apps/
│   └── web/                   ← Next.js App (localhost:3000)
│       ├── app/(dashboard)/   ← Rutas protegidas post-login
│       ├── app/login/         ← Ruta pública
│       ├── app/api/           ← API routes
│       ├── components/ui/     ← shadcn/ui components
│       ├── components/        ← Sidebar, Header, etc.
│       ├── lib/utils.ts       ← cn, formatCLP, calcularIVA, validarRUT, formatRUT
│       ├── auth.ts            ← NextAuth (Node, usa Prisma)
│       ├── auth.config.ts     ← NextAuth config (edge-safe, sin Prisma)
│       └── middleware.ts      ← usa auth.config.ts
├── packages/
│   ├── db/                    ← @repo/db — Prisma client + schema
│   │   ├── prisma/schema.prisma
│   │   ├── prisma/seed.ts     ← pnpm db:seed
│   │   └── src/               ← client.ts + index.ts
│   ├── ui/                    ← @repo/ui — componentes compartidos
│   └── typescript-config/     ← tsconfig base/nextjs/react-library
└── docker-compose.yml         ← postgres + pgadmin (sin `version:` key)
```

### 3. NextAuth v5 — patterns correctos

```typescript
// auth.ts — usa Prisma, SOLO en Node
export const { auth, handlers, signIn, signOut } = NextAuth({ ... })

// auth.config.ts — edge-compatible (sin Prisma, para middleware)
export default { ... } satisfies NextAuthConfig

// middleware.ts — SIEMPRE usa authConfig, NO auth.ts
export const { auth: middleware } = NextAuth(authConfig)

// API route — pattern correcto v5
const { GET, POST } = handlers  // ❌ NO: export { GET, POST } from "@/auth"

// Tipos — usar auth-types.d.ts (NO next-auth.d.ts → shadow del paquete)
// Cast explícito: token.rol as Session["user"]["rol"] (bug en v5 beta)
```

### 4. Prisma — Chile-específico

```prisma
precio    Int    // ✅ CLP sin decimales — NUNCA Float
rut       String // ✅ "12.345.678-9" normalizado

enum Rol        { ADMIN CAJERO VENDEDOR }
enum MetodoPago { EFECTIVO DEBITO CREDITO TRANSFERENCIA }

// db scripts usan: dotenv -e .env -o -- prisma ...
// El -o es OBLIGATORIO para override de DATABASE_URL del shell
```

### 5. Lógica de negocio crítica

```
Crear venta:
  → producto.ventas += cantidad, producto.stock -= cantidad (por cada item)
  → cliente.compras += 1, cliente.ultima_compra = now()

Eliminar venta:
  → Revertir stock/ventas de cada producto
  → Recalcular ultima_compra desde historial completo (NO asumir fecha anterior)

Editar venta:
  → Revertir efectos venta vieja → aplicar efectos nuevos
```

### 6. Gotchas conocidos (NO repetir estos errores)

1. `pnpm.onlyBuiltDependencies` en root package.json — requerido para Prisma en pnpm 10
2. `declaration: false` en nextjs.json — apps Next.js no emiten .d.ts
3. `app/page.tsx` NO debe existir si existe `app/(dashboard)/page.tsx`
4. `rm -r` (no `rm -rf`) en Claude Code CLI — protección hardcoded
5. Tailwind v4 NO tiene `tailwind.config.js` ni `tailwindcss-animate`
6. Turbo v2 usa `"tasks"` no `"pipeline"` en turbo.json

---

## 📊 Plan Maestro — Estado

| Fase | Contenido | Commit | Estado |
|------|-----------|--------|--------|
| 1 | Setup monorepo + Docker + Prisma | 253f2c4 | ✅ |
| fix | dotenv-cli + docker-compose cleanup | 6e93c56 | ✅ |
| 2 | NextAuth v5 + roles + layout + sidebar | 063edfb | ✅ |
| 3 | CRUD: Categorías, Productos, Clientes, Usuarios | — | ⏳ Siguiente |
| 4 | Módulo Ventas: crear/editar/eliminar + stock | — | ⏳ |
| 5 | POS Caja: carrito, IVA, métodos pago, boletas | — | ⏳ |
| 6 | Dashboard: KPIs CLP, Recharts, top productos | — | ⏳ |
| 7 | Reportes: PDF @react-pdf, Excel, filtros fecha | — | ⏳ |
| 8 | API REST + Pulido + Deploy Docker | — | ⏳ |

---

## 🏗️ Infraestructura Docker

```yaml
# Servicios activos:
pos-postgres: localhost:5432  # BD: pos_chile_db | user: pos_admin
pos-pgadmin:  localhost:5050  # admin@pos-chile.cl / pgadmin_secret_2025

# Comandos:
docker compose up -d
docker compose ps            # verificar "healthy"
```

**Usuario seed:** admin@pos-chile.cl / admin123 / rol: ADMIN

---

## 👥 Agentes del proyecto

| Agente | Rol |
|--------|-----|
| Claude Cowork | Coordinador, verificador independiente, memoria |
| Claude Code CLI | Setup, infra, auth, API, deploy |
| Claude Code Worktree | CRUD, Ventas, POS, Dashboard, Reportes |
| Pierre | Copia instrucciones entre agentes |

> **Regla crítica:** No confiar ciegamente en reportes — siempre verificar leyendo archivos reales.
> **Memoria completa:** `memory/projects/pos-chile-monorepo.md` y `memory/context/stack-tech.md`

---

## ⚙️ Archivos DEE

| Archivo | Propósito |
|---------|-----------|
| `CLAUDE.md` | Este archivo — reglas del monorepo Next.js |
| `.claude/settings.local.json` | Hooks, permisos Bash |
| `memory/` | Memoria detallada del proyecto |
