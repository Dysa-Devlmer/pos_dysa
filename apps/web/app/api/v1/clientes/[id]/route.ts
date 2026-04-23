import { prisma } from "@repo/db";
import { z } from "zod";
import {
  requireAuth,
  requireRateLimit,
  jsonOk,
  jsonError,
} from "../../_helpers";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const limited = await requireRateLimit(request);
  if (limited) return limited;
  const { error } = await requireAuth(request);
  if (error) return error;

  const { id } = await params;
  const cliente = await prisma.cliente.findUnique({
    where: { id: Number(id) },
    include: {
      ventas: {
        orderBy: { fecha: "desc" },
        take: 10,
        select: {
          id: true,
          numeroBoleta: true,
          fecha: true,
          total: true,
          metodoPago: true,
        },
      },
    },
  });

  if (!cliente) return jsonError("Cliente no encontrado", 404);
  return jsonOk(cliente);
}

const UpdateSchema = z.object({
  rut: z.string().min(3).max(12).optional(),
  nombre: z.string().min(1).max(200).optional(),
  email: z.string().email().optional().or(z.literal("")),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
});

export async function PUT(request: Request, { params }: Params) {
  const limited = await requireRateLimit(request);
  if (limited) return limited;
  const { error } = await requireAuth(request);
  if (error) return error;

  const { id } = await params;

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

  const data = {
    ...parsed.data,
    email: parsed.data.email === "" ? null : parsed.data.email,
  };

  try {
    const cliente = await prisma.cliente.update({
      where: { id: Number(id) },
      data,
    });
    return jsonOk(cliente);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Unique")) return jsonError("RUT ya registrado", 409);
    return jsonError("Cliente no encontrado", 404);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const limited = await requireRateLimit(request);
  if (limited) return limited;
  const { error } = await requireAuth(request);
  if (error) return error;

  const { id } = await params;
  const clienteId = Number(id);

  const ventas = await prisma.venta.count({ where: { clienteId } });
  if (ventas > 0) {
    return jsonError(
      `No se puede eliminar: el cliente tiene ${ventas} venta(s) registradas`,
      409,
    );
  }

  try {
    await prisma.cliente.delete({ where: { id: clienteId } });
    return jsonOk({ deleted: true });
  } catch {
    return jsonError("Cliente no encontrado", 404);
  }
}
