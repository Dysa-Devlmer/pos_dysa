import type { Metadata } from "next";
import { RotateCcw } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <RotateCcw className="size-6 text-amber-500" />
          Devoluciones
        </h1>
        <p className="text-sm text-muted-foreground">
          Reversiones de ventas: parciales (uno o varios productos) o totales
          (anulan la venta).
        </p>
      </div>

      <RangoFechasFiltro
        desde={sp.desde ?? null}
        hasta={sp.hasta ?? null}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Devoluciones en el período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{rows.length}</p>
            <p className="text-xs text-muted-foreground">
              {totales} total · {parciales} parcial
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monto devuelto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-400">
              {formatCLP(totalDevuelto)}
            </p>
            <p className="text-xs text-muted-foreground">CLP (IVA incluido)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Promedio por devolución
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {rows.length > 0
                ? formatCLP(Math.round(totalDevuelto / rows.length))
                : formatCLP(0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <DevolucionesList data={rows} />
    </div>
  );
}
