import { CerrarCajaRequestSchema } from "@repo/api-client";
import {
  requireAuth,
  requireRateLimit,
  jsonOk,
  jsonError,
  jsonZodError,
} from "../../../_helpers";
import { cerrarCaja } from "@/app/(dashboard)/caja/actions";

// PATCH /api/v1/caja/aperturas/[id] — cierra la apertura.
// Body schema (`CerrarCajaRequestSchema`) vive en @repo/api-client (Fase 2B-P1).

export async function PATCH(
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
  const parsed = CerrarCajaRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonZodError(parsed.error);
  }

  const res = await cerrarCaja({
    aperturaId,
    ...parsed.data,
  });
  if (!res.ok) {
    return jsonError(res.error, 422, { code: "BUSINESS_RULE" });
  }
  return jsonOk(res.data);
}
