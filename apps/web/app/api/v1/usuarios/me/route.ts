import { prisma } from "@repo/db";
import { z } from "zod";
import {
  requireAuth,
  requireRateLimit,
  jsonOk,
  jsonError,
} from "../../_helpers";

/**
 * GET /api/v1/usuarios/me — perfil del usuario actual (Bearer o cookie).
 * PUT /api/v1/usuarios/me — actualiza nombre/email/avatar. NO password
 *                          (ese endpoint está en /me/password).
 *
 * Shape alineado con obtenerPerfil() del Server Action /perfil/actions.ts
 * para que cliente mobile y web compartan tipos vía @repo/api-client.
 */

export async function GET(request: Request) {
  const limited = await requireRateLimit(request);
  if (limited) return limited;
  const { session, error } = await requireAuth(request);
  if (error) return error;

  const id = Number(session.user.id);
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
  if (!user) return jsonError("Usuario no encontrado", 404);
  return jsonOk(user);
}

const UpdateSchema = z.object({
  nombre: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(120).toLowerCase(),
  avatar: z.string().optional(),
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

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      parsed.error.issues.map((e: { message: string }) => e.message).join(", "),
    );
  }

  const id = Number(session.user.id);
  const { nombre, email, avatar } = parsed.data;

  const otro = await prisma.usuario.findFirst({
    where: { email, NOT: { id } },
    select: { id: true },
  });
  if (otro) return jsonError("Ya existe un usuario con ese email", 409);

  const updated = await prisma.usuario.update({
    where: { id },
    data: {
      nombre,
      email,
      ...(avatar !== undefined ? { avatar } : {}),
    },
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      avatar: true,
      createdAt: true,
    },
  });

  return jsonOk(updated);
}
