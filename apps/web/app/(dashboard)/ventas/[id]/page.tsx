import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, RotateCcw } from "lucide-react";
import { prisma } from "@repo/db";
import {
  METODO_PAGO_BADGE,
  ROL_BADGE,
  devolucionBadge,
} from "@/lib/badge-styles";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ResumenVenta } from "@/components/resumen-venta";
import { formatCLP } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatFechaHora(d: Date): string {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function VentaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const venta = await prisma.venta.findUnique({
    where: { id },
    include: {
      cliente: true,
      usuario: { select: { id: true, nombre: true, email: true, rol: true } },
      detalles: {
        include: {
          producto: {
            select: { id: true, nombre: true, codigoBarras: true },
          },
        },
      },
      devoluciones: {
        orderBy: { fecha: "desc" },
        include: {
          usuario: { select: { nombre: true } },
          items: {
            include: { producto: { select: { nombre: true } } },
          },
        },
      },
    },
  });
  if (!venta) notFound();

  const tieneDevolucionTotal = venta.devoluciones.some((d) => d.esTotal);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Detalle de venta
          </h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            {venta.numeroBoleta}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/ventas">
              <ArrowLeft className="size-4" />
              Volver
            </Link>
          </Button>
          {!tieneDevolucionTotal ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/devoluciones/nueva?ventaId=${venta.id}`}>
                <RotateCcw className="size-4" />
                Nueva devolución
              </Link>
            </Button>
          ) : null}
          <Button asChild size="sm">
            <Link href={`/ventas/${venta.id}/editar`}>
              <Pencil className="size-4" />
              Editar
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fecha y método
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm font-medium">
              {formatFechaHora(venta.fecha)}
            </p>
            <Badge variant="outline" className={METODO_PAGO_BADGE[venta.metodoPago]}>
              {venta.metodoPago}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {venta.cliente ? (
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{venta.cliente.nombre}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {venta.cliente.rut}
                </p>
                {venta.cliente.email ? (
                  <p className="text-xs text-muted-foreground">
                    {venta.cliente.email}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin cliente</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vendedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{venta.usuario.nombre}</p>
            <p className="text-xs text-muted-foreground">
              {venta.usuario.email}
            </p>
            <Badge
              variant="outline"
              className={`mt-2 ${ROL_BADGE[venta.usuario.rol]}`}
            >
              {venta.usuario.rol}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items ({venta.detalles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Código</TableHead>
                <TableHead className="text-right">Precio unit.</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {venta.detalles.map((d) => (
                <TableRow
                  key={d.id}
                  className="hover:bg-muted/50 transition-colors duration-200"
                >
                  <TableCell className="font-medium">
                    {d.producto.nombre}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs">
                      {d.producto.codigoBarras}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCLP(d.precioUnitario)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {d.cantidad}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatCLP(d.subtotal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-6 flex justify-end">
            <ResumenVenta
              className="w-full max-w-xs"
              subtotalBruto={venta.subtotal}
              descuentoPct={Number(venta.descuentoPct)}
              descuentoMonto={venta.descuentoMonto}
            />
          </div>
        </CardContent>
      </Card>

      {venta.devoluciones.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="size-4" />
              Devoluciones ({venta.devoluciones.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {venta.devoluciones.map((d) => (
                <li key={d.id} className="space-y-2 py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      <p className="flex items-center gap-2 text-sm">
                        <span className="font-medium">
                          {formatFechaHora(d.fecha)}
                        </span>
                        <Badge
                          variant="outline"
                          className={`gap-1 ${devolucionBadge(d.esTotal)}`}
                        >
                          <RotateCcw className="size-3" />
                          {d.esTotal ? "Total" : "Parcial"}
                        </Badge>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {d.motivo}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Registrada por{" "}
                        <span className="font-medium">{d.usuario.nombre}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase text-muted-foreground">
                        Monto devuelto
                      </p>
                      <p className="tabular-nums font-semibold text-amber-700 dark:text-amber-400">
                        − {formatCLP(d.montoDevuelto)}
                      </p>
                    </div>
                  </div>
                  <ul className="ml-2 space-y-0.5 border-l-2 border-amber-200 pl-3 text-xs dark:border-amber-900">
                    {d.items.map((it) => (
                      <li
                        key={it.id}
                        className="flex items-center justify-between"
                      >
                        <span className="truncate">{it.producto.nombre}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {it.cantidad} × {formatCLP(it.precioUnitario)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
