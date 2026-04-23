import { prisma } from "@repo/db";
import { requireAuth, requireRateLimit, jsonOk, jsonError } from "../../_helpers";

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
