import { z } from "zod";
import { requireAuth, requireRateLimit, jsonOk, jsonError } from "../../_helpers";
import { abrirCaja } from "@/app/(dashboard)/caja/actions";

// POST /api/v1/caja/aperturas — abre caja del usuario autenticado
const Body = z.object({
  cajaId: z.number().int().positive(),
  montoInicial: z.number().int().min(0),
});

export async function POST(request: Request) {
  const limited = await requireRateLimit(request);
  if (limited) return limited;
  const { error } = await requireAuth(request);
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Body JSON inválido");
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      parsed.error.issues.map((e) => e.message).join(", "),
    );
  }

  const res = await abrirCaja(parsed.data);
  if (!res.ok) return jsonError(res.error, 422);
  return jsonOk(res.data);
}
