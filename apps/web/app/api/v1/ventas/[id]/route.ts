import { prisma } from "@repo/db";
import { requireAuth, jsonOk, jsonError } from "../../_helpers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const venta = await prisma.venta.findUnique({
    where: { id: Number(id) },
    include: {
      cliente: { select: { id: true, nombre: true, rut: true } },
      usuario: { select: { id: true, nombre: true } },
      detalles: {
        include: { producto: { select: { id: true, nombre: true, codigoBarras: true } } },
      },
    },
  });

  if (!venta) return jsonError("Venta no encontrada", 404);
  return jsonOk(venta);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const ventaId = Number(id);

  try {
    await prisma.$transaction(async (tx) => {
      const venta = await tx.venta.findUnique({
        where: { id: ventaId },
        include: { detalles: true },
      });

      if (!venta) throw new Error("Venta no encontrada");

      for (const detalle of venta.detalles) {
        await tx.producto.update({
          where: { id: detalle.productoId },
          data: {
            stock: { increment: detalle.cantidad },
            ventas: { decrement: detalle.cantidad },
          },
        });
      }

      if (venta.clienteId) {
        await tx.cliente.update({
          where: { id: venta.clienteId },
          data: { compras: { decrement: 1 } },
        });
      }

      await tx.venta.delete({ where: { id: ventaId } });
    });

    return jsonOk({ deleted: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al eliminar venta";
    return jsonError(msg, 422);
  }
}
