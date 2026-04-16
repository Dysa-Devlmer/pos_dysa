import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { prisma } from "@repo/db";

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
    },
  });
  if (!venta) notFound();

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
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/ventas">
              <ArrowLeft className="size-4" />
              Volver
            </Link>
          </Button>
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
            <Badge variant="outline">{venta.metodoPago}</Badge>
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
            <Badge variant="outline" className="mt-2">
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
                <TableRow key={d.id}>
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
            <div className="w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal (neto)</span>
                <span className="tabular-nums">
                  {formatCLP(venta.subtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IVA (19%)</span>
                <span className="tabular-nums">
                  {formatCLP(venta.impuesto)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-1.5 text-base font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{formatCLP(venta.total)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
