import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@repo/db";

import { Button } from "@/components/ui/button";
import {
  VentaCarrito,
  type CarritoItem,
  type ClienteResult,
} from "@/components/venta-carrito";

export const dynamic = "force-dynamic";

export default async function EditarVentaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const venta = await prisma.venta.findFirst({
    where: { id, deletedAt: null },
    include: {
      cliente: true,
      detalles: {
        include: {
          producto: {
            select: { id: true, nombre: true, stock: true },
          },
        },
      },
    },
  });
  if (!venta) notFound();

  // Guard: si la venta tiene devoluciones, no permitir editar (mantiene
  // consistencia stock/contadores). Redirigimos al detalle, donde el botón
  // de "Editar" ya aparece deshabilitado con tooltip explicativo.
  const devolucionesCount = await prisma.devolucion.count({
    where: { ventaId: id },
  });
  if (devolucionesCount > 0) redirect(`/ventas/${id}`);

  const initialItems: CarritoItem[] = venta.detalles.map((d) => ({
    productoId: d.productoId,
    nombre: d.producto.nombre,
    precioUnitario: d.precioUnitario,
    cantidad: d.cantidad,
    // stock efectivo = stock actual BD + lo que esta venta consumía
    stockMax: d.producto.stock + d.cantidad,
  }));

  const initialCliente: ClienteResult | null = venta.cliente
    ? {
        id: venta.cliente.id,
        rut: venta.cliente.rut,
        nombre: venta.cliente.nombre,
        email: venta.cliente.email,
        telefono: venta.cliente.telefono,
      }
    : null;

  const refundCantidades: Record<number, number> = {};
  for (const d of venta.detalles) {
    refundCantidades[d.productoId] =
      (refundCantidades[d.productoId] ?? 0) + d.cantidad;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Editar venta{" "}
            <span className="font-mono text-lg text-muted-foreground">
              {venta.numeroBoleta}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Modificar items revierte el stock anterior y aplica el nuevo en una
            sola transacción.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/ventas/${venta.id}`}>
            <ArrowLeft className="size-4" />
            Volver al detalle
          </Link>
        </Button>
      </div>

      <VentaCarrito
        mode="editar"
        ventaId={venta.id}
        initialItems={initialItems}
        initialCliente={initialCliente}
        initialMetodoPago={venta.metodoPago}
        initialDescuentoPct={Number(venta.descuentoPct)}
        initialDescuentoMonto={venta.descuentoMonto}
        refundCantidades={refundCantidades}
      />
    </div>
  );
}
