"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@repo/db";
import type { Rol } from "@repo/db";
import { auth } from "@/auth";

// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────

export type ActionResult<T = null> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export interface PerfilData {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  avatar: string | null;
  createdAt: Date;
}

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No autenticado");
  }
  return { id: Number(session.user.id) };
}

// ──────────────────────────────────────────────────────────────────────────
// 1. obtenerPerfil
// ──────────────────────────────────────────────────────────────────────────

export async function obtenerPerfil(): Promise<ActionResult<PerfilData>> {
  try {
    const { id } = await requireSession();
    const user = await prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        avatar: true,
        createdAt: true,
      },
    });
    if (!user) return { ok: false, error: "Usuario no encontrado" };
    return { ok: true, data: user };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al cargar perfil",
    };
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 2. actualizarPerfil
// ──────────────────────────────────────────────────────────────────────────

const perfilSchema = z.object({
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(120),
  email: z.string().trim().email("Email inválido").max(120).toLowerCase(),
  avatar: z.string().optional(),
});

export type ActualizarPerfilInput = z.infer<typeof perfilSchema>;

export async function actualizarPerfil(
  data: ActualizarPerfilInput,
): Promise<ActionResult> {
  try {
    const { id } = await requireSession();
    const parsed = perfilSchema.parse(data);

    // Email único
    const otro = await prisma.usuario.findFirst({
      where: { email: parsed.email, NOT: { id } },
      select: { id: true },
    });
    if (otro) return { ok: false, error: "Ya existe un usuario con ese email" };

    await prisma.usuario.update({
      where: { id },
      data: {
        nombre: parsed.nombre,
        email: parsed.email,
        ...(parsed.avatar !== undefined ? { avatar: parsed.avatar } : {}),
      },
    });

    revalidatePath("/perfil");
    revalidatePath("/", "layout"); // refresca Header (avatar/nombre)
    return { ok: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues[0]?.message ?? "Datos inválidos" };
    }
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Error al actualizar perfil",
    };
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 3. cambiarPassword
// ──────────────────────────────────────────────────────────────────────────

const passwordSchema = z
  .object({
    actual: z.string().min(1, "Contraseña actual requerida"),
    nueva: z.string().min(6, "Mínimo 6 caracteres").max(200),
    confirmar: z.string().min(1, "Confirmación requerida"),
  })
  .refine((v) => v.nueva === v.confirmar, {
    path: ["confirmar"],
    message: "Las contraseñas no coinciden",
  })
  .refine((v) => v.nueva !== v.actual, {
    path: ["nueva"],
    message: "La nueva contraseña debe ser distinta a la actual",
  });

export type CambiarPasswordInput = z.infer<typeof passwordSchema>;

export async function cambiarPassword(
  data: CambiarPasswordInput,
): Promise<ActionResult> {
  try {
    const { id } = await requireSession();
    const parsed = passwordSchema.parse(data);

    const user = await prisma.usuario.findUnique({
      where: { id },
      select: { password: true },
    });
    if (!user) return { ok: false, error: "Usuario no encontrado" };

    const ok = await bcrypt.compare(parsed.actual, user.password);
    if (!ok) return { ok: false, error: "La contraseña actual es incorrecta" };

    const hash = await bcrypt.hash(parsed.nueva, 12);
    await prisma.usuario.update({
      where: { id },
      data: { password: hash },
    });

    return { ok: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        ok: false,
        error: err.issues[0]?.message ?? "Datos inválidos",
      };
    }
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Error al cambiar contraseña",
    };
  }
}
