import { prisma } from "@repo/db";
import { CrearProductoRequestSchema } from "@repo/api-client";
import {
  requireAuth,
  requireAdmin,
  requireRateLimit,
  jsonOk,
  jsonError,
  jsonZodError,
  parsePagination,
} from "../_helpers";

export async function GET(request: Request) {
  const limited = await requireRateLimit(request);
  if (limited) return limited;
  const { error } = await requireAuth(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parsePagination(searchParams);
  const categoriaId = searchParams.get("categoriaId");
  const search = searchParams.get("search");
  // codigoBarras — lookup exacto para scanner mobile (M4). Match por
  // equality contra el @unique del schema; si no existe devuelve data:[]
  // y el cliente decide cómo mostrar "no encontrado".
  const codigoBarras = searchParams.get("codigoBarras");

  const where = {
    activo: true,
    ...(categoriaId ? { categoriaId: Number(categoriaId) } : {}),
    ...(codigoBarras ? { codigoBarras } : {}),
    ...(search
      ? { nombre: { contains: search, mode: "insensitive" as const } }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.producto.findMany({
      where,
      include: { categoria: { select: { id: true, nombre: true } } },
      orderBy: { nombre: "asc" },
      skip,
      take: limit,
    }),
    prisma.producto.count({ where }),
  ]);

  return jsonOk(data, { page, limit, total, totalPages: Math.ceil(total / limit) });
}

// Fase 2B-P1 — schema compartido movido a @repo/api-client. Mismas reglas
// (caps INT4 DV2 audit 2026-04-25) pero ahora mobile/integraciones lo
// consumen directo sin re-declarar.

export async function POST(request: Request) {
  const limited = await requireRateLimit(request);
  if (limited) return limited;
  const { session, error } = await requireAuth(request);
  if (error) return error;
  const denied = requireAdmin(session);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Body JSON inválido", 400, { code: "VALIDATION_FAILED" });
  }

  const parsed = CrearProductoRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonZodError(parsed.error);
  }

  try {
    const producto = await prisma.producto.create({
      data: parsed.data,
      include: { categoria: { select: { id: true, nombre: true } } },
    });
    return jsonOk(producto);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al crear producto";
    if (msg.includes("Unique")) {
      return jsonError("Código de barras ya existe", 409, { code: "DUPLICATE" });
    }
    return jsonError(msg, 500, { code: "INTERNAL_ERROR" });
  }
}
