import { createHash } from "node:crypto";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiter para login: 5 intentos por 15 minutos por IP.
 * Protección contra brute-force.
 */
export const loginRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  analytics: true,
  prefix: "pos-chile:login",
});

/**
 * Rate limiter para API v1: 100 requests por minuto por IP.
 */
export const apiRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  analytics: true,
  prefix: "pos-chile:api",
});

/**
 * Wrapper sobre `ratelimit.limit()` con timeout 500ms y política
 * **fail-closed en producción** / fail-open en development.
 *
 * Por qué: si Upstash está down/lento, el limiter cuelga el request hasta
 * timeout HTTP del runtime (típico 30s). Sin esto, un Upstash 503 se vuelve
 * un DoS interno — la API entera se ralentiza.
 *
 * Política:
 *  - timeout 500ms (Upstash p99 normal es <50ms; 500ms es 10× margen)
 *  - timeout o error → fail-closed en prod (deny: success=false)
 *    porque lo seguro asume "limite excedido" cuando no podemos validar
 *  - en dev → fail-open (permitir) para no bloquear desarrollo offline
 *  - log via console.warn (Sentry capturará el warn si está en breadcrumbs)
 *
 * Mantiene compat con la firma original `{ success, reset }` que esperan
 * los callsites — `reason` es opcional para telemetría.
 */
export async function limitWithTimeout(
  ratelimit: Ratelimit,
  identifier: string,
  context: string,
): Promise<{ success: boolean; reset: number; reason?: "timeout" | "error" }> {
  const TIMEOUT_MS = 500;
  const failClosed = process.env.NODE_ENV === "production";

  try {
    const result = await Promise.race([
      ratelimit.limit(identifier),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("rate-limit timeout")), TIMEOUT_MS),
      ),
    ]);
    return { success: result.success, reset: result.reset };
  } catch (err) {
    const isTimeout =
      err instanceof Error && err.message === "rate-limit timeout";
    const reason: "timeout" | "error" = isTimeout ? "timeout" : "error";
    if (failClosed) {
      // No loguear `identifier` crudo: puede ser email o IP (PII Ley 21.719).
      // Hash truncado a 8 chars permite correlar logs sin exponer la fuente.
      const idHash = createHash("sha256")
        .update(identifier)
        .digest("hex")
        .slice(0, 8);
      console.warn(
        `[rate-limit] ${reason} for ${context} (id_hash=${idHash}) — failing CLOSED`,
      );
    }
    return {
      success: !failClosed,
      reset: Date.now() + 60_000,
      reason,
    };
  }
}

/**
 * Obtiene la IP del cliente considerando proxies (x-forwarded-for, x-real-ip).
 * Acepta tanto Request (API routes) como Headers (Server Actions).
 */
export function getClientIP(source: Request | Headers): string {
  const headers = source instanceof Request ? source.headers : source;
  const forwarded = headers.get("x-forwarded-for");
  const real = headers.get("x-real-ip");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  if (real) return real;
  return "127.0.0.1";
}

/**
 * Indica si Upstash está configurado.
 * Si falta la URL, se omite el rate limiting (dev mode).
 */
export function isRateLimitEnabled(): boolean {
  return !!process.env.UPSTASH_REDIS_REST_URL;
}

/**
 * Emite `console.warn` en cada llamada si estamos en producción
 * SIN Upstash configurado. En dev se mantiene silencioso (por diseño).
 *
 * Úsala justo antes del guard `if (!isRateLimitEnabled()) return null`
 * en los call sites (API helpers, login action, etc.) para que los logs
 * de producción muestren el warning visible en lugar de pasar inadvertido.
 */
export function warnIfDisabledInProd(context: string): void {
  if (process.env.NODE_ENV !== "production") return;
  if (isRateLimitEnabled()) return;
  console.warn(
    `[rate-limit] ⚠️ PRODUCTION running WITHOUT rate limiting (${context}). ` +
    "UPSTASH_REDIS_REST_URL is not defined — brute-force and abuse have NO protection. " +
    "Configure Upstash Redis immediately: https://upstash.com"
  );
}

/**
 * Rate limiter en memoria (fallback sin Upstash).
 * No persiste entre restarts. Solo para dev y prod sin Redis.
 * Límite: 5 intentos por IP en ventana de 15 minutos.
 */
const memStore = new Map<string, { count: number; resetAt: number }>();

export function checkMemoryRateLimit(key: string): {
  success: boolean;
  reset: number;
} {
  const now = Date.now();
  const WINDOW_MS = 15 * 60 * 1000; // 15 min
  const MAX = 5;

  // Prevenir memory leak limitando el tamaño en memoria
  if (memStore.size > 5000) {
    for (const [k, v] of memStore.entries()) {
      if (now > v.resetAt) memStore.delete(k);
    }
    // Si el prune no fue suficiente, vaciamos agresivamente (fallback defense)
    if (memStore.size > 5000) memStore.clear();
  }

  const entry = memStore.get(key);
  if (!entry || now > entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { success: true, reset: now + WINDOW_MS };
  }
  if (entry.count >= MAX) {
    return { success: false, reset: entry.resetAt };
  }
  entry.count++;
  return { success: true, reset: entry.resetAt };
}
