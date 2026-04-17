"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma, Rol } from "@repo/db";
import { auth } from "@/auth";

const baseUsuarioSchema = z.object({
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(120),
  email: z.string().trim().email("Email inválido").max(120).toLowerCase(),
  rol: z.nativeEnum(Rol),
  activo: z.boolean().optional().default(true),
});

const crearUsuarioSchema = baseUsuarioSchema.extend({
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

const actualizarUsuarioSchema = baseUsuarioSchema.extend({
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
export type ActualizarUsuarioInput = z.infer<typeof actualizarUsuarioSchema>;

export type ActionResult<T = null> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("No autenticado");
  }
  if (session.user.rol !== "ADMIN") {
    throw new Error("Permiso denegado: solo ADMIN puede gestionar usuarios");
  }
  return session;
}

export async function crearUsuario(
  input: CrearUsuarioInput,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const data = crearUsuarioSchema.parse(input);

    const existe = await prisma.usuario.findUnique({
      where: { email: data.email },
    });
    if (existe) {
      return { ok: false, error: "Ya existe un usuario con ese email" };
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    await prisma.usuario.create({
      data: {
        nombre: data.nombre,
        email: data.email,
        password: passwordHash,
        rol: data.rol,
        activo: data.activo ?? true,
      },
    });

    revalidatePath("/usuarios");
    return { ok: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues[0]?.message ?? "Datos inválidos" };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al crear usuario",
    };
  }
}

export async function actualizarUsuario(
  id: number,
  input: ActualizarUsuarioInput,
): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    const data = actualizarUsuarioSchema.parse(input);

    // Evitar que un ADMIN se auto-desactive o se quite el rol ADMIN
    const esAutoEdicion = session.user.id === String(id);
    if (esAutoEdicion && data.activo === false) {
      return { ok: false, error: "No puedes desactivar tu propio usuario" };
    }
    if (esAutoEdicion && data.rol !== "ADMIN") {
      return {
        ok: false,
        error: "No puedes quitarte el rol ADMIN a ti mismo",
      };
    }

    const otro = await prisma.usuario.findFirst({
      where: { email: data.email, NOT: { id } },
    });
    if (otro) {
      return { ok: false, error: "Ya existe otro usuario con ese email" };
    }

    const updateData: {
      nombre: string;
      email: string;
      rol: Rol;
      activo: boolean;
      password?: string;
    } = {
      nombre: data.nombre,
      email: data.email,
      rol: data.rol,
      activo: data.activo ?? true,
    };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 12);
    }

    await prisma.usuario.update({ where: { id }, data: updateData });

    revalidatePath("/usuarios");
    return { ok: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues[0]?.message ?? "Datos inválidos" };
    }
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Error al actualizar usuario",
    };
  }
}

export async function eliminarUsuario(id: number): Promise<ActionResult> {
  try {
    const session = await requireAdmin();

    if (session.user.id === String(id)) {
      return { ok: false, error: "No puedes eliminar tu propio usuario" };
    }

    const ventas = await prisma.venta.count({ where: { usuarioId: id } });
    if (ventas > 0) {
      return {
        ok: false,
        error: `No se puede eliminar: el usuario tiene ${ventas} venta(s) registradas. Desactívalo en su lugar.`,
      };
    }

    await prisma.usuario.delete({ where: { id } });
    revalidatePath("/usuarios");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al eliminar usuario",
    };
  }
}
