"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { customAlphabet } from "nanoid";
import { prisma, MetodoPago, Prisma } from "@repo/db";
import { auth } from "@/auth";
import { calcularDesglose } from "@/lib/utils";

// ──────────────────────────────────────────────────────────────────────────
// Schemas
// ──────────────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  productoId: z.number().int().positive(),
  cantidad: z.number().int().positive("Cantidad debe ser mayor a 0"),
});

const ventaInputSchema = z.object({
  clienteId: z.number().int().positive().nullable().optional(),
  metodoPago: z.nativeEnum(MetodoPago),
  items: z
    .array(itemSchema)
    .min(1, "La venta debe tener al menos un producto"),
  descuentoPct: z
    .number()
    .min(0, "No puede ser negativo")
    .max(100, "Máximo 100%")
    .multipleOf(0.01, "Máximo 2 decimales")
    .optional()
    .default(0),
  descuentoMonto: z
    .number()
    .int("Debe ser entero (CLP)")
    .min(0, "No puede ser negativo")
    .optional()
    .default(0),
});

export type VentaInput = z.infer<typeof ventaInputSchema>;

export type ActionResult<T = null> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

const nanoidBoleta = customAlphabet("0123456789ABCDEFGHJKMNPQRSTUVWXYZ", 8);

function generarNumeroBoleta(): string {
  // Formato: B-YYYYMMDD-XXXXXXXX (fácil de reconocer, único)
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `B-${yyyy}${mm}${dd}-${nanoidBoleta()}`;
}

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");
  return session;
}

/**
 * Consolida items: si se repite un productoId, se suman las cantidades.
 */
function consolidarItems(
  items: Array<{ productoId: number; cantidad: number }>,
): Array<{ productoId: number; cantidad: number }> {
  const map = new Map<number, number>();
  for (const it of items) {
    map.set(it.productoId, (map.get(it.productoId) ?? 0) + it.cantidad);
  }
  return [...map.entries()].map(([productoId, cantidad]) => ({
    productoId,
    cantidad,
  }));
}

// ──────────────────────────────────────────────────────────────────────────
// CREAR VENTA — transacción atómica
//   → DetalleVenta por cada item
//   → producto.ventas += cantidad   · producto.stock -= cantidad
//   → si hay cliente: compras += 1, ultimaCompra = fecha de la venta
// ──────────────────────────────────────────────────────────────────────────

export async function crearVenta(
  input: VentaInput,
): Promise<ActionResult<{ id: number; numeroBoleta: string }>> {
  try {
    const session = await requireSession();
    const data = ventaInputSchema.parse(input);
    const items = consolidarItems(data.items);

    // Cargar productos y validar stock en una sola query
    const productos = await prisma.producto.findMany({
      where: { id: { in: items.map((i) => i.productoId) } },
      select: {
        id: true,
        nombre: true,
        precio: true,
        stock: true,
        activo: true,
      },
    });

    if (productos.length !== items.length) {
      return {
        ok: false,
        error: "Uno o más productos no existen",
      };
    }

    const prodMap = new Map(productos.map((p) => [p.id, p]));
    for (const it of items) {
      const p = prodMap.get(it.productoId)!;
      if (!p.activo) {
        return {
          ok: false,
          error: `El producto "${p.nombre}" está inactivo`,
        };
      }
      if (p.stock < it.cantidad) {
        return {
          ok: false,
          error: `Stock insuficiente para "${p.nombre}" (disponible: ${p.stock}, solicitado: ${it.cantidad})`,
        };
      }
    }

    // Calcular totales
    const detalles = items.map((it) => {
      const p = prodMap.get(it.productoId)!;
      return {
        productoId: it.productoId,
        cantidad: it.cantidad,
        precioUnitario: p.precio,
        subtotal: p.precio * it.cantidad,
      };
    });
    const subtotalBruto = detalles.reduce((a, d) => a + d.subtotal, 0);
    const desglose = calcularDesglose(
      subtotalBruto,
      data.descuentoPct,
      data.descuentoMonto,
    );
    // El descuentoMonto efectivo puede haber sido truncado si excedía la base
    // tras el descuento porcentual. Persistimos el valor efectivo, no el input.
    const descuentoMontoEfectivo = desglose.descuentoFijo;

    // Validar cliente si se envió
    if (data.clienteId) {
      const cliente = await prisma.cliente.findUnique({
        where: { id: data.clienteId },
        select: { id: true },
      });
      if (!cliente) return { ok: false, error: "Cliente no encontrado" };
    }

    const usuarioId = Number(session.user.id);
    const numeroBoleta = generarNumeroBoleta();

    const venta = await prisma.$transaction(async (tx) => {
      // 1. Crear la venta + detalles
      const v = await tx.venta.create({
        data: {
          numeroBoleta,
          subtotal: subtotalBruto,
          descuentoPct: data.descuentoPct,
          descuentoMonto: descuentoMontoEfectivo,
          impuesto: desglose.iva,
          total: desglose.total,
          metodoPago: data.metodoPago,
          usuarioId,
          clienteId: data.clienteId ?? null,
          detalles: { create: detalles },
        },
        select: { id: true, numeroBoleta: true, fecha: true },
      });

      // 2. Actualizar stock y contador ventas por cada producto
      for (const it of items) {
        await tx.producto.update({
          where: { id: it.productoId },
          data: {
            stock: { decrement: it.cantidad },
            ventas: { increment: it.cantidad },
          },
        });
      }

      // 3. Actualizar cliente
      if (data.clienteId) {
        await tx.cliente.update({
          where: { id: data.clienteId },
          data: {
            compras: { increment: 1 },
            ultimaCompra: v.fecha,
          },
        });
      }

      return v;
    });

    revalidatePath("/ventas");
    revalidatePath("/productos");
    revalidatePath("/clientes");

    return {
      ok: true,
      data: { id: venta.id, numeroBoleta: venta.numeroBoleta },
    };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues[0]?.message ?? "Datos inválidos" };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al crear venta",
    };
  }
}

// ──────────────────────────────────────────────────────────────────────────
// ELIMINAR VENTA — revierte stock, ventas, compras, recalcula ultimaCompra
// ──────────────────────────────────────────────────────────────────────────

export async function eliminarVenta(id: number): Promise<ActionResult> {
  try {
    await requireSession();

    // Pre-check: si la venta tiene devoluciones asociadas, no se puede eliminar
    // (FK constraint `devoluciones_venta_id_fkey`). Mostramos un mensaje claro
    // en lugar de exponer el error crudo de Postgres.
    const devolucionesCount = await prisma.devolucion.count({
      where: { ventaId: id },
    });
    if (devolucionesCount > 0) {
      return {
        ok: false,
        error: `No se puede eliminar: la venta tiene ${devolucionesCount} devolución(es) asociada(s). Elimina primero las devoluciones.`,
      };
    }

    await prisma.$transaction(async (tx) => {
      const venta = await tx.venta.findUnique({
        where: { id },
        include: { detalles: true },
      });
      if (!venta) throw new Error("Venta no encontrada");

      // 1. Revertir stock/ventas de cada producto
      for (const d of venta.detalles) {
        await tx.producto.update({
          where: { id: d.productoId },
          data: {
            stock: { increment: d.cantidad },
            ventas: { decrement: d.cantidad },
          },
        });
      }

      // 2. Si había cliente, revertir contador y recalcular ultimaCompra
      if (venta.clienteId !== null) {
        const clienteId = venta.clienteId;
        const otraUltima = await tx.venta.findFirst({
          where: { clienteId, NOT: { id: venta.id } },
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

      // 3. Eliminar la venta (detalles caen por cascade)
      await tx.venta.delete({ where: { id } });
    });

    revalidatePath("/ventas");
    revalidatePath("/productos");
    revalidatePath("/clientes");

    return { ok: true };
  } catch (err) {
    // Fallback: capturar FK violations de Prisma con mensaje amigable
    // (por si se agregaran nuevas relaciones con ON DELETE RESTRICT).
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2003"
    ) {
      return {
        ok: false,
        error:
          "No se puede eliminar: la venta tiene registros asociados (devoluciones u otros). Elimínalos primero.",
      };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al eliminar venta",
    };
  }
}

// ──────────────────────────────────────────────────────────────────────────
// EDITAR VENTA — revierte efectos viejos + aplica efectos nuevos en $transaction
// ──────────────────────────────────────────────────────────────────────────

export async function editarVenta(
  id: number,
  input: VentaInput,
): Promise<ActionResult<{ id: number; numeroBoleta: string }>> {
  try {
    const session = await requireSession();
    const data = ventaInputSchema.parse(input);
    const items = consolidarItems(data.items);
    const usuarioId = Number(session.user.id);

    // Calcular stock efectivo (stock actual + lo que devuelve la venta vieja)
    // permite que, si un producto figura en la vieja y en la nueva, no falle por stock ficticio.
    const ventaVieja = await prisma.venta.findUnique({
      where: { id },
      include: { detalles: true },
    });
    if (!ventaVieja) return { ok: false, error: "Venta no encontrada" };

    const productosIds = Array.from(
      new Set([
        ...items.map((i) => i.productoId),
        ...ventaVieja.detalles.map((d) => d.productoId),
      ]),
    );

    const productos = await prisma.producto.findMany({
      where: { id: { in: productosIds } },
      select: {
        id: true,
        nombre: true,
        precio: true,
        stock: true,
        activo: true,
      },
    });
    const prodMap = new Map(productos.map((p) => [p.id, p]));

    // Stock efectivo = stock BD + lo que la venta vieja consumía (se va a devolver)
    const devolucionPorProducto = new Map<number, number>();
    for (const d of ventaVieja.detalles) {
      devolucionPorProducto.set(
        d.productoId,
        (devolucionPorProducto.get(d.productoId) ?? 0) + d.cantidad,
      );
    }

    for (const it of items) {
      const p = prodMap.get(it.productoId);
      if (!p) return { ok: false, error: "Producto no encontrado" };
      if (!p.activo) {
        return { ok: false, error: `El producto "${p.nombre}" está inactivo` };
      }
      const stockEfectivo =
        p.stock + (devolucionPorProducto.get(it.productoId) ?? 0);
      if (stockEfectivo < it.cantidad) {
        return {
          ok: false,
          error: `Stock insuficiente para "${p.nombre}" (disponible considerando devolución: ${stockEfectivo}, solicitado: ${it.cantidad})`,
        };
      }
    }

    // Calcular totales nuevos
    const detallesNuevos = items.map((it) => {
      const p = prodMap.get(it.productoId)!;
      return {
        productoId: it.productoId,
        cantidad: it.cantidad,
        precioUnitario: p.precio,
        subtotal: p.precio * it.cantidad,
      };
    });
    const subtotalBruto = detallesNuevos.reduce((a, d) => a + d.subtotal, 0);
    const desglose = calcularDesglose(
      subtotalBruto,
      data.descuentoPct,
      data.descuentoMonto,
    );
    const descuentoMontoEfectivo = desglose.descuentoFijo;

    // Validar cliente nuevo si existe
    if (data.clienteId) {
      const c = await prisma.cliente.findUnique({
        where: { id: data.clienteId },
        select: { id: true },
      });
      if (!c) return { ok: false, error: "Cliente no encontrado" };
    }

    const ventaActualizada = await prisma.$transaction(async (tx) => {
      // ─── 1. REVERTIR efectos de la venta vieja ──
      for (const d of ventaVieja.detalles) {
        await tx.producto.update({
          where: { id: d.productoId },
          data: {
            stock: { increment: d.cantidad },
            ventas: { decrement: d.cantidad },
          },
        });
      }
      if (ventaVieja.clienteId !== null) {
        const cid = ventaVieja.clienteId;
        const otraUltima = await tx.venta.findFirst({
          where: { clienteId: cid, NOT: { id } },
          orderBy: { fecha: "desc" },
          select: { fecha: true },
        });
        await tx.cliente.update({
          where: { id: cid },
          data: {
            compras: { decrement: 1 },
            ultimaCompra: otraUltima?.fecha ?? null,
          },
        });
      }

      // ─── 2. Actualizar la venta (reemplazar detalles) ──
      await tx.detalleVenta.deleteMany({ where: { ventaId: id } });
      const v = await tx.venta.update({
        where: { id },
        data: {
          subtotal: subtotalBruto,
          descuentoPct: data.descuentoPct,
          descuentoMonto: descuentoMontoEfectivo,
          impuesto: desglose.iva,
          total: desglose.total,
          metodoPago: data.metodoPago,
          clienteId: data.clienteId ?? null,
          usuarioId,
          detalles: { create: detallesNuevos },
        },
        select: { id: true, numeroBoleta: true, fecha: true },
      });

      // ─── 3. APLICAR efectos nuevos ──
      for (const it of items) {
        await tx.producto.update({
          where: { id: it.productoId },
          data: {
            stock: { decrement: it.cantidad },
            ventas: { increment: it.cantidad },
          },
        });
      }
      if (data.clienteId) {
        await tx.cliente.update({
          where: { id: data.clienteId },
          data: {
            compras: { increment: 1 },
            ultimaCompra: v.fecha,
          },
        });
      }

      return v;
    });

    revalidatePath("/ventas");
    revalidatePath(`/ventas/${id}`);
    revalidatePath("/productos");
    revalidatePath("/clientes");

    return {
      ok: true,
      data: {
        id: ventaActualizada.id,
        numeroBoleta: ventaActualizada.numeroBoleta,
      },
    };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues[0]?.message ?? "Datos inválidos" };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al editar venta",
    };
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Búsqueda de productos y clientes (para el formulario)
// ──────────────────────────────────────────────────────────────────────────

export async function buscarProductos(query: string) {
  await requireSession();
  const q = query.trim();
  if (q.length < 2) return [];
  const where: Prisma.ProductoWhereInput = {
    activo: true,
    OR: [
      { nombre: { contains: q, mode: "insensitive" } },
      { codigoBarras: { contains: q, mode: "insensitive" } },
    ],
  };
  return prisma.producto.findMany({
    where,
    take: 20,
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      codigoBarras: true,
      precio: true,
      stock: true,
      categoria: { select: { nombre: true } },
    },
  });
}

export async function buscarClientePorRut(rut: string) {
  await requireSession();
  const limpio = rut.trim();
  if (!limpio) return null;
  return prisma.cliente.findFirst({
    where: {
      OR: [
        { rut: limpio },
        { rut: { contains: limpio.replace(/[\.\-]/g, ""), mode: "insensitive" } },
      ],
    },
    select: { id: true, rut: true, nombre: true, email: true, telefono: true },
  });
}
