import { requireAuth, requireRateLimit, jsonOk } from "../../../_helpers";
import { obtenerAperturaActiva } from "@/app/(dashboard)/caja/actions";

// GET /api/v1/caja/aperturas/activa — devuelve la apertura abierta del usuario JWT
export async function GET(request: Request) {
  const limited = await requireRateLimit(request);
  if (limited) return limited;
  const { session, error } = await requireAuth(request);
  if (error) return error;

  const usuarioId = Number(session.user.id);
  const apertura = await obtenerAperturaActiva(usuarioId);
  return jsonOk(apertura);
}
