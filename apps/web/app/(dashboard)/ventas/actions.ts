"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { customAlphabet } from "nanoid";
import { prisma, MetodoPago, Prisma, AuditAccion, EstadoApertura } from "@repo/db";
import { auth } from "@/auth";
import { calcularDesglose } from "@/lib/utils";
import { VENTAS_VISIBLES } from "@/lib/db-helpers";

// ──────────────────────────────────────────────────────────────────────────
// Schemas
// ──────────────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  productoId: z.number().int().positive(),
  cantidad: z.number().int().positive("Cantidad debe ser mayor a 0"),
});

// F-9: Split tender — pagoSchema vive en ./schemas.ts (no puede vivir aquí
// porque "use server" solo permite exportar funciones async).
import { pagoSchema } from "./schemas";

const ventaInputSchema = z.object({
  clienteId: z.number().int().positive().nullable().optional(),
  // metodoPago legacy queda opcional: si viene `pagos` se ignora y se calcula.
  // Si NO viene `pagos` (callers viejos antes de F-9), se trata como pago único.
  metodoPago: z.nativeEnum(MetodoPago).optional(),
  pagos: z.array(pagoSchema).min(1).optional(),
  // Solo relevante si hay pago en EFECTIVO. El vuelto se calcula:
  //   vuelto = montoRecibido - sum(efectivo)
  montoRecibido: z
    .number()
    .int("Debe ser entero (CLP)")
    .min(0, "No puede ser negativo")
    .optional(),
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

    // ─── F-9: Resolver pagos + apertura activa ──────────────────────────
    // Si el caller envía `pagos` se usa split tender. Si no, se compatibiliza
    // con callers viejos (un solo metodoPago, monto = total).
    const pagosInput: Array<{
      metodo: MetodoPago;
      monto: number;
      referencia?: string;
    }> =
      data.pagos && data.pagos.length > 0
        ? data.pagos
        : [{ metodo: data.metodoPago ?? MetodoPago.EFECTIVO, monto: desglose.total }];

    // Validar suma de pagos == total
    const sumaPagos = pagosInput.reduce((a, p) => a + p.monto, 0);
    const sumaEfectivo = pagosInput
      .filter((p) => p.metodo === MetodoPago.EFECTIVO)
      .reduce((a, p) => a + p.monto, 0);
    const hayEfectivo = sumaEfectivo > 0;

    // Para tenders no-efectivo, suma debe ser exactamente el total (no se
    // permite "vuelto" en débito/crédito). Para efectivo se permite sumaPagos
    // >= total (vuelto = montoRecibido - sumaEfectivo) PERO los `pagos` deben
    // representar exactamente cuánto se cobró por método: en efectivo el monto
    // del PagoVenta es el aplicado a la venta (no incluye vuelto).
    if (sumaPagos !== desglose.total) {
      return {
        ok: false,
        error: `La suma de pagos (${sumaPagos}) no coincide con el total (${desglose.total})`,
      };
    }

    // Validar montoRecibido si hay efectivo
    let vuelto: number | null = null;
    let montoRecibido: number | null = null;
    if (hayEfectivo) {
      const recibido = data.montoRecibido ?? sumaEfectivo;
      if (recibido < sumaEfectivo) {
        return {
          ok: false,
          error: `Monto recibido (${recibido}) menor al efectivo declarado (${sumaEfectivo})`,
        };
      }
      montoRecibido = recibido;
      vuelto = recibido - sumaEfectivo;
    }

    // metodoPago para back-compat: único método si pagos.length==1, sino MIXTO
    const metodoPagoFlat: MetodoPago =
      pagosInput.length === 1
        ? pagosInput[0]!.metodo
        : MetodoPago.MIXTO;

    // Resolver apertura activa del cajero
    const apertura = await prisma.aperturaCaja.findFirst({
      where: { usuarioId, estado: EstadoApertura.ABIERTA },
      select: { id: true },
    });
    if (!apertura) {
      return {
        ok: false,
        error: "Debe abrir caja primero",
      };
    }

    const numeroBoleta = generarNumeroBoleta();

    const venta = await prisma.$transaction(async (tx) => {
      // 1. Crear la venta + detalles + pagos
      const v = await tx.venta.create({
        data: {
          numeroBoleta,
          subtotal: subtotalBruto,
          descuentoPct: data.descuentoPct,
          descuentoMonto: descuentoMontoEfectivo,
          impuesto: desglose.iva,
          total: desglose.total,
          metodoPago: metodoPagoFlat,
          usuarioId,
          clienteId: data.clienteId ?? null,
          aperturaId: apertura.id,
          montoRecibido,
          vuelto,
          detalles: { create: detalles },
          pagos: {
            create: pagosInput.map((p) => ({
              metodo: p.metodo,
              monto: p.monto,
              referencia: p.referencia ?? null,
            })),
          },
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
// ELIMINAR VENTA — soft-delete (F-3 audit P1)
//   → revierte stock + ventas + compras + ultimaCompra (idéntico al hard
//     delete previo) PERO no elimina la fila: setea deletedAt/deletedBy y
//     escribe AuditLog(accion=DELETE).
//   → razón opcional para trazabilidad.
//   → la fila queda fuera de listings (filtro `VENTAS_VISIBLES`) y se
//     puede restaurar desde /ventas/eliminadas (ADMIN-only).
// ──────────────────────────────────────────────────────────────────────────

export async function eliminarVenta(
  id: number,
  razon?: string,
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const usuarioId = Number(session.user.id);

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
      const venta = await tx.venta.findFirst({
        where: { id, ...VENTAS_VISIBLES },
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
      //    (NO contamos otras ventas eliminadas en el MAX — usamos VENTAS_VISIBLES).
      if (venta.clienteId !== null) {
        const clienteId = venta.clienteId;
        const otraUltima = await tx.venta.findFirst({
          where: {
            clienteId,
            NOT: { id: venta.id },
            ...VENTAS_VISIBLES,
          },
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

      // 3. Soft-delete: marcar deletedAt + razón. Detalles permanecen para
      //    poder restaurar (re-aplicar stock decrement) sin perder la
      //    composición original.
      await tx.venta.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedBy: usuarioId,
          deletionReason: razon?.trim() ? razon.trim().slice(0, 500) : null,
        },
      });

      // 4. AuditLog. Snapshot mínimo: detalles + total + cliente para
      //    poder reconstruir contexto incluso si se hard-deletea más tarde.
      await tx.auditLog.create({
        data: {
          tabla: "ventas",
          registroId: id,
          accion: AuditAccion.DELETE,
          usuarioId,
          diff: {
            numeroBoleta: venta.numeroBoleta,
            total: venta.total,
            clienteId: venta.clienteId,
            metodoPago: venta.metodoPago,
            razon: razon ?? null,
            detalles: venta.detalles.map((d) => ({
              productoId: d.productoId,
              cantidad: d.cantidad,
              precioUnitario: d.precioUnitario,
            })),
          },
        },
      });
    });

    revalidatePath("/ventas");
    revalidatePath("/ventas/eliminadas");
    revalidatePath("/productos");
    revalidatePath("/clientes");

    return { ok: true };
  } catch (err) {
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
// RESTAURAR VENTA — ADMIN-only (F-3)
//   → re-aplica stock decrement + ventas/compras/ultimaCompra
//   → si stock actual no permite re-aplicar (alguien vendió mientras estaba
//     borrada) → error 409 con mensaje claro
//   → audit log con accion=RESTORE
// ──────────────────────────────────────────────────────────────────────────

export async function restaurarVenta(
  id: number,
  razon?: string,
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    if (session.user.rol !== "ADMIN") {
      return { ok: false, error: "Solo un administrador puede restaurar ventas" };
    }
    const usuarioId = Number(session.user.id);

    await prisma.$transaction(async (tx) => {
      const venta = await tx.venta.findUnique({
        where: { id },
        include: { detalles: true },
      });
      if (!venta) throw new Error("Venta no encontrada");
      if (venta.deletedAt === null) {
        throw new Error("La venta no está eliminada");
      }

      // Validar stock disponible para cada producto del detalle.
      const productos = await tx.producto.findMany({
        where: { id: { in: venta.detalles.map((d) => d.productoId) } },
        select: { id: true, nombre: true, stock: true, activo: true },
      });
      const prodMap = new Map(productos.map((p) => [p.id, p]));

      for (const d of venta.detalles) {
        const p = prodMap.get(d.productoId);
        if (!p) {
          throw new Error(
            `No se puede restaurar: el producto del detalle ya no existe.`,
          );
        }
        if (p.stock < d.cantidad) {
          // 409 Conflict semántico — el caller mapea por mensaje
          throw new Error(
            `STOCK_INSUFICIENTE: No hay stock suficiente para restaurar "${p.nombre}" (disponible: ${p.stock}, requerido: ${d.cantidad}).`,
          );
        }
      }

      // Re-aplicar stock + contadores
      for (const d of venta.detalles) {
        await tx.producto.update({
          where: { id: d.productoId },
          data: {
            stock: { decrement: d.cantidad },
            ventas: { increment: d.cantidad },
          },
        });
      }

      if (venta.clienteId !== null) {
        const cid = venta.clienteId;
        // ultimaCompra debe quedar = MAX(fecha) considerando esta venta
        // ahora viva. Recalculamos desde 0 sobre VENTAS_VISIBLES + esta.
        const ultimaActual = await tx.venta.findFirst({
          where: { clienteId: cid, ...VENTAS_VISIBLES },
          orderBy: { fecha: "desc" },
          select: { fecha: true },
        });
        const nuevaUltima =
          !ultimaActual || venta.fecha > ultimaActual.fecha
            ? venta.fecha
            : ultimaActual.fecha;
        await tx.cliente.update({
          where: { id: cid },
          data: {
            compras: { increment: 1 },
            ultimaCompra: nuevaUltima,
          },
        });
      }

      await tx.venta.update({
        where: { id },
        data: {
          deletedAt: null,
          deletedBy: null,
          deletionReason: null,
        },
      });

      await tx.auditLog.create({
        data: {
          tabla: "ventas",
          registroId: id,
          accion: AuditAccion.RESTORE,
          usuarioId,
          diff: {
            numeroBoleta: venta.numeroBoleta,
            total: venta.total,
            razon: razon ?? null,
          },
        },
      });
    });

    revalidatePath("/ventas");
    revalidatePath("/ventas/eliminadas");
    revalidatePath("/productos");
    revalidatePath("/clientes");

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al restaurar venta";
    if (msg.startsWith("STOCK_INSUFICIENTE:")) {
      // Devolvemos sin el prefix para UI
      return { ok: false, error: msg.replace("STOCK_INSUFICIENTE: ", "") };
    }
    return { ok: false, error: msg };
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
    const ventaVieja = await prisma.venta.findFirst({
      where: { id, ...VENTAS_VISIBLES },
      include: { detalles: true },
    });
    if (!ventaVieja) return { ok: false, error: "Venta no encontrada" };

    // Pre-check defensivo: si la venta tiene devoluciones asociadas, no se puede
    // editar (revertir/aplicar stock e items rompería la consistencia con
    // DevolucionItem y los contadores ya ajustados). El UI ya bloquea el botón
    // y la página de edición redirige; este guard cubre llamadas directas.
    const devolucionesCount = await prisma.devolucion.count({
      where: { ventaId: id },
    });
    if (devolucionesCount > 0) {
      return {
        ok: false,
        error: `No se puede editar: la venta tiene ${devolucionesCount} devolución(es) asociada(s). Elimina primero las devoluciones.`,
      };
    }

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
          where: { clienteId: cid, NOT: { id }, ...VENTAS_VISIBLES },
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
          metodoPago: data.metodoPago ?? ventaVieja.metodoPago,
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
