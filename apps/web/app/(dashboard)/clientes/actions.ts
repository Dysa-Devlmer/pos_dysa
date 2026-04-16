"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@repo/db";
import { auth } from "@/auth";
import { formatRUT, validarRUT } from "@/lib/utils";

const clienteSchema = z.object({
  rut: z
    .string()
    .trim()
    .min(3, "RUT requerido")
    .max(20)
    .refine((v) => validarRUT(v), "RUT inválido"),
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(120),
  email: z
    .string()
    .trim()
    .email("Email inválido")
    .max(120)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  telefono: z
    .string()
    .trim()
    .max(30)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  direccion: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type ClienteInput = z.infer<typeof clienteSchema>;

export type ActionResult<T = null> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  return session;
}

function normalizarRut(rut: string): string {
  return formatRUT(rut.replace(/[\.\-]/g, "").toUpperCase());
}

export async function crearCliente(
  input: ClienteInput,
): Promise<ActionResult> {
  try {
    await requireSession();
    const data = clienteSchema.parse(input);
    const rutFormateado = normalizarRut(data.rut);

    const existe = await prisma.cliente.findUnique({
      where: { rut: rutFormateado },
    });
    if (existe) {
      return { ok: false, error: "Ya existe un cliente con ese RUT" };
    }

    await prisma.cliente.create({
      data: {
        rut: rutFormateado,
        nombre: data.nombre,
        email: data.email ?? null,
        telefono: data.telefono ?? null,
        direccion: data.direccion ?? null,
      },
    });

    revalidatePath("/clientes");
    return { ok: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues[0]?.message ?? "Datos inválidos" };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al crear cliente",
    };
  }
}

export async function actualizarCliente(
  id: number,
  input: ClienteInput,
): Promise<ActionResult> {
  try {
    await requireSession();
    const data = clienteSchema.parse(input);
    const rutFormateado = normalizarRut(data.rut);

    const otro = await prisma.cliente.findFirst({
      where: { rut: rutFormateado, NOT: { id } },
    });
    if (otro) {
      return { ok: false, error: "Ya existe otro cliente con ese RUT" };
    }

    await prisma.cliente.update({
      where: { id },
      data: {
        rut: rutFormateado,
        nombre: data.nombre,
        email: data.email ?? null,
        telefono: data.telefono ?? null,
        direccion: data.direccion ?? null,
      },
    });

    revalidatePath("/clientes");
    return { ok: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues[0]?.message ?? "Datos inválidos" };
    }
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Error al actualizar cliente",
    };
  }
}

export async function eliminarCliente(id: number): Promise<ActionResult> {
  try {
    await requireSession();

    const ventas = await prisma.venta.count({ where: { clienteId: id } });
    if (ventas > 0) {
      return {
        ok: false,
        error: `No se puede eliminar: el cliente tiene ${ventas} venta(s) asociada(s).`,
      };
    }

    await prisma.cliente.delete({ where: { id } });
    revalidatePath("/clientes");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al eliminar cliente",
    };
  }
}
