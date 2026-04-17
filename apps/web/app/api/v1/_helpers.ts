import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { Session } from "next-auth";

export async function requireAuth(): Promise<
  | { session: Session; error?: never }
  | { session?: never; error: NextResponse }
> {
  const session = await auth();
  if (!session?.user) {
    return {
      error: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  }
  return { session };
}

export function requireAdmin(session: Session): NextResponse | null {
  if (session.user.rol !== "ADMIN") {
    return NextResponse.json(
      { error: "Requiere rol ADMIN" },
      { status: 403 }
    );
  }
  return null;
}

export function jsonOk<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json({ data, ...(meta ? { meta } : {}) });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Aplica rate limiting si Upstash está configurado.
 * Retorna una Response 429 si se excede el límite, o null si todo OK.
 */
export async function requireRateLimit(request: Request): Promise<NextResponse | null> {
  if (!process.env.UPSTASH_REDIS_REST_URL) return null; // skip en dev
  const { apiRatelimit, getClientIP } = await import("@/lib/rate-limit");
  const ip = getClientIP(request);
  const { success } = await apiRatelimit.limit(ip);
  if (!success) {
    return NextResponse.json(
      { error: "Rate limit excedido. Máximo 100 requests/minuto." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }
  return null;
}
