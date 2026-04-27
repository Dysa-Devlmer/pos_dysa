import { prisma, AuditAccion } from "@repo/db";
import {
  requireAuth,
  requireRateLimit,
  requireAdmin,
  jsonOk,
  jsonError,
} from "../../_helpers";
import { VENTAS_VISIBLES } from "@/lib/db-helpers";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const limited = await requireRateLimit(request);
  if (limited) return limited;
  const { error } = await requireAuth(request);
  if (error) return error;

  const { id } = await params;
  const venta = await prisma.venta.findFirst({
    where: { id: Number(id), ...VENTAS_VISIBLES },
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

/**
 * DELETE /api/v1/ventas/:id — soft-delete (F-3 audit P1).
 *
 * Antes: `tx.venta.delete()` físico — perdía trazabilidad y permitía a
 * un cajero borrar ventas ajenas. Ahora:
 *  - ADMIN-only (403 si rol != ADMIN)
 *  - Marca `deletedAt`/`deletedBy` y deja la fila
 *  - Inserta AuditLog con accion=DELETE y diff = snapshot mínimo
 *  - Revierte stock + contadores producto.ventas / cliente.compras
 *  - 422 si la venta tiene devoluciones (FK constraint)
 */
export async function DELETE(request: Request, { params }: Params) {
  const limited = await requireRateLimit(request);
  if (limited) return limited;
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;
  const adminCheck = requireAdmin(auth.session);
  if (adminCheck) return adminCheck;

  const { id } = await params;
  const ventaId = Number(id);
  const usuarioId = Number(auth.session.user.id);

  // Razón opcional via querystring (?razon=...) — el cliente API puede
  // no querer pasar body en DELETE. Truncado a 500 chars.
  const url = new URL(request.url);
  const razon = url.searchParams.get("razon")?.slice(0, 500) ?? null;

  const devolucionesCount = await prisma.devolucion.count({
    where: { ventaId },
  });
  if (devolucionesCount > 0) {
    return jsonError(
      `No se puede eliminar: la venta tiene ${devolucionesCount} devolución(es) asociada(s). Elimina primero las devoluciones.`,
      422,
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const venta = await tx.venta.findFirst({
        where: { id: ventaId, ...VENTAS_VISIBLES },
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

      if (venta.clienteId !== null) {
        const clienteId = venta.clienteId;
        const otraUltima = await tx.venta.findFirst({
          where: { clienteId, NOT: { id: ventaId }, ...VENTAS_VISIBLES },
          orderBy: { fecha: "desc" },
          select: { fecha: true },
        });
        await tx.cliente.update({
          where: { id: clienteId },
          data: {
            compras: { decrement: 1 },
            ultimaCompra: otraUltima?.fecha ?? null,
          },
        });
      }

      await tx.venta.update({
        where: { id: ventaId },
        data: {
          deletedAt: new Date(),
          deletedBy: usuarioId,
          deletionReason: razon,
        },
      });

      await tx.auditLog.create({
        data: {
          tabla: "ventas",
          registroId: ventaId,
          accion: AuditAccion.DELETE,
          usuarioId,
          ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
          userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
          diff: {
            numeroBoleta: venta.numeroBoleta,
            total: venta.total,
            clienteId: venta.clienteId,
            metodoPago: venta.metodoPago,
            razon,
            detalles: venta.detalles.map((d) => ({
              productoId: d.productoId,
              cantidad: d.cantidad,
              precioUnitario: d.precioUnitario,
            })),
          },
        },
      });
    });

    return jsonOk({ deleted: true, soft: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al eliminar venta";
    if (/no encontrada/i.test(msg)) return jsonError(msg, 404);
    return jsonError(msg, 422);
  }
}
