import { Skeleton } from "@/components/ui/skeleton";

/** KPI card skeleton — matches DashboardStats real layout (4 cards). */
export function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-xl border bg-card p-5"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="size-7 rounded-full" />
          </div>
          <Skeleton className="mt-4 h-8 w-32" />
          <Skeleton className="mt-2 h-3 w-40" />
          <div className="mt-4">
            <Skeleton className="h-9 w-full rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Chart skeleton — matches VentasChart (card + 288px área). */
export function ChartSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-1 h-3 w-52" />
      <div className="mt-4 h-72 w-full">
        <div className="flex h-full items-end gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t-md"
              style={{ height: `${30 + ((i * 13) % 65)}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Sidebar card (top productos) skeleton. */
export function ListCardSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="mt-1 h-3 w-44" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-md" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Tabla skeleton — para listas con filas/columnas. */
export function TableSkeleton({
  rows = 6,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div>
        {/* Header */}
        <div
          className="grid gap-3 border-b px-4 py-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-full" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="grid gap-3 border-b px-4 py-3.5 last:border-0"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((__, c) => (
              <Skeleton key={c} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Dashboard completo — se usa en app/(dashboard)/loading.tsx */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Stats */}
      <DashboardStatsSkeleton />

      {/* Chart + Top */}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <ChartSkeleton />
        <ListCardSkeleton rows={5} />
      </div>

      {/* Últimas ventas */}
      <TableSkeleton rows={5} columns={5} />
    </div>
  );
}

/** Perfil skeleton — AvatarCard + tabs + form. */
export function PerfilSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-40" />
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex flex-col items-center gap-3">
            <Skeleton className="size-28 rounded-full" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-9 w-full" />
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <Skeleton className="h-5 w-48" />
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
