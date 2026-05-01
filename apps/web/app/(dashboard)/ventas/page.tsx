import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma, type Prisma } from "@repo/db";

import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { calcularDesglose, formatCLP } from "@/lib/utils";
import { VENTAS_VISIBLES } from "@/lib/db-helpers";
import { RangoFechasFiltro } from "./rango-fechas";
import { VentasTable, type VentaRow } from "./ventas-table";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Ventas" };

function parseFecha(v: string | undefined): Date | null {
  if (!v) return null;
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const sp = await searchParams;
  const desde = parseFecha(sp.desde);
  const hasta = parseFecha(sp.hasta);

  const where: Prisma.VentaWhereInput = { ...VENTAS_VISIBLES };
  if (desde || hasta) {
    where.fecha = {};
    if (desde) (where.fecha as { gte?: Date }).gte = desde;
    if (hasta) {
      // Hasta inclusivo — fin del día
      const hastaFin = new Date(hasta);
      hastaFin.setHours(23, 59, 59, 999);
      (where.fecha as { lte?: Date }).lte = hastaFin;
    }
  }

  const ventas = await prisma.venta.findMany({
    where,
    orderBy: { fecha: "desc" },
    include: {
      cliente: { select: { nombre: true, rut: true } },
      usuario: { select: { nombre: true } },
      _count: { select: { detalles: true } },
    },
  });

  const rows: VentaRow[] = ventas.map((v) => {
    const pct = Number(v.descuentoPct);
    const { descuentoTotal } = calcularDesglose(
      v.subtotal,
      pct,
      v.descuentoMonto,
    );
    return {
      id: v.id,
      numeroBoleta: v.numeroBoleta,
      fechaISO: v.fecha.toISOString(),
      clienteNombre: v.cliente?.nombre ?? null,
      clienteRut: v.cliente?.rut ?? null,
      usuarioNombre: v.usuario.nombre,
      metodoPago: v.metodoPago,
      total: v.total,
      items: v._count.detalles,
      descuentoPct: pct,
      descuentoMonto: v.descuentoMonto,
      descuentoTotal,
    };
  });

  const totalPeriodo = rows.reduce((a, r) => a + r.total, 0);

  return (
    <div className="space-y-6">
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

      <RangoFechasFiltro
        desde={sp.desde ?? null}
        hasta={sp.hasta ?? null}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard label="Ventas en el período" value={rows.length} />
        <KpiCard
          label="Total facturado"
          value={formatCLP(totalPeriodo)}
        />
        <KpiCard
          label="Ticket promedio"
          value={
            rows.length
              ? formatCLP(Math.round(totalPeriodo / rows.length))
              : formatCLP(0)
          }
        />
      </div>

      <VentasTable data={rows} hasDateFilter={Boolean(desde || hasta)} />
    </div>
  );
}
