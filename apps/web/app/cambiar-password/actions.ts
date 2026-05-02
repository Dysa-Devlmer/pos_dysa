"use server";

/**
 * Fase 3C.2 — Cambio obligatorio de contraseña en primer login.
 *
 * Ruta dedicada fuera de `(dashboard)` para evitar el loop del gate del
 * layout. Solo accesible si hay sesión válida; si no, el middleware
 * redirige a /login.
 *
 * Diferencia con `cambiarPassword` de `app/(dashboard)/perfil/actions.ts`:
 * - Acá NO se pide la contraseña actual. El usuario llegó porque ADMIN le
 *   asignó una temporal y la conoce de la entrega. Pedirla de nuevo es
 *   fricción innecesaria; el bcrypt.compare de login ya validó que la
 *   conoce. (El `cambiarPassword` del perfil sí la pide, porque es flujo
 *   voluntario y queremos confirmar identidad fresca.)
 * - Acá se valida que la NUEVA sea distinta a la actual (defense-in-depth
 *   contra "cambio cosmético" donde el usuario reusa la temporal).
 */

import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@repo/db";
import { auth } from "@/auth";

export type ActionResult = { ok: true } | { ok: false; error: string };

const schema = z
  .object({
    nueva: z.string().min(6, "Mínimo 6 caracteres").max(200),
    confirmar: z.string().min(1, "Confirmación requerida"),
  })
  .refine((v) => v.nueva === v.confirmar, {
    path: ["confirmar"],
    message: "Las contraseñas no coinciden",
  });

export async function cambiarPasswordObligatorio(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const id = Number(session.user.id);

  const parsed = schema.safeParse({
    nueva: formData.get("nueva"),
    confirmar: formData.get("confirmar"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  // Validar que la nueva sea distinta a la temporal actual.
  const usuario = await prisma.usuario.findUnique({
    where: { id },
    select: { password: true, mustChangePassword: true },
  });
  if (!usuario) {
    redirect("/login");
  }

  // Si por alguna razón el flag ya estaba en false, dejamos pasar pero
  // sin bloquear — el cambio sigue siendo válido.
  const sameAsTemp = await bcrypt.compare(parsed.data.nueva, usuario.password);
  if (sameAsTemp) {
    return {
      error:
        "La nueva contraseña debe ser distinta a la que te asignaron.",
    };
  }

  const hash = await bcrypt.hash(parsed.data.nueva, 12);
  await prisma.usuario.update({
    where: { id },
    data: { password: hash, mustChangePassword: false },
  });

  // Invalida el cache del layout dashboard para que la siguiente nav
  // vea mustChangePassword=false y deje pasar (sin esto el redirect a
  // / volvería al gate y mandaría de nuevo a /cambiar-password hasta
  // que el cache expire ~5min).
  revalidateTag(`usuario:${id}`);

  redirect("/");
}
