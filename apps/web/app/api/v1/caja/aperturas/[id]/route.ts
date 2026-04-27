import { z } from "zod";
import { requireAuth, requireRateLimit, jsonOk, jsonError } from "../../../_helpers";
import { cerrarCaja } from "@/app/(dashboard)/caja/actions";

// PATCH /api/v1/caja/aperturas/[id] — cierra la apertura
const Body = z.object({
  montoFinalDeclarado: z.number().int().min(0),
  observaciones: z.string().max(500).optional(),
});

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

  const res = await cerrarCaja({
    aperturaId,
    ...parsed.data,
  });
  if (!res.ok) return jsonError(res.error, 422);
  return jsonOk(res.data);
}
