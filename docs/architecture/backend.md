# Backend — Server Actions + API REST v1 + Auth

> **App:** `apps/web/`
> **Stack:** Next.js 15 (Node runtime) + Prisma 6 + NextAuth v5 + Upstash rate-limit + Sentry

El backend de DyPos CL vive dentro de `apps/web`. Hay dos superficies de
mutación bien diferenciadas:

1. **Server Actions** — consumidas por el propio frontend (RSC).
2. **API REST `/api/v1/*`** — consumida por mobile y futuras integraciones.

Ambas comparten la lógica de dominio (`packages/domain`) y el cliente Prisma
(`packages/db`).

## 1. Server Actions

Ubicación canónica: `apps/web/app/(dashboard)/<modulo>/actions.ts`.

Módulos con actions:

- `caja/actions.ts` — abrir/cerrar caja, registrar movimiento.
- `categorias/actions.ts`
- `clientes/actions.ts`
- `dashboard/actions.ts` — KPIs y top productos.
- `devoluciones/actions.ts` — `crearDevolucion`.
- `productos/actions.ts`
- `usuarios/actions.ts`
- `ventas/actions.ts` — `crearVenta`, `editarVenta`, `eliminarVenta`, `restaurarVenta`.

Pattern: ver `frontend.md §3`. Reglas duras:

- `await auth()` al inicio.
- Validación Zod (schemas en `@repo/domain`).
- Respuesta tipada `{ ok: true, ... } | { ok: false, error: string }`.
- Mutaciones críticas en `prisma.$transaction`.
- AuditLog write dentro de la transacción cuando aplica.

### Invariante crítica de ventas

```
total === sum(PagoVenta.monto)
```

Cualquier action que crea/edita ventas DEBE garantizar esto. La regresión que
detectó Codex en `editarVenta` (Fase 0.1) violaba este invariante con split
tender — fix en commit `ba2ec6b`, regression tests en
`apps/web/app/(dashboard)/ventas/__tests__/editarVenta.test.ts`.

### Stock + contadores

```
crearVenta:    stock -= n,  ventas += n,  compras += 1,  ultimaCompra = now()
eliminarVenta: stock += n,  ventas -= n,  compras -= 1,  ultimaCompra = MAX(historial restante)
editarVenta:   revertir vieja + aplicar nueva (todo en una $transaction)
```

`ultimaCompra` al eliminar NO se asume "venta anterior" — se recalcula buscando
`MAX(fecha)` del historial restante del cliente.

## 2. API REST v1

Base path: `/api/v1/`. Auth: **JWT Bearer** (no cookies). Rate-limit: Upstash.

Inventario actual:

```
POST   /api/v1/auth/login              → emite JWT (mobile login)
GET    /api/v1/usuarios/me             → perfil sesión
PATCH  /api/v1/usuarios/me/password    → cambio password
GET    /api/v1/productos               → catálogo (cache mobile)
GET    /api/v1/productos/[id]
GET    /api/v1/categorias
GET    /api/v1/clientes
GET    /api/v1/clientes/[id]
GET    /api/v1/ventas
POST   /api/v1/ventas                  → crear venta desde mobile
GET    /api/v1/ventas/[id]
GET    /api/v1/devoluciones
POST   /api/v1/devoluciones
GET    /api/v1/devoluciones/[id]
GET    /api/v1/dashboard               → KPIs read-only
GET    /api/v1/caja/aperturas
POST   /api/v1/caja/aperturas
GET    /api/v1/caja/aperturas/activa
GET    /api/v1/caja/aperturas/[id]
POST   /api/v1/caja/aperturas/[id]/movimientos
```

Otras rutas no-versionadas:

- `GET /api/health` — liveness probe usado por Docker y `deploy.sh`.
- `GET /api/docs`, `GET /api/docs/spec` — Scalar API reference + OpenAPI JSON.
- `GET /api/mobile/manifest` — release info de la APK pública.
- `POST /api/perfil/avatar` — upload base64.
- `GET /api/reportes/excel` — exporta XLSX con filtros de fecha.
- `/api/auth/[...nextauth]` — handlers NextAuth (cookies web).

### Pattern API route

```ts
// apps/web/app/api/v1/ventas/route.ts
import { NextResponse } from "next/server";
import { requireBearer } from "@/lib/api/bearer";
import { rateLimit } from "@/lib/api/rate-limit";
import { ventaCreateSchema } from "@repo/domain";

export async function POST(req: Request) {
  const rl = await rateLimit(req);
  if (!rl.ok) return NextResponse.json({ error: "rate_limit" }, { status: 429 });

  const session = await requireBearer(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = ventaCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const result = await crearVentaCore(parsed.data, session);
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
```

Reglas:

- Bearer obligatorio (excepto `/auth/login` y `/health`).
- Validación Zod con schemas compartidos con web.
- Códigos HTTP semánticos: 200/201/400/401/404/422/429/500.
- Lógica de negocio extraída a `*Core` reutilizable entre Server Action y route.

## 3. Auth — NextAuth v5

Archivos:

- `auth.ts` — config Node, exporta `{ auth, handlers, signIn, signOut }`.
- `auth.config.ts` — config edge-safe, usado por middleware.
- `middleware.ts` — `export const { auth: middleware } = NextAuth(authConfig)`.
- `auth-types.d.ts` — augmentación tipos (NO `next-auth.d.ts`, shadow).

Estrategia: **JWT** (no DB sessions) con `PrismaAdapter`. Cookies en web,
Bearer en mobile (mismo secret, distinta forma de leer).

### Roles

- `ADMIN` — full acceso.
- `CAJERO` — caja + ventas + devoluciones; sin `/usuarios`, sin `/reportes`
  destructivos, sin `/dashboard` (RBAC verificado en smoke prod 2026-04-30).

Cast obligatorio (bug v5 beta): `token.rol as Session["user"]["rol"]`.

## 4. Rate limiting

`@upstash/ratelimit` + `@upstash/redis`. Configurado en `lib/api/rate-limit.ts`.
Aplicado a todas las rutas `/api/v1/*` y `/api/auth/*`. Si el env var Upstash
no está seteada en CI/dev, el limiter degrada a no-op (no rompe builds).

## 5. Validación y contratos compartidos

Todos los schemas Zod viven en `packages/domain/src/`:

- `venta.ts`, `producto.ts`, `cliente.ts`, `categoria.ts`, `usuario.ts`,
  `caja.ts`, `devolucion.ts`, `pago.ts`, ...

Mobile usa los mismos schemas vía `@repo/api-client` para validar respuestas
y request bodies. Esto garantiza contrato bidireccional sin OpenAPI codegen.

## 6. Observabilidad

- **Sentry** (`@sentry/nextjs`) — errors + traces. DSN por env (`SENTRY_DSN`).
- **Health endpoint** — JSON con `{ ok, db, version, uptime }`.
- **AuditLog** — toda acción destructiva o sensible queda registrada
  (ver `database.md`).

## 7. Errores y reportes al usuario

- Server Actions retornan `{ ok: false, error: "string legible en español" }`.
- API routes retornan JSON `{ error }` con status correcto.
- Errores 500 reportados a Sentry; al usuario se le devuelve mensaje genérico.

## 8. Gotchas activos (backend)

| # | Gotcha |
|---|--------|
| 7 | `@prisma/client` como dep directa en `apps/web/` + `serverExternalPackages`. |
| 8 | `POS_DATABASE_URL` en PrismaClient (Pierre tiene `DATABASE_URL` Supabase shell). |
| 10 | `client.ts` valida `POS_DATABASE_URL` al cargar — sin fallback hardcoded. |
| 75 | `docker compose up` sin `--force-recreate` no recarga código nuevo. |
| 77 | Smoke prod siempre browser, nunca curl para Server Actions. |
| G-M54 | Vitest + `@repo/db` requiere mock env vars en CI Test step. |

## 9. Tareas Pierre vs agentes (backend)

| Tarea | Quién |
|-------|-------|
| Tocar lógica de Server Actions / API v1 | Agentes |
| Diseñar nuevos endpoints públicos | Agentes + ADR |
| Rotar `NEXTAUTH_SECRET` o credenciales DB | **Pierre** |
| Configurar Upstash y Sentry DSN en `.env.docker` | **Pierre** |
