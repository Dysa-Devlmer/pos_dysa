---
title: Stack Técnico — Versiones, Deps y Convenciones
tags:
  - stack
  - dependencias
  - versiones
  - contexto
aliases:
  - Stack Tech
  - Tech Stack
---

# Stack Técnico — POS Chile Monorepo

Inventario vivo de versiones, deps y convenciones del stack de [[pos-chile-monorepo]]. Este es el documento fuente de verdad sobre "qué librería" y "qué versión".

Relacionado: [[pos-chile-monorepo]] · [[auth-patterns]] · [[security-owasp]] · [[infra-docker]] · [[business-logic]]

## Versiones exactas (núcleo)

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Runtime | Node.js | 22.x (alpine en Docker) |
| Package manager | pnpm | 10.6.0 |
| Monorepo | Turborepo | 2.5.x → resuelve 2.9.6 |
| Framework | Next.js | 15.3.x → resuelve 15.5.15 (App Router + Turbopack) |
| Dev server | Turbopack | `next dev --turbopack` |
| Lenguaje | TypeScript | 5.8.x → resuelve 5.9.3 (strict mode, `declaration: false`) |
| CSS | Tailwind CSS | v4.2.x (CSS-native, sin `tailwind.config.js`) |
| CSS binary | @tailwindcss/oxide | requerido en `pnpm.onlyBuiltDependencies` |
| CSS extras | tw-animate-css | 1.x (reemplaza `tailwindcss-animate` v3) |
| Componentes | shadcn/ui | new-york style, `"config": ""` → Tailwind v4 |
| Componentes radix | @radix-ui/react-* | latest (usados por shadcn) |
| ORM | Prisma | 6.6.0 → resuelve 6.19.3 |
| BD | PostgreSQL | 16-alpine (Docker) |
| Auth | NextAuth | v5.0.0-beta.31 (App Router) |
| Auth adapter | @auth/prisma-adapter | 2.11.2 |
| Password | bcryptjs | 3.0.3 (cost 12) |
| Contenedores | Docker Compose | v2 (sin `version:` key) |
| Timezone | America/Santiago | `TZ` + `PGTZ` en Docker env |

## Tailwind v4 — diferencias críticas

```css
/* ✅ Correcto v4 */
@import "tailwindcss";
@import "tw-animate-css";
@theme inline { ... }

/* ❌ NO existe en v4 */
/* tailwind.config.js */
/* tailwindcss-animate */
```

## Turborepo 2.x — diferencia crítica

```json
// ✅ turbo.json v2 usa "tasks"
{ "tasks": { "build": { ... } } }

// ❌ NO usar "pipeline" (era v1)
{ "pipeline": { ... } }
```

## NextAuth v5 — patterns correctos

```typescript
// auth.ts — solo en Node (usa Prisma)
export const { auth, handlers, signIn, signOut } = NextAuth({ ... })

// auth.config.ts — edge-compatible (sin Prisma)
export default { ... } satisfies NextAuthConfig

// middleware.ts — usa auth.config.ts (NO auth.ts)
export const { auth: middleware } = NextAuth(authConfig)

// API route
const { GET, POST } = handlers  // NO: export { GET, POST } from "@/auth"

// Tipos
// ✅ auth-types.d.ts (NO next-auth.d.ts — shadow)
```

## Prisma — convenciones Chile

```prisma
precio    Int    // CLP sin decimales
rut       String // "12.345.678-9"

enum Rol { ADMIN CAJERO VENDEDOR }
enum MetodoPago { EFECTIVO DEBITO CREDITO TRANSFERENCIA }
```

## shadcn/ui — config v4

```json
// components.json
{
  "style": "new-york",
  "tailwind": { "config": "" }  // "" señala Tailwind v4 CSS-first
}
```

## Archivos de env

| Archivo | Uso |
|---------|-----|
| .env.local | Desarrollo local (DATABASE_URL → localhost:5432) |
| .env.docker | Docker interno (DATABASE_URL → postgres:5432) |
| .env.example | Template commiteado |
| packages/db/.env | Usado por Prisma CLI via dotenv-cli -o |

## Dependencias de features (apps/web)

| Feature | Librería | Versión | Fase |
|---------|----------|---------|------|
| Forms | react-hook-form + @hookform/resolvers + zod | latest | 3 |
| Tablas | @tanstack/react-table | latest | 3 |
| Fechas | date-fns | latest | 3 |
| IDs únicos | nanoid | latest | 4 (boleta) |
| Charts | recharts | latest | 6 |
| PDF | @react-pdf/renderer | latest | 7 |
| Excel | exceljs | ^4.4.0 | 7 (migrado de xlsx, ver [[security-owasp#Audit 1]]) |
| Iconos | lucide-react | latest | base |
| Animaciones | framer-motion | ^11.x | 13 |
| Theming | next-themes | latest | 13 (dark mode) |
| Toasts | sonner | latest | base (`<Toaster />` en root layout) |
| Imágenes | sharp | latest | 9 (avatar 200×200 JPEG) |
| Rate limit | @upstash/ratelimit + @upstash/redis | 2.0.8 / 1.37.0 | 14 |
| Observability | @sentry/nextjs | 10.49.0 | GAP-2 (commit `2b90ed8`) |
| API docs | @scalar/nextjs-api-reference | 0.10.8 | Fase 8 fix (reemplazó swagger-ui-react por React 19 peer dep) |
| Testing | vitest | 4.1.4 | Fase 8 (57/57 tests) |

## Comandos importantes

```bash
# Desarrollo
pnpm dev                  # Turbopack en localhost:3000

# Base de datos (desde raíz — turbo propaga)
pnpm db:push              # Sync schema → BD (dotenv -o sobrescribe DATABASE_URL del shell)
pnpm db:migrate           # Migrations Prisma
pnpm db:studio            # Prisma Studio
pnpm db:seed              # Seed (admin@pos-chile.cl / admin123)
pnpm db:generate          # Regenerar Prisma Client

# Docker
docker compose up -d      # Levantar postgres + pgadmin
docker compose ps         # Ver estado (buscar "healthy")

# Calidad
pnpm type-check           # TypeScript sin errores
pnpm build                # Build producción
pnpm test                 # Vitest — 57/57 passing
```

## Gotchas por capa

> [!warning] pnpm 10 + Prisma
> `pnpm.onlyBuiltDependencies` en `package.json` root **debe incluir** `@prisma/client`, `@prisma/engines`, `@tailwindcss/oxide`, `sharp`. Sin esto, pnpm 10 no ejecuta postinstall scripts y Prisma no genera el client → 404 en runtime.

> [!warning] Turbopack + `@prisma/client`
> `apps/web/package.json` debe declarar `@prisma/client` como dep directa (no solo transitiva por `@repo/db`) + `next.config.ts` debe tener `serverExternalPackages: ["@prisma/client"]`. Sin ambas, Turbopack isolation rompe en dev.

> [!danger] `declaration: true` en `nextjs.json`
> Rompe con TS2742 (tipos internos de Next/NextAuth no portables). Dejar `declaration: false`. El proyecto usa `packages/typescript-config/nextjs.json` como base.

> [!info] shadcn v4
> `components.json` debe tener `"tailwind": { "config": "" }` (string vacío). Esto señala a shadcn CLI que es Tailwind v4 (CSS-first) y no busca `tailwind.config.js`.

Ver [[pos-chile-monorepo#Gotchas]] para la lista completa numerada de 29 gotchas del proyecto.
