import { prisma } from "@repo/db";
import {
  requireAuth,
  requireAdmin,
  requireRateLimit,
  jsonOk,
  parsePagination,
} from "../_helpers";

/**
 * GET /api/v1/usuarios — listado ADMIN-only.
 *
 * Mobile M6 lo usa en pantalla read-only ("Usuarios") para que el ADMIN
 * pueda ver quién tiene acceso al sistema desde el campo. CRUD completo
 * (crear/editar/eliminar) queda en el web — mobile no lo necesita.
 *
 * Nunca devuelve `password`, ni siquiera el hash.
 */
export async function GET(request: Request) {
  const limited = await requireRateLimit(request);
  if (limited) return limited;
  const { session, error } = await requireAuth(request);
  if (error) return error;
  const denied = requireAdmin(session);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parsePagination(searchParams);

  const [data, total] = await Promise.all([
    prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        avatar: true,
        createdAt: true,
      },
      orderBy: { nombre: "asc" },
      skip,
      take: limit,
    }),
    prisma.usuario.count(),
  ]);

  return jsonOk(data, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
}
