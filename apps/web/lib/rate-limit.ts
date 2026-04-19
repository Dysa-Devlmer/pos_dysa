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
