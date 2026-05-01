import { AbrirCajaRequestSchema } from "@repo/api-client";
import {
  requireAuth,
  requireRateLimit,
  jsonOk,
  jsonError,
  jsonZodError,
} from "../../_helpers";
import { abrirCaja } from "@/app/(dashboard)/caja/actions";

// POST /api/v1/caja/aperturas — abre caja del usuario autenticado.
// Body schema (`AbrirCajaRequestSchema`) vive en @repo/api-client (Fase 2B-P1).

export async function POST(request: Request) {
  const limited = await requireRateLimit(request);
  if (limited) return limited;
  const { error } = await requireAuth(request);
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Body JSON inválido", 400, { code: "VALIDATION_FAILED" });
  }
  const parsed = AbrirCajaRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonZodError(parsed.error);
  }

  const res = await abrirCaja(parsed.data);
  if (!res.ok) {
    return jsonError(res.error, 422, { code: "BUSINESS_RULE" });
  }
  return jsonOk(res.data);
}
