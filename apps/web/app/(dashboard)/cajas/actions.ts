"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@repo/db";
import { auth } from "@/auth";

const cajaSchema = z.object({
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(80),
  ubicacion: z
    .string()
    .trim()
    .max(120)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  activa: z.boolean().optional().default(true),
});

export type CajaInput = z.infer<typeof cajaSchema>;

export type ActionResult<T = null> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("No autenticado");
  }
  if (session.user.rol !== "ADMIN") {
    throw new Error("Permiso denegado: solo ADMIN puede gestionar cajas");
  }
  return session;
}

export async function crearCaja(input: CajaInput): Promise<ActionResult> {
  try {
    await requireAdmin();
    const data = cajaSchema.parse(input);

    const existe = await prisma.caja.findFirst({
      where: { nombre: data.nombre },
    });
    if (existe) {
      return { ok: false, error: "Ya existe una caja con ese nombre" };
    }

    await prisma.caja.create({
      data: {
        nombre: data.nombre,
        ubicacion: data.ubicacion,
        activa: data.activa ?? true,
      },
    });

    revalidatePath("/cajas");
    return { ok: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues[0]?.message ?? "Datos inválidos" };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al crear caja",
    };
  }
}

export async function actualizarCaja(
  id: number,
  input: CajaInput,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const data = cajaSchema.parse(input);

    const otra = await prisma.caja.findFirst({
      where: { nombre: data.nombre, NOT: { id } },
    });
    if (otra) {
      return { ok: false, error: "Ya existe otra caja con ese nombre" };
    }

    await prisma.caja.update({
      where: { id },
      data: {
        nombre: data.nombre,
        ubicacion: data.ubicacion,
        activa: data.activa ?? true,
      },
    });

    revalidatePath("/cajas");
    return { ok: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues[0]?.message ?? "Datos inválidos" };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al actualizar caja",
    };
  }
}

export async function eliminarCaja(id: number): Promise<ActionResult> {
  try {
    await requireAdmin();

    // Pre-check: rechazar si hay aperturas (históricas o activas) — preserva
    // trazabilidad contable. Sugerir desactivar en su lugar.
    const aperturas = await prisma.aperturaCaja.count({ where: { cajaId: id } });
    if (aperturas > 0) {
      return {
        ok: false,
        error: `No se puede eliminar: la caja tiene ${aperturas} apertura(s) registrada(s). Desactívala en su lugar para preservar el historial contable.`,
      };
    }

    await prisma.caja.delete({ where: { id } });
    revalidatePath("/cajas");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al eliminar caja",
    };
  }
}
