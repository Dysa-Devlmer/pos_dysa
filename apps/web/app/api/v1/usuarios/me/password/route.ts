import bcrypt from "bcryptjs";
import { prisma } from "@repo/db";
import { z } from "zod";
import {
  requireAuth,
  requireRateLimit,
  jsonOk,
  jsonError,
} from "../../../_helpers";

/**
 * PUT /api/v1/usuarios/me/password — cambio de contraseña del propio usuario.
 *
 * Reglas portadas del Server Action cambiarPassword() de perfil/actions.ts:
 *   - La contraseña actual debe coincidir con el hash almacenado.
 *   - La nueva debe ser distinta de la actual.
 *   - Mínimo 6 caracteres, máximo 200 (match con el form web existente).
 *
 * Errores devuelven 400 (body inválido) o 401 (actual incorrecta) — el
 * cliente mobile diferencia para mostrar toast distinto.
 */
const Schema = z
  .object({
    actual: z.string().min(1, "Contraseña actual requerida"),
    nueva: z.string().min(6, "Mínimo 6 caracteres").max(200),
  })
  .refine((v) => v.nueva !== v.actual, {
    path: ["nueva"],
    message: "La nueva contraseña debe ser distinta a la actual",
  });

export async function PUT(request: Request) {
  const limited = await requireRateLimit(request);
  if (limited) return limited;
  const { session, error } = await requireAuth(request);
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Body JSON inválido");
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      parsed.error.issues.map((e: { message: string }) => e.message).join(", "),
    );
  }

  const id = Number(session.user.id);
  const user = await prisma.usuario.findUnique({
    where: { id },
    select: { password: true },
  });
  if (!user) return jsonError("Usuario no encontrado", 404);

  const ok = await bcrypt.compare(parsed.data.actual, user.password);
  if (!ok) return jsonError("La contraseña actual es incorrecta", 401);

  const hash = await bcrypt.hash(parsed.data.nueva, 12);
  await prisma.usuario.update({
    where: { id },
    data: { password: hash },
  });

  return jsonOk({ updated: true });
}
