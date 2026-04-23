import { prisma } from "@repo/db";
import { z } from "zod";
import { requireAuth, requireAdmin, requireRateLimit, jsonOk, jsonError, parsePagination } from "../_helpers";

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

const CreateSchema = z.object({
  nombre: z.string().min(1).max(200),
  descripcion: z.string().optional(),
  codigoBarras: z.string().min(1),
  precio: z.number().int().positive(),
  stock: z.number().int().min(0).default(0),
  categoriaId: z.number().int().positive(),
});

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
    return jsonError("Body JSON inválido");
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues.map((e: { message: string }) => e.message).join(", "));
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
      return jsonError("Código de barras ya existe", 409);
    }
    return jsonError(msg, 500);
  }
}
