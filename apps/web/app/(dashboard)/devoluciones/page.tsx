import type { Metadata } from "next";

import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { formatCLP } from "@/lib/utils";

import { DevolucionesList, type DevolucionRow } from "./devoluciones-list";
import { RangoFechasFiltro } from "./rango-fechas";
import { listarDevoluciones } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Devoluciones" };

function parseFecha(v: string | undefined): Date | null {
  if (!v) return null;
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default async function DevolucionesPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const sp = await searchParams;
  const desde = parseFecha(sp.desde);
  const rawHasta = parseFecha(sp.hasta);
  const hasta = rawHasta
    ? (() => {
        const d = new Date(rawHasta);
        d.setHours(23, 59, 59, 999);
        return d;
      })()
    : null;

  const devoluciones = await listarDevoluciones({ desde, hasta });

  const rows: DevolucionRow[] = devoluciones.map((d) => ({
    id: d.id,
    fechaISO: d.fecha.toISOString(),
    motivo: d.motivo,
    montoDevuelto: d.montoDevuelto,
    esTotal: d.esTotal,
    itemsCount: d._count.items,
    ventaId: d.venta.id,
    ventaNumeroBoleta: d.venta.numeroBoleta,
    ventaTotal: d.venta.total,
    clienteNombre: d.venta.cliente?.nombre ?? null,
    usuarioNombre: d.usuario.nombre,
  }));

  // KPIs del período
  const totalDevuelto = rows.reduce((a, r) => a + r.montoDevuelto, 0);
  const totales = rows.filter((r) => r.esTotal).length;
  const parciales = rows.length - totales;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Devoluciones"
        subtitle="Reversiones de ventas: parciales (uno o varios productos) o totales (anulan la venta)."
      />

      <RangoFechasFiltro
        desde={sp.desde ?? null}
        hasta={sp.hasta ?? null}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard
          label="Devoluciones en el período"
          value={rows.length}
          sublabel={`${totales} total · ${parciales} parcial`}
        />
        <KpiCard
          label="Monto devuelto"
          value={formatCLP(totalDevuelto)}
          sublabel="CLP (IVA incluido)"
          tone="amber"
        />
        <KpiCard
          label="Promedio por devolución"
          value={
            rows.length > 0
              ? formatCLP(Math.round(totalDevuelto / rows.length))
              : formatCLP(0)
          }
        />
      </div>

      <DevolucionesList data={rows} />
    </div>
  );
}
