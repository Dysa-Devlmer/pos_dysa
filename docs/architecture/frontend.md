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

## 4.1. Componentes UX unificados (Fase 2C)

Tres componentes Server-puros estandarizan patrones repetidos en las
rutas operativas del dashboard. Si vas a tocar UI de una ruta, **prefiérelos**
antes de hand-rollear divs+clases.

### `<PageHeader title subtitle? action? meta? />`

Header estándar para rutas operativas (`/caja`, `/ventas`, `/productos`,
`/clientes`, `/devoluciones`, `/perfil`, `/mobile-releases`, ...).

```tsx
import { PageHeader } from "@/components/page-header";

<PageHeader
  title="Ventas"
  subtitle="Historial de ventas con filtro por rango de fechas."
  action={
    <Button asChild>
      <Link href="/ventas/nueva">
        <Plus className="size-4" />
        Nueva venta
      </Link>
    </Button>
  }
/>
```

Reglas:

- `title` siempre `text-2xl font-bold tracking-tight` — sobrio.
- **No iconos en h1** por defecto. Iconos viven en botones, KpiCards,
  Alerts o tabs.
- Layout responsive: `flex-col` mobile, `sm:flex-row` desktop. El slot
  `action` queda alineado a la derecha en desktop y debajo en mobile.
- Excepción documentada: `/` (dashboard root) mantiene su header
  "premium" con `font-display` + sections tagged. NO replicar ese estilo
  en otras rutas.

### `<KpiCard label value sublabel? tone? />`

Card de KPI operacional con densidad alta. Server Component. Reemplaza
dos patrones que coexistían pre-2C:
- `<Card>`-en-`<Card>` con `<CardHeader>`/`<CardContent>` (visualmente pesado).
- divs hand-rolled `rounded-md border bg-background p-3` (sin tone, sin
  tabular-nums, sin consistencia).

```tsx
<KpiCard label="Total facturado" value={formatCLP(total)} />
<KpiCard
  label="Monto devuelto"
  value={formatCLP(devuelto)}
  sublabel="CLP (IVA incluido)"
  tone="amber"
/>
```

Tones: `default` | `amber` | `destructive` | `success`. Cada tono respeta
dark mode con `dark:text-...-400`. **No** anidar Cards dentro de Cards.

### `<Alert variant title description action? />`

Banner/alerta con variants tipadas (cva). Reemplaza banners hand-rolled
con colores hardcoded `amber-50/950`.

```tsx
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

<Alert variant="warning">
  <AlertTitle>No hay categorías activas</AlertTitle>
  <AlertDescription>
    Debes crear al menos una categoría antes de registrar productos.
  </AlertDescription>
  <Button asChild variant="outline" size="sm" className="mt-3">
    <Link href="/categorias">Ir a categorías</Link>
  </Button>
</Alert>
```

Variants: `default` | `warning` | `destructive` | `success`. Tokens del
design system; dark mode automático.

## 4.2. Error boundaries

- **Global** (`app/error.tsx`) — fullscreen con animación, fallback
  cuando todo falla. Mantener para errores fuera de un layout.
- **Dashboard** (`app/(dashboard)/error.tsx`, Fase 2C) — boundary
  anidado al segmento. **El sidebar y header siguen visibles**; el
  cajero no pierde contexto. Usa `<Alert variant="destructive">` +
  botones Reintentar (`reset()`) y Volver al dashboard.

Política: cada segmento de alta superficie debería tener su propio
`error.tsx` para que un fallo en `/devoluciones` no tumbe la
navegación. Hoy solo `(dashboard)` lo tiene; expandir si en el futuro
hay segmentos que ameriten boundary propio.

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
