import type { Metadata } from "next";
import Link from "next/link";
import type { MetodoPago } from "@repo/db";
import { prisma } from "@repo/db";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { METODO_PAGO_BADGE } from "@/lib/badge-styles";
import { formatCLP } from "@/lib/utils";
import { VENTAS_VISIBLES } from "@/lib/db-helpers";
import {
  CHILE_TZ,
  esFechaYMD,
  finDelDiaChile,
  hoyChileISODate,
  inicioDelDiaChile,
  primeroDelMesChileISODate,
} from "@/lib/reportes-fecha";

import { ReportesWorkspace } from "./reportes-workspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Reportes" };

function formatFechaHora(d: Date): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: CHILE_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const sp = await searchParams;
  const desdeYMD =
    sp.desde && esFechaYMD(sp.desde) ? sp.desde : primeroDelMesChileISODate();
  const hastaYMD =
    sp.hasta && esFechaYMD(sp.hasta) ? sp.hasta : hoyChileISODate();

  const desde = inicioDelDiaChile(desdeYMD);
  const hasta = finDelDiaChile(hastaYMD);

  const ventas = await prisma.venta.findMany({
    where: { fecha: { gte: desde, lte: hasta }, ...VENTAS_VISIBLES },
    orderBy: { fecha: "desc" },
    include: {
      cliente: { select: { nombre: true, rut: true } },
      usuario: { select: { nombre: true } },
    },
  });

  const totalVentas = ventas.length;
  const totalCLP = ventas.reduce((a, v) => a + v.total, 0);
  const ticket = totalVentas > 0 ? Math.round(totalCLP / totalVentas) : 0;

  const byMetodo = new Map<MetodoPago, { cantidad: number; total: number }>();
  for (const v of ventas) {
    const m = byMetodo.get(v.metodoPago) ?? { cantidad: 0, total: 0 };
    m.cantidad += 1;
    m.total += v.total;
    byMetodo.set(v.metodoPago, m);
  }
  const topMetodos = [...byMetodo.entries()]
    .map(([metodo, v]) => ({ metodo, ...v }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
        <p className="text-sm text-muted-foreground">
          Filtra ventas por rango de fechas y descarga el reporte en PDF o Excel.
        </p>
      </div>

      <ReportesWorkspace
        desde={desdeYMD}
        hasta={hastaYMD}
        ventasEnPeriodo={totalVentas}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ventas en el período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{totalVentas}</p>
            <p className="text-xs text-muted-foreground">
              del {desdeYMD.split("-").reverse().join("/")} al{" "}
              {hastaYMD.split("-").reverse().join("/")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total facturado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {formatCLP(totalCLP)}
            </p>
            <p className="text-xs text-muted-foreground">IVA 19% incluido</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ticket promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {formatCLP(ticket)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Métodos usados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topMetodos.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <ul className="space-y-0.5 text-xs">
                {topMetodos.slice(0, 3).map((m) => (
                  <li
                    key={m.metodo}
                    className="flex items-center justify-between"
                  >
                    <Badge
                      variant="outline"
                      className={METODO_PAGO_BADGE[m.metodo]}
                    >
                      {m.metodo}
                    </Badge>
                    <span className="tabular-nums text-muted-foreground">
                      {m.cantidad} · {formatCLP(m.total)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalle de ventas</CardTitle>
        </CardHeader>
        <CardContent>
          {ventas.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay ventas registradas en el período seleccionado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Boleta</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">IVA</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ventas.map((v) => (
                  <TableRow
                    key={v.id}
                    className="hover:bg-muted/50 transition-colors duration-200"
                  >
                    <TableCell>
                      <Link
                        href={`/ventas/${v.id}`}
                        className="font-mono text-xs hover:underline"
                      >
                        {v.numeroBoleta}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatFechaHora(v.fecha)}
                    </TableCell>
                    <TableCell>
                      {v.cliente ? (
                        <div className="flex flex-col">
                          <span className="text-sm">{v.cliente.nombre}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {v.cliente.rut}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm italic text-muted-foreground">
                          Sin cliente
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{v.usuario.nombre}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={METODO_PAGO_BADGE[v.metodoPago]}
                      >
                        {v.metodoPago}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCLP(v.subtotal)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCLP(v.impuesto)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {formatCLP(v.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
