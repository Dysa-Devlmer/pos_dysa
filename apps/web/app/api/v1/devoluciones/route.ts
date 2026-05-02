import { prisma } from "@repo/db";
import { z } from "zod";
import { generatePublicToken } from "@/lib/public-token";
import {
  requireAuth,
  requireRateLimit,
  jsonOk,
  jsonError,
  parsePagination,
} from "../_helpers";

/**
 * /api/v1/devoluciones — versión API-v1 del Server Action
 * crearDevolucion() de /app/(dashboard)/devoluciones/actions.ts.
 *
 * Toda la lógica crítica (bloqueo pesimista sobre la venta, validación
 * de cantidades previamente devueltas, cálculo proporcional de
 * montoDevuelto, flag esTotal, revertir stock/ventas, recálculo de
 * ultimaCompra del cliente cuando es total) se duplica aquí en Prisma
 * $transaction. NO se importa el Server Action porque ese archivo lleva
 * "use server" y sus revalidatePath() no tienen sentido desde mobile.
 *
 * Errores de negocio → 409 (servidor gana, cliente debe descartar el
 * intento). Errores de validación Zod → 400. Esto se alinea con la
 * política de sync del mobile (G-M04): 409 = failed definitivo.
 */

const ItemSchema = z.object({
  productoId: z.number().int().positive(),
  cantidadDevolver: z.number().int().positive(),
});

const CreateSchema = z.object({
  ventaId: z.number().int().positive(),
  motivo: z.string().trim().min(5).max(255),
  items: z.array(ItemSchema).min(1),
});

export async function GET(request: Request) {
  const limited = await requireRateLimit(request);
  if (limited) return limited;
  const { error } = await requireAuth(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parsePagination(searchParams);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  const where =
    desde || hasta
      ? {
          fecha: {
            ...(desde ? { gte: new Date(desde) } : {}),
            ...(hasta ? { lte: new Date(hasta + "T23:59:59Z") } : {}),
          },
        }
      : {};

  const [data, total] = await Promise.all([
    prisma.devolucion.findMany({
      where,
      orderBy: { fecha: "desc" },
      skip,
      take: limit,
      include: {
        venta: {
          select: {
            id: true,
            numeroBoleta: true,
            total: true,
            fecha: true,
            cliente: { select: { nombre: true, rut: true } },
          },
        },
        usuario: { select: { nombre: true, email: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.devolucion.count({ where }),
  ]);

  return jsonOk(data, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: Request) {
  const limited = await requireRateLimit(request);
  if (limited) return limited;
  const { session, error } = await requireAuth(request);
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Body JSON inválido");
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      parsed.error.issues.map((e: { message: string }) => e.message).join(", "),
    );
  }

  const input = parsed.data;
  const usuarioId = Number(session.user.id);

  // Consolidar items duplicados (cliente podría mandar el mismo productoId)
  const itemsMap = new Map<number, number>();
  for (const it of input.items) {
    itemsMap.set(
      it.productoId,
      (itemsMap.get(it.productoId) ?? 0) + it.cantidadDevolver,
    );
  }
  const consolidados = [...itemsMap.entries()].map(
    ([productoId, cantidad]) => ({ productoId, cantidad }),
  );

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Lock pesimista sobre la venta — NOWAIT para fallar rápido si
      // otro request está procesando una devolución sobre la misma.
      await tx.$queryRaw`
        SELECT id FROM ventas WHERE id = ${input.ventaId} FOR UPDATE NOWAIT
      `;

      const venta = await tx.venta.findUnique({
        where: { id: input.ventaId },
        include: {
          detalles: true,
          cliente: true,
          devoluciones: { include: { items: true } },
        },
      });
      if (!venta) throw new Error("La venta no existe");

      const tieneTotalPrevia = venta.devoluciones.some((d) => d.esTotal);
      if (tieneTotalPrevia) {
        throw new Error(
          "La venta ya tiene una devolución total registrada; no se admiten nuevas devoluciones.",
        );
      }

      const devueltoPrevio = new Map<number, number>();
      for (const dev of venta.devoluciones) {
        for (const it of dev.items) {
          devueltoPrevio.set(
            it.productoId,
            (devueltoPrevio.get(it.productoId) ?? 0) + it.cantidad,
          );
        }
      }

      const detallesMap = new Map(
        venta.detalles.map((d) => [d.productoId, d] as const),
      );
      let lineasSubtotal = 0;
      const lineas: {
        productoId: number;
        cantidad: number;
        precioUnitario: number;
        subtotal: number;
      }[] = [];

      for (const it of consolidados) {
        const det = detallesMap.get(it.productoId);
        if (!det) {
          throw new Error(
            `El producto ${it.productoId} no figura en la venta original.`,
          );
        }
        const prev = devueltoPrevio.get(it.productoId) ?? 0;
        const disponible = det.cantidad - prev;
        if (it.cantidad > disponible) {
          throw new Error(
            `No se puede devolver ${it.cantidad} unidad(es) del producto ${it.productoId}: sólo quedan ${disponible} disponibles.`,
          );
        }
        const sub = det.precioUnitario * it.cantidad;
        lineasSubtotal += sub;
        lineas.push({
          productoId: it.productoId,
          cantidad: it.cantidad,
          precioUnitario: det.precioUnitario,
          subtotal: sub,
        });
      }

      const totalUnidadesVendidas = venta.detalles.reduce(
        (a, d) => a + d.cantidad,
        0,
      );
      const totalDevuelto =
        [...devueltoPrevio.values()].reduce((a, n) => a + n, 0) +
        consolidados.reduce((a, c) => a + c.cantidad, 0);
      const esTotal = totalDevuelto >= totalUnidadesVendidas;

      let montoDevuelto = 0;
      if (venta.subtotal > 0) {
        const ratio = lineasSubtotal / venta.subtotal;
        montoDevuelto = Math.round(venta.total * ratio);
      }
      if (montoDevuelto > venta.total) montoDevuelto = venta.total;

      const devolucion = await tx.devolucion.create({
        data: {
          publicToken: generatePublicToken(),
          ventaId: venta.id,
          motivo: input.motivo,
          montoDevuelto,
          esTotal,
          creadoPor: usuarioId,
          items: { create: lineas },
        },
        select: {
          id: true,
          publicToken: true,
          esTotal: true,
          montoDevuelto: true,
        },
      });

      for (const l of lineas) {
        await tx.producto.update({
          where: { id: l.productoId },
          data: {
            stock: { increment: l.cantidad },
            ventas: { decrement: l.cantidad },
          },
        });
      }

      if (esTotal && venta.clienteId !== null) {
        const clienteId = venta.clienteId;
        const otras = await tx.venta.findMany({
          where: { clienteId, NOT: { id: venta.id } },
          select: {
            fecha: true,
            devoluciones: { select: { esTotal: true } },
          },
          orderBy: { fecha: "desc" },
        });
        const activas = otras.filter(
          (v) => !v.devoluciones.some((d) => d.esTotal),
        );
        await tx.cliente.update({
          where: { id: clienteId },
          data: {
            compras: { decrement: 1 },
            ultimaCompra: activas[0]?.fecha ?? null,
          },
        });
      }

      return devolucion;
    });

    return jsonOk(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al crear devolución";
    // Errores de negocio (stock, venta no existe, total previa, etc.) →
    // 409. Mobile los trata como failed permanente (no reintentar).
    return jsonError(msg, 409);
  }
}
