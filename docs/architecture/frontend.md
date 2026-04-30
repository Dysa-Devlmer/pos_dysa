# Frontend web — Next.js 15 App Router

> **App:** `apps/web/`
> **Stack:** Next.js 15.3 + React 19 + Tailwind v4 + shadcn/ui + framer-motion
> **Renderizado por defecto:** Server Components (RSC). `"use client"` sólo
> cuando hay hooks o estado de UI.

## 1. Estructura de rutas

```
apps/web/app/
├── (auth)/                  # login, recover (si aplica)
├── (dashboard)/             # área autenticada
│   ├── layout.tsx           # sidebar + topbar + sesión
│   ├── page.tsx             # /dashboard (KPIs, charts)
│   ├── caja/                # POS — carrito real-time
│   ├── cajas/               # apertura/cierre + movimientos
│   ├── ventas/              # historial + editar/eliminar/restaurar
│   │   ├── actions.ts       # crearVenta, editarVenta, eliminarVenta...
│   │   └── __tests__/       # vitest specs
│   ├── devoluciones/        # parciales y totales
│   ├── productos/           # CRUD + alertas stock bajo
│   ├── categorias/
│   ├── clientes/
│   ├── usuarios/            # solo ADMIN
│   ├── perfil/              # avatar base64, datos, password
│   ├── reportes/            # PDF (@react-pdf) + Excel (exceljs)
│   ├── alertas/             # stock bajo
│   ├── docs/                # /docs (Scalar API reference)
│   └── mobile-releases/     # publica APKs
├── api/                     # ver backend.md
└── layout.tsx               # root layout (theme provider, fonts)
```

## 2. Convenciones React / RSC

```tsx
// ✅ Server Component por defecto (sin "use client").
// Acceso a Prisma, cookies, headers, fetch sin restricciones.
export default async function VentasPage() {
  const ventas = await prisma.venta.findMany({ where: { deletedAt: null } });
  return <VentasTable rows={ventas} />;
}

// ✅ Client Component sólo cuando se necesita estado/hooks.
"use client";
export function CartButton() {
  const [open, setOpen] = useState(false);
  // ...
}
```

Reglas:

- Mutaciones SIEMPRE vía Server Actions (`actions.ts` colocalizado).
- No fetchear desde Client Components hacia `/api/v1/*` propio — usar Server Actions.
- `/api/v1/*` se expone para mobile y terceros, no para el propio frontend.
- Navegación con `next/link`; `revalidatePath` después de mutaciones.

## 3. Server Actions — pattern canónico

```ts
// apps/web/app/(dashboard)/ventas/actions.ts
"use server";

import { auth } from "@/auth";
import { prisma } from "@repo/db";
import { ventaCreateSchema } from "@repo/domain";

export async function crearVenta(input: unknown) {
  const session = await auth();
  if (!session) return { ok: false, error: "no auth" } as const;

  const parsed = ventaCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message } as const;
  }

  return await prisma.$transaction(async (tx) => {
    // ...stock, ventas, compras, ultimaCompra, AuditLog
    return { ok: true, ventaId } as const;
  });
}
```

- Discriminated union de retorno: `{ ok: true, ... } | { ok: false, error }`.
- Validación con Zod (`@repo/domain`) antes de tocar la BD.
- Operaciones críticas (crear/editar/eliminar venta, devolución) en
  `prisma.$transaction`.
- Auth siempre antes de validar input.

## 4. Estilos — Tailwind v4 + shadcn/ui

- Sin `tailwind.config.js` — Tailwind v4 es CSS-native (`@import "tailwindcss";` en `globals.css`).
- shadcn/ui en estilo **new-york**, con `"config": ""` en `components.json`.
- Componentes generados viven en `apps/web/components/ui/`.
- Variantes con `class-variance-authority`; combinación con `clsx` + `tailwind-merge` (`cn()`).
- Theme: `next-themes` (light/dark) con toggle en topbar.
- Animaciones: `framer-motion` (sin `tailwindcss-animate`, incompatible con v4).

```tsx
// Ejemplo cn() pattern
import { cn } from "@/lib/utils";
<div className={cn("rounded-md border", error && "border-destructive")} />
```

## 5. Formularios

- `react-hook-form` + `@hookform/resolvers/zod` + schemas de `@repo/domain`.
- Submit dispara Server Action; respuesta `{ ok, error }` se renderiza en
  el `<Form>` con toasts (`sonner`).
- Validación cliente (UX) + servidor (seguridad) con el mismo schema.

## 6. Tablas y data display

- `@tanstack/react-table` para grids.
- Sorting/filtering client-side cuando dataset < 1k filas.
- Server-side pagination cuando dataset crece (ventas históricas).
- Charts: `recharts` (dashboard KPIs, ventas-chart).

## 7. Reportes PDF / Excel

- PDF: `@react-pdf/renderer` — componente declarativo, render en server.
- Excel: `exceljs` — generación en API route (`/api/reportes/excel`).
- Ambos respetan filtros de fecha + soft-delete.

## 8. Auth UX

- Login: Server Action en `(auth)/login`. Pattern con `redirect: false`
  y `redirect("/")` manual (gotcha NextAuth v5 beta).
- Sesión leída en Server Components con `await auth()`.
- Roles: `ADMIN` y `CAJERO`. Vistas de admin (`/usuarios`, `/dashboard`) bloqueadas
  por server-side check + middleware.

## 9. Imágenes y assets

- Next Image con `sharp` (declarado en `serverExternalPackages`).
- Avatares como base64 data URL en BD — sin volumen Docker ni filesystem.
- Brand assets generados con `scripts/generate-brand-assets.mjs`.

## 10. Performance

- Turbopack en dev (`next dev --turbopack`).
- Build standalone (`output: "standalone"`) para Docker.
- Sentry profiling activable por env var en prod.
- Rate-limit en API v1 con `@upstash/ratelimit` + Upstash Redis.

## 11. Gotchas activos (frontend)

| # | Gotcha |
|---|--------|
| 3 | `app/page.tsx` NO coexiste con `app/(dashboard)/page.tsx` — colisión de ruta. |
| 5 | Tailwind v4: prohibido `tailwindcss-animate` y `tailwind.config.js`. |
| 6 | `apps/web/.env.local` en `apps/web/`, NO en raíz del monorepo. |
| 9 | login action: `redirect: false` + `redirect("/")` manual. |
| 11 | `@tailwindcss/oxide` en `pnpm.onlyBuiltDependencies`. |
| 12 | `sharp` en `serverExternalPackages`. |
| 77 | Server Actions NO se validan con `curl` — siempre browser incógnito. |

Fuente viva: `memory/projects/pos-chile-monorepo.md`.
