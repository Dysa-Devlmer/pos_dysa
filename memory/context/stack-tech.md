# Stack Técnico — POS Chile Monorepo

## Versiones exactas

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Runtime | Node.js | 22.x |
| Package manager | pnpm | 10.6.0 |
| Monorepo | Turborepo | 2.5.x |
| Framework | Next.js | 15.3.x (App Router) |
| Dev server | Turbopack | `next dev --turbopack` |
| Lenguaje | TypeScript | 5.8.x (resuelve 5.9.3) |
| CSS | Tailwind CSS | v4.2.x (CSS-native, sin tailwind.config.js) |
| CSS extras | tw-animate-css | 1.x (reemplaza tailwindcss-animate) |
| Componentes | shadcn/ui | new-york style, `"config": ""` → Tailwind v4 |
| ORM | Prisma | 6.6.0 (resuelve 6.19.3) |
| BD | PostgreSQL | 16-alpine (Docker) |
| Auth | NextAuth | v5.0.0-beta.31 (App Router) |
| Auth adapter | @auth/prisma-adapter | 2.11.2 |
| Password | bcryptjs | 3.0.3 |
| Contenedores | Docker Compose | v2 |
| Timezone | America/Santiago | TZ + PGTZ en Docker |

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
```
