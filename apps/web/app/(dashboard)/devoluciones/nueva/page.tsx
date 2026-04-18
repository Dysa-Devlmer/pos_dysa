import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { prisma } from "@repo/db";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  DevolucionForm,
  type VentaLinea,
  type VentaResumen,
} from "./devolucion-form";

export const dynamic = "force-dynamic";

export default async function NuevaDevolucionPage({
  searchParams,
}: {
  searchParams: Promise<{ ventaId?: string }>;
}) {
  const sp = await searchParams;
  const ventaIdNum = Number(sp.ventaId);
  if (!Number.isFinite(ventaIdNum) || ventaIdNum <= 0) {
    // Sin ventaId no tiene sentido este flujo
    redirect("/ventas");
  }

  const venta = await prisma.venta.findUnique({
    where: { id: ventaIdNum },
    include: {
      cliente: { select: { nombre: true, rut: true } },
      detalles: {
        include: {
          producto: {
            select: { id: true, nombre: true, codigoBarras: true },
          },
        },
      },
      devoluciones: {
        include: { items: true },
      },
    },
  });
  if (!venta) notFound();

  const tieneDevolucionTotal = venta.devoluciones.some((d) => d.esTotal);

  // Acumular cantidades previamente devueltas por productoId
  const devueltoPrevioPorProducto = new Map<number, number>();
  for (const d of venta.devoluciones) {
    for (const it of d.items) {
      devueltoPrevioPorProducto.set(
        it.productoId,
        (devueltoPrevioPorProducto.get(it.productoId) ?? 0) + it.cantidad,
      );
    }
  }

  const lineas: VentaLinea[] = venta.detalles.map((d) => {
    const yaDevuelta = devueltoPrevioPorProducto.get(d.productoId) ?? 0;
    return {
      productoId: d.productoId,
      productoNombre: d.producto.nombre,
      codigoBarras: d.producto.codigoBarras,
      cantidadVendida: d.cantidad,
      cantidadYaDevuelta: yaDevuelta,
      disponible: Math.max(0, d.cantidad - yaDevuelta),
      precioUnitario: d.precioUnitario,
    };
  });

  const ventaResumen: VentaResumen = {
    id: venta.id,
    numeroBoleta: venta.numeroBoleta,
    fecha: venta.fecha.toISOString(),
    total: venta.total,
    subtotal: venta.subtotal,
    metodoPago: venta.metodoPago,
    clienteNombre: venta.cliente?.nombre ?? null,
    clienteRut: venta.cliente?.rut ?? null,
    lineas,
    tieneDevolucionTotal,
  };

  // Si la venta ya tiene devolución total, bloquear la creación
  if (tieneDevolucionTotal) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Nueva devolución
            </h1>
            <p className="text-sm text-muted-foreground">
              Boleta:{" "}
              <span className="font-mono">{venta.numeroBoleta}</span>
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/ventas/${venta.id}`}>
              <ArrowLeft className="size-4" />
              Volver al detalle
            </Link>
          </Button>
        </div>
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              Venta con devolución total
            </CardTitle>
            <CardDescription>
              Esta venta ya tiene una devolución total registrada; no se
              admiten nuevas devoluciones.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={`/ventas/${venta.id}`}>
                Ver detalle de la venta
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hayDisponible = lineas.some((l) => l.disponible > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Nueva devolución
          </h1>
          <p className="text-sm text-muted-foreground">
            Boleta:{" "}
            <span className="font-mono">{venta.numeroBoleta}</span>
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/ventas/${venta.id}`}>
            <ArrowLeft className="size-4" />
            Volver al detalle
          </Link>
        </Button>
      </div>

      {!hayDisponible ? (
        <Card className="border-amber-300 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
              <AlertTriangle className="size-5" />
              Todos los productos ya fueron devueltos
            </CardTitle>
            <CardDescription className="text-amber-800 dark:text-amber-200">
              No queda cantidad disponible para devolver en esta venta.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <DevolucionForm venta={ventaResumen} />
      )}
    </div>
  );
}
