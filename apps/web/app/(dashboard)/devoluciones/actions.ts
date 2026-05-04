"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@repo/db";
import { auth } from "@/auth";
import { generatePublicToken } from "@/lib/public-token";

// ──────────────────────────────────────────────────────────────────────────
// Schemas
// ──────────────────────────────────────────────────────────────────────────

const devolucionItemSchema = z.object({
  productoId: z.number().int().positive(),
  cantidadDevolver: z.number().int().positive("Cantidad debe ser mayor a 0"),
});

const crearDevolucionSchema = z.object({
  ventaId: z.number().int().positive("ventaId inválido"),
  motivo: z
    .string()
    .trim()
    .min(5, "El motivo debe tener al menos 5 caracteres")
    .max(255, "Máximo 255 caracteres"),
  items: z
    .array(devolucionItemSchema)
    .min(1, "Debe devolver al menos un producto"),
});

export type CrearDevolucionInput = z.infer<typeof crearDevolucionSchema>;

export type ActionResult<T = null> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/**
 * Patch RBAC Fase 3D.4 — devoluciones ADMIN-only por decisión CEO.
 *
 * Hallazgo H2: el manual web declara devoluciones como ADMIN, pero
 * server-side solo había `requireSession`. Decisión Pierre 2026-05-04:
 * durante el patch, devoluciones quedan ADMIN-only en TODOS los
 * surfaces (web + API REST + mobile que consume `/api/v1/devoluciones`).
 *
 * Cuando llegue Fase 3D.5 con MANAGER, este chequeo se relaja a
 * `requirePermission(Permiso.DEVOLUCIONES_CREAR)` — MANAGER tendrá
 * el permiso por default, ADMIN también, CAJERO/VENDEDOR pueden
 * recibirlo como override granular si la política del tenant lo
 * permite.
 */
async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");
  if (session.user.rol !== "ADMIN") {
    throw new Error("Permiso denegado: solo ADMIN puede gestionar devoluciones");
  }
  return session;
}

// ──────────────────────────────────────────────────────────────────────────
// crearDevolucion — $transaction
// ──────────────────────────────────────────────────────────────────────────

export async function crearDevolucion(
  input: CrearDevolucionInput,
): Promise<ActionResult<{ id: number; esTotal: boolean; publicToken: string }>> {
  try {
    const session = await requireAdmin();
    const usuarioId = Number(session.user.id);
    const data = crearDevolucionSchema.parse(input);

    // Consolidar items (si el usuario mandó el mismo productoId varias veces)
    const itemsMap = new Map<number, number>();
    for (const it of data.items) {
      itemsMap.set(
        it.productoId,
        (itemsMap.get(it.productoId) ?? 0) + it.cantidadDevolver,
      );
    }
    const consolidados = [...itemsMap.entries()].map(
      ([productoId, cantidad]) => ({ productoId, cantidad }),
    );

    const result = await prisma.$transaction(async (tx) => {
      // 0. Bloqueo pesimista: serializa devoluciones sobre la misma venta.
      //    NOWAIT falla rápido si otra transacción ya tiene el lock —
      //    el catch de $transaction lo convierte en { ok: false, error }.
      await tx.$queryRaw`
        SELECT id FROM ventas WHERE id = ${data.ventaId} FOR UPDATE NOWAIT
      `;

      // 1. Cargar venta con detalles y cliente + devoluciones previas
      const venta = await tx.venta.findUnique({
        where: { id: data.ventaId },
        include: {
          detalles: true,
          cliente: true,
          devoluciones: {
            include: { items: true },
          },
        },
      });
      if (!venta) throw new Error("La venta no existe");

      // 2. Si ya hay una devolución total registrada → rechazar
      const tieneTotalPrevia = venta.devoluciones.some((d) => d.esTotal);
      if (tieneTotalPrevia) {
        throw new Error(
          "La venta ya tiene una devolución total registrada; no se admiten nuevas devoluciones.",
        );
      }

      // 3. Calcular cantidad previamente devuelta por productoId
      const devueltoPrevio = new Map<number, number>();
      for (const dev of venta.devoluciones) {
        for (const it of dev.items) {
          devueltoPrevio.set(
            it.productoId,
            (devueltoPrevio.get(it.productoId) ?? 0) + it.cantidad,
          );
        }
      }

      // 4. Validar cada item: existe en la venta + cantidad devuelta (previa + actual) ≤ vendida
      const detallesMap = new Map(
        venta.detalles.map((d) => [d.productoId, d] as const),
      );
      let lineasDevueltasSubtotal = 0;
      type LineaDevolucion = {
        productoId: number;
        cantidad: number;
        precioUnitario: number;
        subtotal: number;
      };
      const lineas: LineaDevolucion[] = [];

      for (const it of consolidados) {
        const det = detallesMap.get(it.productoId);
        if (!det) {
          throw new Error(
            `El producto ${it.productoId} no figura en la venta original.`,
          );
        }
        const prev = devueltoPrevio.get(it.productoId) ?? 0;
        const disponibleAhora = det.cantidad - prev;
        if (it.cantidad > disponibleAhora) {
          throw new Error(
            `No se puede devolver ${it.cantidad} unidad(es) del producto ${it.productoId}: sólo quedan ${disponibleAhora} disponibles (vendidas: ${det.cantidad}, ya devueltas: ${prev}).`,
          );
        }

        const subtotalLinea = det.precioUnitario * it.cantidad;
        lineasDevueltasSubtotal += subtotalLinea;
        lineas.push({
          productoId: it.productoId,
          cantidad: it.cantidad,
          precioUnitario: det.precioUnitario,
          subtotal: subtotalLinea,
        });
      }

      // 5. Determinar si esta devolución (sumada a las previas) cubre el 100%
      //    de las unidades vendidas originales (independientemente del valor)
      const totalUnidadesVendidas = venta.detalles.reduce(
        (a, d) => a + d.cantidad,
        0,
      );
      const totalDevueltoUnidades =
        [...devueltoPrevio.values()].reduce((a, n) => a + n, 0) +
        consolidados.reduce((a, c) => a + c.cantidad, 0);
      const esTotal = totalDevueltoUnidades >= totalUnidadesVendidas;

      // 6. Monto devuelto: proporcional al total real de la venta (incluye
      //    descuentos e IVA). Usamos ratio = subtotalLineas / subtotalBrutoVenta.
      let montoDevuelto = 0;
      if (venta.subtotal > 0) {
        const ratio = lineasDevueltasSubtotal / venta.subtotal;
        montoDevuelto = Math.round(venta.total * ratio);
      }
      // Clamping defensivo: nunca exceder el total de la venta.
      if (montoDevuelto > venta.total) montoDevuelto = venta.total;

      // 7. Crear Devolucion + items
      const devolucion = await tx.devolucion.create({
        data: {
          publicToken: generatePublicToken(),
          ventaId: venta.id,
          motivo: data.motivo,
          montoDevuelto,
          esTotal,
          creadoPor: usuarioId,
          items: { create: lineas },
        },
        select: { id: true, esTotal: true, publicToken: true },
      });

      // 8. Revertir stock y contador de ventas por cada producto devuelto
      for (const l of lineas) {
        await tx.producto.update({
          where: { id: l.productoId },
          data: {
            stock: { increment: l.cantidad },
            ventas: { decrement: l.cantidad },
          },
        });
      }

      // 9. Si es TOTAL y hay cliente → compras-- y recalcular ultimaCompra
      //    (igual que eliminarVenta, pero considerando que esta venta cuenta
      //    como anulada desde ahora). No usamos la venta en sí.
      if (esTotal && venta.clienteId !== null) {
        const clienteId = venta.clienteId;
        // Ventas activas restantes del cliente = todas sus ventas cuya
        // devolucion total NO exista. La actual cuenta como anulada.
        const otrasVentas = await tx.venta.findMany({
          where: {
            clienteId,
            NOT: { id: venta.id },
          },
          select: {
            fecha: true,
            devoluciones: { select: { esTotal: true } },
          },
          orderBy: { fecha: "desc" },
        });
        const activas = otrasVentas.filter(
          (v) => !v.devoluciones.some((d) => d.esTotal),
        );
        const nuevaUltima = activas[0]?.fecha ?? null;

        await tx.cliente.update({
          where: { id: clienteId },
          data: {
            compras: { decrement: 1 },
            ultimaCompra: nuevaUltima,
          },
        });
      }

      return devolucion;
    });

    revalidatePath("/devoluciones");
    revalidatePath("/ventas");
    revalidatePath(`/ventas/${data.ventaId}`);
    revalidatePath("/productos");
    revalidatePath("/alertas");
    revalidatePath("/", "layout");

    return { ok: true, data: result };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues[0]?.message ?? "Datos inválidos" };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al crear devolución",
    };
  }
}

// ──────────────────────────────────────────────────────────────────────────
// listarDevoluciones — para la page de /devoluciones
// ──────────────────────────────────────────────────────────────────────────

export interface ListarDevolucionesParams {
  desde?: Date | null;
  hasta?: Date | null;
}

export async function listarDevoluciones({
  desde,
  hasta,
}: ListarDevolucionesParams = {}) {
  await requireAdmin();
  return prisma.devolucion.findMany({
    where: {
      ...(desde || hasta
        ? {
            fecha: {
              ...(desde ? { gte: desde } : {}),
              ...(hasta ? { lte: hasta } : {}),
            },
          }
        : {}),
    },
    orderBy: { fecha: "desc" },
    include: {
      venta: {
        select: {
          id: true,
          publicToken: true,
          numeroBoleta: true,
          total: true,
          fecha: true,
          cliente: { select: { nombre: true, rut: true } },
        },
      },
      usuario: { select: { nombre: true, email: true } },
      _count: { select: { items: true } },
    },
  });
}

export async function obtenerDevolucion(id: number) {
  await requireAdmin();
  return prisma.devolucion.findUnique({
    where: { id },
    include: {
      venta: {
        include: {
          cliente: { select: { nombre: true, rut: true } },
          detalles: true,
        },
      },
      usuario: { select: { nombre: true, email: true } },
      items: {
        include: {
          producto: { select: { id: true, nombre: true, codigoBarras: true } },
        },
      },
    },
  });
}
