import { prisma } from "@repo/db";
import { requireAuth, requireRateLimit, jsonOk } from "../_helpers";

/**
 * GET /api/v1/categorias — listado completo ordenado por nombre.
 *
 * Sin paginación: el universo de categorías en un POS Chile real rara
 * vez supera las ~50 filas, y el mobile las usa para:
 *   1. Filtro en el listado de productos (selector).
 *   2. Pantalla read-only de M6 ("Categorías").
 * Devolver todo en una sola request es más barato que paginar.
 */
export async function GET(request: Request) {
  const limited = await requireRateLimit(request);
  if (limited) return limited;
  const { error } = await requireAuth(request);
  if (error) return error;

  const data = await prisma.categoria.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { productos: true } } },
  });

  return jsonOk(data);
}
