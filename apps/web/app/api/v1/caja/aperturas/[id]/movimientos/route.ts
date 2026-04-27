import { z } from "zod";
import { TipoMovimientoCaja } from "@repo/db";
import {
  requireAuth,
  requireRateLimit,
  jsonOk,
  jsonError,
} from "../../../../_helpers";
import { registrarMovimientoCaja } from "@/app/(dashboard)/caja/actions";

// POST /api/v1/caja/aperturas/[id]/movimientos — registra movimiento del turno
const Body = z.object({
  tipo: z.nativeEnum(TipoMovimientoCaja),
  monto: z.number().int(),
  motivo: z.string().min(1).max(255),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = await requireRateLimit(request);
  if (limited) return limited;
  const { error } = await requireAuth(request);
  if (error) return error;

  const { id } = await params;
  const aperturaId = Number(id);
  if (!Number.isInteger(aperturaId) || aperturaId <= 0) {
    return jsonError("ID inválido");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Body JSON inválido");
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues.map((e) => e.message).join(", "));
  }

  const res = await registrarMovimientoCaja({
    aperturaId,
    ...parsed.data,
  });
  if (!res.ok) return jsonError(res.error, 422);
  return jsonOk(res.data);
}
