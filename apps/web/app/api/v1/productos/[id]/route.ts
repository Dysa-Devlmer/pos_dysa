import { prisma } from "@repo/db";
import { z } from "zod";
import { requireAuth, requireAdmin, jsonOk, jsonError } from "../../_helpers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const producto = await prisma.producto.findUnique({
    where: { id: Number(id) },
    include: { categoria: { select: { id: true, nombre: true } } },
  });

  if (!producto) return jsonError("Producto no encontrado", 404);
  return jsonOk(producto);
}

const UpdateSchema = z.object({
  nombre: z.string().min(1).max(200).optional(),
  descripcion: z.string().optional(),
  codigoBarras: z.string().min(1).optional(),
  precio: z.number().int().positive().optional(),
  stock: z.number().int().min(0).optional(),
  categoriaId: z.number().int().positive().optional(),
  activo: z.boolean().optional(),
});

export async function PUT(request: Request, { params }: Params) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const denied = requireAdmin(session);
  if (denied) return denied;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Body JSON inválido");
  }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues.map((e: { message: string }) => e.message).join(", "));
  }

  try {
    const producto = await prisma.producto.update({
      where: { id: Number(id) },
      data: parsed.data,
      include: { categoria: { select: { id: true, nombre: true } } },
    });
    return jsonOk(producto);
  } catch {
    return jsonError("Producto no encontrado", 404);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { session, error } = await requireAuth();
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
    return jsonError("Producto no encontrado", 404);
  }
}
