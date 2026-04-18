"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@repo/db";
import { auth } from "@/auth";

const productoSchema = z.object({
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(120),
  descripcion: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  codigoBarras: z
    .string()
    .trim()
    .min(3, "Mínimo 3 caracteres")
    .max(60, "Máximo 60 caracteres"),
  categoriaId: z.coerce.number().int().positive("Selecciona una categoría"),
  precio: z.coerce
    .number()
    .int("El precio debe ser un entero (CLP)")
    .nonnegative("El precio no puede ser negativo"),
  stock: z.coerce
    .number()
    .int("El stock debe ser un entero")
    .nonnegative("El stock no puede ser negativo"),
  alertaStock: z.coerce
    .number()
    .int("El umbral de alerta debe ser un entero")
    .nonnegative("El umbral no puede ser negativo")
    .default(5),
  activo: z.boolean().optional().default(true),
});

export type ProductoInput = z.infer<typeof productoSchema>;

export type ActionResult<T = null> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  return session;
}

export async function crearProducto(
  input: ProductoInput,
): Promise<ActionResult> {
  try {
    await requireSession();
    const data = productoSchema.parse(input);

    const existe = await prisma.producto.findUnique({
      where: { codigoBarras: data.codigoBarras },
    });
    if (existe) {
      return { ok: false, error: "Ya existe un producto con ese código de barras" };
    }

    const categoria = await prisma.categoria.findUnique({
      where: { id: data.categoriaId },
    });
    if (!categoria) {
      return { ok: false, error: "La categoría seleccionada no existe" };
    }

    await prisma.producto.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion ?? null,
        codigoBarras: data.codigoBarras,
        categoriaId: data.categoriaId,
        precio: data.precio,
        stock: data.stock,
        alertaStock: data.alertaStock,
        activo: data.activo ?? true,
      },
    });

    revalidatePath("/productos");
    revalidatePath("/alertas");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues[0]?.message ?? "Datos inválidos" };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al crear producto",
    };
  }
}

export async function actualizarProducto(
  id: number,
  input: ProductoInput,
): Promise<ActionResult> {
  try {
    await requireSession();
    const data = productoSchema.parse(input);

    const otro = await prisma.producto.findFirst({
      where: { codigoBarras: data.codigoBarras, NOT: { id } },
    });
    if (otro) {
      return {
        ok: false,
        error: "Ya existe otro producto con ese código de barras",
      };
    }

    const categoria = await prisma.categoria.findUnique({
      where: { id: data.categoriaId },
    });
    if (!categoria) {
      return { ok: false, error: "La categoría seleccionada no existe" };
    }

    await prisma.producto.update({
      where: { id },
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion ?? null,
        codigoBarras: data.codigoBarras,
        categoriaId: data.categoriaId,
        precio: data.precio,
        stock: data.stock,
        alertaStock: data.alertaStock,
        activo: data.activo ?? true,
      },
    });

    revalidatePath("/productos");
    revalidatePath("/alertas");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues[0]?.message ?? "Datos inválidos" };
    }
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Error al actualizar producto",
    };
  }
}

export async function eliminarProducto(id: number): Promise<ActionResult> {
  try {
    await requireSession();

    const detalles = await prisma.detalleVenta.count({
      where: { productoId: id },
    });
    if (detalles > 0) {
      return {
        ok: false,
        error: `No se puede eliminar: el producto tiene ${detalles} venta(s) asociada(s). Desactívalo en su lugar.`,
      };
    }

    await prisma.producto.delete({ where: { id } });
    revalidatePath("/productos");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al eliminar producto",
    };
  }
}
