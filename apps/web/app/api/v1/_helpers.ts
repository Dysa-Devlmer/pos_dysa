import { NextResponse } from "next/server";
import { decode } from "next-auth/jwt";
import { z } from "zod";
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

/**
 * Códigos de error semánticos consumidos por mobile/web/integraciones para
 * discriminar el tipo de error sin parsear strings. Los valores quedan
 * estables como contrato API; agregar nuevos sólo es backwards compatible.
 *
 * Convención RFC 7807-lite: cada response de error es
 *   `{ error: string, code?: ApiErrorCode, details?: unknown }`
 * `error` siempre presente (legacy + UX). `code` y `details` opcionales.
 */
export type ApiErrorCode =
  | "VALIDATION_FAILED" // body Zod parse falló (422)
  | "BUSINESS_RULE" // regla de negocio (caja cerrada, stock, etc.) (422)
  | "DUPLICATE" // recurso ya existe (409)
  | "NOT_FOUND" // recurso ausente (404)
  | "RATE_LIMITED" // 429
  | "UNAVAILABLE" // 503 (downstream no disponible)
  | "UNAUTHORIZED" // 401
  | "FORBIDDEN" // 403
  | "CONFLICT" // 409 distinto de DUPLICATE (ej. estado conflictivo)
  | "INTERNAL_ERROR"; // 500

export type JsonErrorOptions = {
  code?: ApiErrorCode;
  details?: unknown;
  /** Headers adicionales (Retry-After, Idempotency-Replay, etc.). */
  headers?: HeadersInit;
};

/**
 * Emite un error envelope estándar.
 *
 * Backwards compatible: la firma vieja `jsonError(message, status)` sigue
 * funcionando — `code` y `details` son opcionales. Callsites previos
 * NO necesitan migración inmediata.
 */
export function jsonError(
  message: string,
  status = 400,
  opts?: JsonErrorOptions,
): NextResponse {
  const body: { error: string; code?: ApiErrorCode; details?: unknown } = {
    error: message,
  };
  if (opts?.code) body.code = opts.code;
  if (opts?.details !== undefined) body.details = opts.details;

  const init: ResponseInit = { status };
  if (opts?.headers) init.headers = opts.headers;
  return NextResponse.json(body, init);
}

/**
 * Serializa un `ZodError` a un envelope de error 422 con `code:
 * "VALIDATION_FAILED"` y `details` estructurado preservando `issues[]`
 * de Zod (path + message + code) — el cliente puede mapear errores a
 * campos de form sin parsear strings.
 *
 * Por convención REST: 422 = JSON válido pero falla reglas semánticas.
 * Si el body NO es JSON parseable, usar `jsonError("Body inválido", 400)`
 * directamente (caller lo decide al hacer `request.json()`).
 */
export function jsonZodError(
  zodError: z.ZodError,
  status = 422,
): NextResponse {
  const issues = zodError.issues.map((i) => ({
    path: i.path,
    message: i.message,
    code: i.code,
  }));
  // Mensaje legible por humanos: primer issue como resumen.
  const summary = issues[0]?.message ?? "Validación fallida";
  return jsonError(summary, status, {
    code: "VALIDATION_FAILED",
    details: { issues },
  });
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
  const { apiRatelimit, getClientIP, limitWithTimeout } = await import(
    "@/lib/rate-limit"
  );
  const ip = getClientIP(request);
  const { success, reason } = await limitWithTimeout(
    apiRatelimit,
    ip,
    "api/v1",
  );
  if (!success) {
    // Si fallamos closed por timeout/error de Upstash, devolvemos 503
    // (Service Unavailable) en lugar de 429 — la causa NO es el cliente.
    // Retry-After 5s para no agravar la presión sobre Redis.
    if (reason === "timeout" || reason === "error") {
      return NextResponse.json(
        { error: "Servicio de control de tráfico no disponible. Reintentar." },
        { status: 503, headers: { "Retry-After": "5" } },
      );
    }
    return NextResponse.json(
      { error: "Rate limit excedido. Máximo 100 requests/minuto." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }
  return null;
}

// ─── Idempotency (Fase 2B-P0) ──────────────────────────────────────────────

/**
 * Limites del header Idempotency-Key. Convención RFC draft-ietf-httpapi-
 * idempotency-key: el cliente garantiza que la misma key implica la misma
 * operación intencional. Aceptamos cualquier string hasta 200 chars con
 * caracteres "razonables" (alfanum + guiones + underscores) para evitar
 * keys con whitespace / control chars / inyección.
 */
const IDEMPOTENCY_KEY_REGEX = /^[A-Za-z0-9_\-]{1,200}$/;

export function readIdempotencyKey(request: Request): string | null {
  const raw = request.headers.get("idempotency-key");
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!IDEMPOTENCY_KEY_REGEX.test(trimmed)) return null;
  return trimmed;
}

/**
 * Wrapper que, si el header `Idempotency-Key` está presente, intercepta
 * la ejecución del `handler` para devolver una response cacheada cuando
 * la misma key ya fue procesada. Si el header está ausente, ejecuta el
 * handler directo (sin dedupe) — graceful degradation para clientes
 * legacy.
 *
 * Convención de la response: el handler retorna `{ status, body }`. Esta
 * función envuelve eso en `NextResponse.json(body, { status, headers })`.
 * En cache-hit, agrega header `Idempotent-Replay: true` para telemetría.
 *
 * Sólo cachea respuestas con status < 500 (errors transientes server
 * deben poder reintentarse).
 *
 * Diseñado para extender a otros endpoints; el `scope` aísla los buckets
 * (ventas, devoluciones, etc.).
 */
export async function withIdempotencyResponse(
  request: Request,
  scope: string,
  userId: string | number,
  handler: () => Promise<{ status: number; body: unknown }>,
): Promise<NextResponse> {
  const key = readIdempotencyKey(request);
  if (!key) {
    const r = await handler();
    return NextResponse.json(r.body, { status: r.status });
  }

  const { withIdempotency } = await import("@/lib/idempotency");
  const { result, cacheHit } = await withIdempotency(
    scope,
    userId,
    key,
    handler,
  );

  const headers = new Headers();
  headers.set("Idempotency-Key", key);
  if (cacheHit) headers.set("Idempotent-Replay", "true");

  return NextResponse.json(result.body, {
    status: result.status,
    headers,
  });
}
