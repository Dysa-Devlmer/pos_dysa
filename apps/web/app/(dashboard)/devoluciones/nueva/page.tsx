import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@repo/db";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";

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
        <PageHeader
          title="Nueva devolución"
          subtitle={
            <>
              Boleta:{" "}
              <span className="font-mono">{venta.numeroBoleta}</span>
            </>
          }
          action={
            <Button asChild variant="outline" size="sm">
              <Link href={`/ventas/${venta.id}`}>
                <ArrowLeft className="size-4" />
                Volver al detalle
              </Link>
            </Button>
          }
        />
        <Alert variant="destructive">
          <AlertTitle>Venta con devolución total</AlertTitle>
          <AlertDescription>
            Esta venta ya tiene una devolución total registrada; no se
            admiten nuevas devoluciones.
          </AlertDescription>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link href={`/ventas/${venta.id}`}>
              Ver detalle de la venta
            </Link>
          </Button>
        </Alert>
      </div>
    );
  }

  const hayDisponible = lineas.some((l) => l.disponible > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nueva devolución"
        subtitle={
          <>
            Boleta:{" "}
            <span className="font-mono">{venta.numeroBoleta}</span>
          </>
        }
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={`/ventas/${venta.id}`}>
              <ArrowLeft className="size-4" />
              Volver al detalle
            </Link>
          </Button>
        }
      />

      {!hayDisponible ? (
        <Alert variant="warning">
          <AlertTitle>Todos los productos ya fueron devueltos</AlertTitle>
          <AlertDescription>
            No queda cantidad disponible para devolver en esta venta.
          </AlertDescription>
        </Alert>
      ) : (
        <DevolucionForm venta={ventaResumen} />
      )}
    </div>
  );
}
