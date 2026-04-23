import { prisma } from "@repo/db";
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
  const devolucion = await prisma.devolucion.findUnique({
    where: { id: Number(id) },
    include: {
      venta: {
        include: {
          cliente: { select: { nombre: true, rut: true } },
          detalles: true,
        },
      },
      usuario: { select: { nombre: true, email: true } },
      items: {
        include: {
          producto: { select: { id: true, nombre: true, codigoBarras: true } },
        },
      },
    },
  });

  if (!devolucion) return jsonError("Devolución no encontrada", 404);
  return jsonOk(devolucion);
}
