import { prisma } from "@repo/db";
import { ActualizarProductoRequestSchema } from "@repo/api-client";
import {
  requireAuth,
  requireAdmin,
  requireRateLimit,
  jsonOk,
  jsonError,
  jsonZodError,
} from "../../_helpers";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const limited = await requireRateLimit(request);
  if (limited) return limited;
  const { error } = await requireAuth(request);
  if (error) return error;

  const { id } = await params;
  const producto = await prisma.producto.findUnique({
    where: { id: Number(id) },
    include: { categoria: { select: { id: true, nombre: true } } },
  });

  if (!producto) return jsonError("Producto no encontrado", 404);
  return jsonOk(producto);
}

// Fase 2B-P1 — schema compartido en @repo/api-client (mismas reglas).

export async function PUT(request: Request, { params }: Params) {
  const limited = await requireRateLimit(request);
  if (limited) return limited;
  const { session, error } = await requireAuth(request);
  if (error) return error;
  const denied = requireAdmin(session);
  if (denied) return denied;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Body JSON inválido", 400, { code: "VALIDATION_FAILED" });
  }

  const parsed = ActualizarProductoRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonZodError(parsed.error);
  }

  try {
    const producto = await prisma.producto.update({
      where: { id: Number(id) },
      data: parsed.data,
      include: { categoria: { select: { id: true, nombre: true } } },
    });
    return jsonOk(producto);
  } catch {
    return jsonError("Producto no encontrado", 404, { code: "NOT_FOUND" });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const limited = await requireRateLimit(request);
  if (limited) return limited;
  const { session, error } = await requireAuth(request);
  if (error) return error;
  const denied = requireAdmin(session);
  if (denied) return denied;

  const { id } = await params;

  try {
    await prisma.producto.update({
      where: { id: Number(id) },
      data: { activo: false },
    });
    return jsonOk({ deleted: true });
  } catch {
    return jsonError("Producto no encontrado", 404, { code: "NOT_FOUND" });
  }
}
