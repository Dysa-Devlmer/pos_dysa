import type { Metadata } from "next";
import { prisma } from "@repo/db";
import { auth } from "@/auth";
import { VENTAS_VISIBLES } from "@/lib/db-helpers";

import { AlertasBanner } from "./alertas-banner";
import { contarAlertasStock } from "./alertas/actions";
import { DashboardStats } from "./dashboard-stats";
import { TopProductos, type TopProductoRow } from "./top-productos";
import { UltimasVentas, type UltimaVentaRow } from "./ultimas-ventas";
import { VentasChart, type VentasPorDia } from "./ventas-chart";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Dashboard" };

const CHILE_TZ = "America/Santiago";

// ──────────────────────────────────────────────────────────────────────────
// Helpers de fecha (zona horaria Chile)
// ──────────────────────────────────────────────────────────────────────────

/** Devuelve un Date que representa el instante de "ahora" proyectado a zona Chile. */
function ahoraChile(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: CHILE_TZ }));
}

/** Inicio del día (00:00) de la fecha dada, en zona Chile (server local). */
function inicioDelDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Inicio del mes (día 1, 00:00) de la fecha dada. */
function inicioDelMes(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Clave YYYY-MM-DD en zona Chile para una fecha UTC. */
function claveDiaChile(d: Date): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: CHILE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d); // "YYYY-MM-DD"
}

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function etiquetaDia(dateLocal: Date): string {
  return `${DIAS_CORTOS[dateLocal.getDay()]} ${String(dateLocal.getDate()).padStart(2, "0")}`;
}

// ──────────────────────────────────────────────────────────────────────────
// Página
// ──────────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user;

  const nowChile = ahoraChile();
  const hoy = inicioDelDia(nowChile);
  const inicioMes = inicioDelMes(nowChile);

  // Rango últimos 7 días: desde hace 6 días hasta ahora (incluye hoy)
  const hace7 = new Date(hoy);
  hace7.setDate(hace7.getDate() - 6);

  // Ayer (para comparación de ventas hoy)
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);

  // Mes anterior (mismo rango hasta día N-1 del mes anterior)
  const inicioMesAnterior = new Date(
    inicioMes.getFullYear(),
    inicioMes.getMonth() - 1,
    1,
  );
  const finMesAnteriorParcial = new Date(
    inicioMes.getFullYear(),
    inicioMes.getMonth() - 1,
    nowChile.getDate(),
  );

  // Clientes hace 30 días
  const hace30 = new Date(hoy);
  hace30.setDate(hace30.getDate() - 30);

  const [
    ventasHoyAgg,
    ventasAyerAgg,
    ventasMesAgg,
    ventasMesAnteriorAgg,
    alertasStockCount,
    totalClientes,
    clientesNuevos30d,
    ventas7dias,
    topProductos,
    ultimasVentas,
  ] = await Promise.all([
    prisma.venta.aggregate({
      where: { fecha: { gte: hoy }, ...VENTAS_VISIBLES },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.venta.aggregate({
      where: { fecha: { gte: ayer, lt: hoy }, ...VENTAS_VISIBLES },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.venta.aggregate({
      where: { fecha: { gte: inicioMes }, ...VENTAS_VISIBLES },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.venta.aggregate({
      where: {
        fecha: { gte: inicioMesAnterior, lt: finMesAnteriorParcial },
        ...VENTAS_VISIBLES,
      },
      _count: { _all: true },
      _sum: { total: true },
    }),
    contarAlertasStock().catch(() => 0),
    prisma.cliente.count(),
    prisma.cliente.count({ where: { createdAt: { gte: hace30 } } }).catch(() => 0),
    prisma.venta.findMany({
      where: { fecha: { gte: hace7 }, ...VENTAS_VISIBLES },
      select: { fecha: true, total: true },
      orderBy: { fecha: "asc" },
    }),
    prisma.producto.findMany({
      where: { activo: true, ventas: { gt: 0 } },
      orderBy: { ventas: "desc" },
      take: 5,
      include: { categoria: { select: { nombre: true } } },
    }),
    prisma.venta.findMany({
      where: { ...VENTAS_VISIBLES },
      orderBy: { fecha: "desc" },
      take: 5,
      include: { cliente: { select: { nombre: true } } },
    }),
  ]);

  // ─── Construir serie de 7 días en Chile ───
  const bucket = new Map<string, { total: number; cantidad: number }>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(hace7);
    d.setDate(d.getDate() + i);
    bucket.set(claveDiaChile(d), { total: 0, cantidad: 0 });
  }
  for (const v of ventas7dias) {
    const k = claveDiaChile(v.fecha);
    const b = bucket.get(k);
    if (b) {
      b.total += v.total;
      b.cantidad += 1;
    }
  }
  const seriesChart: VentasPorDia[] = Array.from(bucket.entries()).map(
    ([fecha, { total, cantidad }]) => {
      const [yStr, mStr, dStr] = fecha.split("-");
      const y = Number(yStr);
      const m = Number(mStr);
      const day = Number(dStr);
      const dLocal = new Date(y, m - 1, day);
      return {
        fecha,
        etiqueta: etiquetaDia(dLocal),
        total,
        cantidad,
      };
    },
  );

  // Serie numérica para sparklines (últimos 7 días)
  const sparkSerie = seriesChart.map((d) => d.total);

  const topRows: TopProductoRow[] = topProductos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    categoriaNombre: p.categoria.nombre,
    ventas: p.ventas,
    stock: p.stock,
  }));

  const ultimasRows: UltimaVentaRow[] = ultimasVentas.map((v) => ({
    id: v.id,
    numeroBoleta: v.numeroBoleta,
    fechaISO: v.fecha.toISOString(),
    clienteNombre: v.cliente?.nombre ?? null,
    metodoPago: v.metodoPago,
    total: v.total,
  }));

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Panel · Tiempo real
        </p>
        <h1 className="font-display text-4xl leading-[1.05] tracking-tight">
          Hola,{" "}
          <span className="italic text-gradient-brand">
            {user?.name?.split(" ")[0] ?? "invitado"}
          </span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Resumen del negocio, ventas recientes y productos con mejor
          desempeño.
        </p>
      </div>

      <AlertasBanner count={alertasStockCount} />

      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Indicadores clave
        </h2>
        <DashboardStats
        ventasHoy={{
          cantidad: ventasHoyAgg._count._all,
          total: ventasHoyAgg._sum.total ?? 0,
          totalAnterior: ventasAyerAgg._sum.total ?? 0,
        }}
        ventasMes={{
          cantidad: ventasMesAgg._count._all,
          total: ventasMesAgg._sum.total ?? 0,
          totalAnterior: ventasMesAnteriorAgg._sum.total ?? 0,
        }}
        stockBajo={{
          cantidad: alertasStockCount,
          umbral: null,
        }}
        clientes={{
          total: totalClientes,
          nuevos30d: clientesNuevos30d,
        }}
        sparkSerie={sparkSerie}
      />
      </section>

      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Tendencia · Top productos
        </h2>
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <VentasChart data={seriesChart} />
          <TopProductos data={topRows} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Actividad reciente
        </h2>
        <UltimasVentas data={ultimasRows} />
      </section>
    </div>
  );
}
