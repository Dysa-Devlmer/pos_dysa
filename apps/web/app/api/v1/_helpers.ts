import { NextResponse } from "next/server";
import { decode } from "next-auth/jwt";
import { auth } from "@/auth";
import type { Session } from "next-auth";

// Mismo salt que emite /api/v1/auth/login (y loginAction Server Action).
// Scheme-dependent porque __Secure- requiere HTTPS; en dev HTTP local
// se usa sin prefix para que el cookie se acepte.
const USE_SECURE_COOKIES = (process.env.NEXTAUTH_URL ?? "").startsWith(
  "https://",
);
const SESSION_COOKIE_SALT = USE_SECURE_COOKIES
  ? "__Secure-authjs.session-token"
  : "authjs.session-token";

/**
 * Intenta construir una Session desde `Authorization: Bearer <jwt>`.
 * Devuelve null si:
 * - No hay header Authorization
 * - No es scheme Bearer
 * - El JWT no decodifica (firma inválida / expirado / salt mal)
 *
 * El formato del token es el mismo que genera /api/v1/auth/login:
 * JWE encrypted con `dir` + A256CBC-HS512, compatible con next-auth v5.
 */
async function sessionFromBearer(
  request: Request,
): Promise<Session | null> {
  const header = request.headers.get("authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) return null;

  const token = header.slice(7).trim();
  if (!token) return null;

  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) return null;

  try {
    const payload = await decode({
      token,
      secret,
      salt: SESSION_COOKIE_SALT,
    });
    if (!payload) return null;

    // El payload del JWT tiene: sub, id, email, name, rol, iat, exp, jti.
    // Construimos una Session con el shape que espera el resto del código
    // (mismo que devuelve auth() de NextAuth con los callbacks configurados).
    const sub = payload.sub ?? (payload.id as string | undefined);
    const email = payload.email as string | undefined;
    const name = payload.name as string | undefined;
    const rol = payload.rol as Session["user"]["rol"] | undefined;
    const expEpoch =
      typeof payload.exp === "number" ? payload.exp : undefined;

    if (!sub || !email || !rol) return null;

    return {
      user: {
        id: sub,
        email,
        name: name ?? null,
        rol,
      },
      expires: expEpoch
        ? new Date(expEpoch * 1000).toISOString()
        : new Date(Date.now() + 3600 * 1000).toISOString(),
    } as Session;
  } catch {
    return null;
  }
}

/**
 * Autenticación para rutas /api/v1/*.
 *
 * Acepta DOS schemes de auth en orden de preferencia:
 * 1. `Authorization: Bearer <jwt>` — mobile (M2) y clientes externos API
 * 2. Cookie de sesión NextAuth — web SSR/client
 *
 * Backwards compatible: si no se pasa `request`, cae directo a cookies
 * (flow original). Los callers nuevos deberían siempre pasar `request`
 * para habilitar el path Bearer.
 */
export async function requireAuth(
  request?: Request,
): Promise<
  | { session: Session; error?: never }
  | { session?: never; error: NextResponse }
> {
  // 1. Intentar Bearer primero si tenemos request
  if (request) {
    const bearerSession = await sessionFromBearer(request);
    if (bearerSession) return { session: bearerSession };
  }

  // 2. Fallback a cookie session (web)
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
      { status: 403 },
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
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit")) || 20),
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Aplica rate limiting si Upstash está configurado.
 * Retorna una Response 429 si se excede el límite, o null si todo OK.
 */
export async function requireRateLimit(
  request: Request,
): Promise<NextResponse | null> {
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    const { warnIfDisabledInProd } = await import("@/lib/rate-limit");
    warnIfDisabledInProd("api/v1 request");
    return null; // skip en dev; en prod ya emitió warning visible
  }
  const { apiRatelimit, getClientIP } = await import("@/lib/rate-limit");
  const ip = getClientIP(request);
  const { success } = await apiRatelimit.limit(ip);
  if (!success) {
    return NextResponse.json(
      { error: "Rate limit excedido. Máximo 100 requests/minuto." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }
  return null;
}
