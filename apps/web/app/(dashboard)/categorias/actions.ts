"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@repo/db";
import { auth } from "@/auth";

const categoriaSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(60, "Máximo 60 caracteres"),
  descripcion: z
    .string()
    .trim()
    .max(200, "Máximo 200 caracteres")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  activa: z.boolean().optional().default(true),
});

export type CategoriaInput = z.infer<typeof categoriaSchema>;

export type ActionResult<T = null> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("No autenticado");
  }
  return session;
}

export async function crearCategoria(
  input: CategoriaInput,
): Promise<ActionResult> {
  try {
    await requireSession();
    const data = categoriaSchema.parse(input);

    const existe = await prisma.categoria.findUnique({
      where: { nombre: data.nombre },
    });
    if (existe) {
      return { ok: false, error: "Ya existe una categoría con ese nombre" };
    }

    await prisma.categoria.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion ?? null,
        activa: data.activa ?? true,
      },
    });

    revalidatePath("/categorias");
    return { ok: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues[0]?.message ?? "Datos inválidos" };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al crear categoría",
    };
  }
}

export async function actualizarCategoria(
  id: number,
  input: CategoriaInput,
): Promise<ActionResult> {
  try {
    await requireSession();
    const data = categoriaSchema.parse(input);

    const otra = await prisma.categoria.findFirst({
      where: { nombre: data.nombre, NOT: { id } },
    });
    if (otra) {
      return { ok: false, error: "Ya existe otra categoría con ese nombre" };
    }

    await prisma.categoria.update({
      where: { id },
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion ?? null,
        activa: data.activa ?? true,
      },
    });

    revalidatePath("/categorias");
    return { ok: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues[0]?.message ?? "Datos inválidos" };
    }
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Error al actualizar categoría",
    };
  }
}

export async function eliminarCategoria(id: number): Promise<ActionResult> {
  try {
    await requireSession();

    const productos = await prisma.producto.count({
      where: { categoriaId: id },
    });
    if (productos > 0) {
      return {
        ok: false,
        error: `No se puede eliminar: la categoría tiene ${productos} producto(s) asociado(s)`,
      };
    }

    await prisma.categoria.delete({ where: { id } });
    revalidatePath("/categorias");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al eliminar categoría",
    };
  }
}
