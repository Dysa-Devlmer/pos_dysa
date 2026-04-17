import { prisma, MetodoPago } from "@repo/db";
import { z } from "zod";
import { requireAuth, jsonOk, jsonError, parsePagination } from "../_helpers";

export async function GET(request: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parsePagination(searchParams);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const clienteId = searchParams.get("clienteId");
  const metodoPago = searchParams.get("metodoPago");

  const where = {
    ...(desde || hasta
      ? {
          fecha: {
            ...(desde ? { gte: new Date(desde) } : {}),
            ...(hasta ? { lte: new Date(hasta + "T23:59:59Z") } : {}),
          },
        }
      : {}),
    ...(clienteId ? { clienteId: Number(clienteId) } : {}),
    ...(metodoPago ? { metodoPago: metodoPago as MetodoPago } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.venta.findMany({
      where,
      include: {
        cliente: { select: { id: true, nombre: true, rut: true } },
        usuario: { select: { id: true, nombre: true } },
        detalles: {
          include: { producto: { select: { id: true, nombre: true } } },
        },
      },
      orderBy: { fecha: "desc" },
      skip,
      take: limit,
    }),
    prisma.venta.count({ where }),
  ]);

  return jsonOk(data, { page, limit, total, totalPages: Math.ceil(total / limit) });
}

const ItemSchema = z.object({
  productoId: z.number().int().positive(),
  cantidad: z.number().int().positive(),
});

const CreateVentaSchema = z.object({
  items: z.array(ItemSchema).min(1),
  clienteId: z.number().int().positive().optional(),
  metodoPago: z.nativeEnum(MetodoPago).default(MetodoPago.EFECTIVO),
});

export async function POST(request: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Body JSON inválido");
  }

  const parsed = CreateVentaSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues.map((e: { message: string }) => e.message).join(", "));
  }

  const { items, clienteId, metodoPago } = parsed.data;
  const usuarioId = Number(session.user.id);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const productos = await tx.producto.findMany({
        where: { id: { in: items.map((i) => i.productoId) } },
        select: { id: true, nombre: true, precio: true, stock: true, activo: true },
      });

      for (const item of items) {
        const prod = productos.find((p) => p.id === item.productoId);
        if (!prod || !prod.activo) {
          throw new Error(`Producto ${item.productoId} no encontrado o inactivo`);
        }
        if (prod.stock < item.cantidad) {
          throw new Error(`Stock insuficiente para "${prod.nombre}" (disponible: ${prod.stock})`);
        }
      }

      let subtotal = 0;
      const detalles = items.map((item) => {
        const prod = productos.find((p) => p.id === item.productoId)!;
        const lineSubtotal = prod.precio * item.cantidad;
        subtotal += lineSubtotal;
        return {
          productoId: item.productoId,
          cantidad: item.cantidad,
          precioUnitario: prod.precio,
          subtotal: lineSubtotal,
        };
      });

      const impuesto = Math.round(subtotal * 0.19);
      const total = subtotal + impuesto;
      const numeroBoleta = `BOL-${Date.now()}`;

      const venta = await tx.venta.create({
        data: {
          numeroBoleta,
          subtotal,
          impuesto,
          total,
          metodoPago,
          usuarioId,
          clienteId: clienteId ?? null,
          detalles: { create: detalles },
        },
        include: { detalles: true },
      });

      for (const item of items) {
        await tx.producto.update({
          where: { id: item.productoId },
          data: {
            stock: { decrement: item.cantidad },
            ventas: { increment: item.cantidad },
          },
        });
      }

      if (clienteId) {
        await tx.cliente.update({
          where: { id: clienteId },
          data: {
            compras: { increment: 1 },
            ultimaCompra: new Date(),
          },
        });
      }

      return venta;
    });

    return jsonOk(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al crear venta";
    return jsonError(msg, 422);
  }
}
