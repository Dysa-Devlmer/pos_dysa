"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  prisma,
  EstadoApertura,
  MetodoPago,
  TipoMovimientoCaja,
} from "@repo/db";
import { auth } from "@/auth";

// ──────────────────────────────────────────────────────────────────────────
// F-9 — Caja: turnos (aperturas), movimientos, cierre con diferencia
// ──────────────────────────────────────────────────────────────────────────

export type ActionResult<T = null> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");
  return session;
}

// ─── abrirCaja ────────────────────────────────────────────────────────
const abrirSchema = z.object({
  cajaId: z.number().int().positive(),
  montoInicial: z
    .number()
    .int("Debe ser entero (CLP)")
    .min(0, "No puede ser negativo"),
});

export async function abrirCaja(
  input: z.infer<typeof abrirSchema>,
): Promise<ActionResult<{ id: number }>> {
  try {
    const session = await requireSession();
    const usuarioId = Number(session.user.id);
    const data = abrirSchema.parse(input);

    const caja = await prisma.caja.findUnique({
      where: { id: data.cajaId },
      select: { id: true, activa: true },
    });
    if (!caja) return { ok: false, error: "Caja no encontrada" };
    if (!caja.activa) return { ok: false, error: "Caja inactiva" };

    // Validar que esa Caja no tenga apertura previa abierta
    const existeAbierta = await prisma.aperturaCaja.findFirst({
      where: { cajaId: data.cajaId, estado: EstadoApertura.ABIERTA },
      select: { id: true },
    });
    if (existeAbierta) {
      return {
        ok: false,
        error: `La caja ya tiene una apertura activa (#${existeAbierta.id}). Ciérrela primero.`,
      };
    }

    // Validar que el usuario no tenga otra apertura activa (1 turno simultáneo).
    const aperturaUsuario = await prisma.aperturaCaja.findFirst({
      where: { usuarioId, estado: EstadoApertura.ABIERTA },
      select: { id: true },
    });
    if (aperturaUsuario) {
      return {
        ok: false,
        error: `Ya tiene una apertura activa (#${aperturaUsuario.id}). Ciérrela antes de abrir otra.`,
      };
    }

    const apertura = await prisma.aperturaCaja.create({
      data: {
        cajaId: data.cajaId,
        usuarioId,
        montoInicial: data.montoInicial,
      },
      select: { id: true },
    });

    revalidatePath("/caja");
    return { ok: true, data: { id: apertura.id } };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues[0]?.message ?? "Datos inválidos" };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al abrir caja",
    };
  }
}

// ─── cerrarCaja ───────────────────────────────────────────────────────
const cerrarSchema = z.object({
  aperturaId: z.number().int().positive(),
  montoFinalDeclarado: z
    .number()
    .int("Debe ser entero (CLP)")
    .min(0, "No puede ser negativo"),
  observaciones: z.string().max(500).optional(),
});

/**
 * Calcula el monto final que debería tener la caja según el sistema:
 *   montoInicial
 *   + suma de pagos EFECTIVO de las ventas hechas en este turno (visibles, no soft-deleted)
 *   + sum(INGRESO) - sum(EGRESO) - sum(RETIRO)
 *   + sum(AJUSTE)   (puede ser positivo o negativo según convención; aquí lo sumamos directo)
 */
async function calcularMontoFinalSistema(
  aperturaId: number,
): Promise<{ montoInicial: number; montoFinalSistema: number }> {
  const apertura = await prisma.aperturaCaja.findUnique({
    where: { id: aperturaId },
    select: { montoInicial: true },
  });
  if (!apertura) throw new Error("Apertura no encontrada");

  // Suma efectivo de ventas vivas del turno
  const efectivoAgg = await prisma.pagoVenta.aggregate({
    _sum: { monto: true },
    where: {
      metodo: MetodoPago.EFECTIVO,
      venta: { aperturaId, deletedAt: null },
    },
  });
  const efectivoVentas = efectivoAgg._sum.monto ?? 0;

  // Movimientos
  const movs = await prisma.movimientoCaja.findMany({
    where: { aperturaId },
    select: { tipo: true, monto: true },
  });
  let delta = 0;
  for (const m of movs) {
    if (m.tipo === TipoMovimientoCaja.INGRESO) delta += m.monto;
    else if (
      m.tipo === TipoMovimientoCaja.EGRESO ||
      m.tipo === TipoMovimientoCaja.RETIRO
    )
      delta -= m.monto;
    else delta += m.monto; // AJUSTE — el caller decide signo enviando monto +/-
  }

  return {
    montoInicial: apertura.montoInicial,
    montoFinalSistema: apertura.montoInicial + efectivoVentas + delta,
  };
}

export async function cerrarCaja(
  input: z.infer<typeof cerrarSchema>,
): Promise<ActionResult<{ id: number; diferencia: number }>> {
  try {
    await requireSession();
    const data = cerrarSchema.parse(input);

    const apertura = await prisma.aperturaCaja.findUnique({
      where: { id: data.aperturaId },
      select: { id: true, estado: true },
    });
    if (!apertura) return { ok: false, error: "Apertura no encontrada" };
    if (apertura.estado === EstadoApertura.CERRADA) {
      return { ok: false, error: "La apertura ya está cerrada" };
    }

    const { montoFinalSistema } = await calcularMontoFinalSistema(
      data.aperturaId,
    );
    const diferencia = data.montoFinalDeclarado - montoFinalSistema;

    await prisma.aperturaCaja.update({
      where: { id: data.aperturaId },
      data: {
        estado: EstadoApertura.CERRADA,
        fechaCierre: new Date(),
        montoFinalDeclarado: data.montoFinalDeclarado,
        montoFinalSistema,
        diferencia,
        observaciones: data.observaciones?.trim() || null,
      },
    });

    revalidatePath("/caja");
    revalidatePath(`/caja/${data.aperturaId}/cierre`);
    return { ok: true, data: { id: data.aperturaId, diferencia } };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues[0]?.message ?? "Datos inválidos" };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al cerrar caja",
    };
  }
}

// ─── registrarMovimientoCaja ──────────────────────────────────────────
const movSchema = z.object({
  aperturaId: z.number().int().positive(),
  tipo: z.nativeEnum(TipoMovimientoCaja),
  monto: z.number().int("Debe ser entero (CLP)"),
  motivo: z.string().min(1, "Motivo requerido").max(255),
});

export async function registrarMovimientoCaja(
  input: z.infer<typeof movSchema>,
): Promise<ActionResult<{ id: number }>> {
  try {
    const session = await requireSession();
    const usuarioId = Number(session.user.id);
    const data = movSchema.parse(input);

    // Para INGRESO/EGRESO/RETIRO el monto debe ser positivo. AJUSTE puede ser
    // negativo (caller manda signo).
    if (
      data.tipo !== TipoMovimientoCaja.AJUSTE &&
      data.monto <= 0
    ) {
      return { ok: false, error: "Monto debe ser positivo" };
    }

    const apertura = await prisma.aperturaCaja.findUnique({
      where: { id: data.aperturaId },
      select: { estado: true },
    });
    if (!apertura) return { ok: false, error: "Apertura no encontrada" };
    if (apertura.estado === EstadoApertura.CERRADA) {
      return { ok: false, error: "La apertura está cerrada" };
    }

    const mov = await prisma.movimientoCaja.create({
      data: {
        aperturaId: data.aperturaId,
        tipo: data.tipo,
        monto: data.monto,
        motivo: data.motivo.trim(),
        usuarioId,
      },
      select: { id: true },
    });

    revalidatePath("/caja");
    revalidatePath(`/caja/${data.aperturaId}/cierre`);
    return { ok: true, data: { id: mov.id } };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues[0]?.message ?? "Datos inválidos" };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al registrar movimiento",
    };
  }
}

// ─── obtenerAperturaActiva ────────────────────────────────────────────

export async function obtenerAperturaActiva(usuarioId: number) {
  return prisma.aperturaCaja.findFirst({
    where: { usuarioId, estado: EstadoApertura.ABIERTA },
    include: { caja: { select: { id: true, nombre: true, ubicacion: true } } },
    orderBy: { fechaApertura: "desc" },
  });
}

// ─── obtenerResumenCierre ─────────────────────────────────────────────
//   Helper público para páginas /cerrar y /[id]/cierre. Calcula totales
//   sin mutar el registro.

export async function obtenerResumenCierre(aperturaId: number) {
  const apertura = await prisma.aperturaCaja.findUnique({
    where: { id: aperturaId },
    include: {
      caja: { select: { id: true, nombre: true, ubicacion: true } },
      usuario: { select: { id: true, nombre: true, email: true } },
      movimientos: {
        orderBy: { fecha: "asc" },
        include: { usuario: { select: { nombre: true } } },
      },
    },
  });
  if (!apertura) return null;

  // Totales por método (solo ventas vivas del turno)
  const pagosAgg = await prisma.pagoVenta.groupBy({
    by: ["metodo"],
    _sum: { monto: true },
    _count: { _all: true },
    where: {
      venta: { aperturaId, deletedAt: null },
    },
  });

  const ventasCount = await prisma.venta.count({
    where: { aperturaId, deletedAt: null },
  });
  const ventasTotalAgg = await prisma.venta.aggregate({
    _sum: { total: true },
    where: { aperturaId, deletedAt: null },
  });

  const efectivoVentas =
    pagosAgg.find((p) => p.metodo === MetodoPago.EFECTIVO)?._sum.monto ?? 0;
  let delta = 0;
  for (const m of apertura.movimientos) {
    if (m.tipo === TipoMovimientoCaja.INGRESO) delta += m.monto;
    else if (
      m.tipo === TipoMovimientoCaja.EGRESO ||
      m.tipo === TipoMovimientoCaja.RETIRO
    )
      delta -= m.monto;
    else delta += m.monto;
  }
  const montoFinalSistema = apertura.montoInicial + efectivoVentas + delta;

  return {
    apertura,
    pagosPorMetodo: pagosAgg.map((p) => ({
      metodo: p.metodo,
      total: p._sum.monto ?? 0,
      count: p._count._all,
    })),
    ventasCount,
    ventasTotal: ventasTotalAgg._sum.total ?? 0,
    montoFinalSistema,
  };
}
