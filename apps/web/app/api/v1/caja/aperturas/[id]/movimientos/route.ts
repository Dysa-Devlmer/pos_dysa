import { RegistrarMovimientoRequestSchema } from "@repo/api-client";
import {
  requireAuth,
  requireRateLimit,
  jsonOk,
  jsonError,
  jsonZodError,
} from "../../../../_helpers";
import { registrarMovimientoCaja } from "@/app/(dashboard)/caja/actions";

// POST /api/v1/caja/aperturas/[id]/movimientos — registra movimiento del turno.
// Body schema (`RegistrarMovimientoRequestSchema`) vive en @repo/api-client
// (Fase 2B-P1). El enum TipoMovimientoCaja se replica en el shared schema
// como `TipoMovimientoCajaSchema` (mismos valores que el enum Prisma).

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
    return jsonError("ID inválido", 400, { code: "VALIDATION_FAILED" });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Body JSON inválido", 400, { code: "VALIDATION_FAILED" });
  }
  const parsed = RegistrarMovimientoRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonZodError(parsed.error);
  }

  const res = await registrarMovimientoCaja({
    aperturaId,
    ...parsed.data,
  });
  if (!res.ok) {
    return jsonError(res.error, 422, { code: "BUSINESS_RULE" });
  }
  return jsonOk(res.data);
}
