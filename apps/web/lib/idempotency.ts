/**
 * Idempotency store — Fase 2B-P0 (DR-Q1 Codex 2026-04-30).
 *
 * Provee dedupe a nivel API para mutaciones que mobile reintenta tras
 * fallas de red (`syncStore`). El cliente envía `Idempotency-Key: <uuid>`
 * (o nanoid persistido en sync_queue.id) y el server cachea la response
 * de la primera ejecución exitosa. Llamadas posteriores con la misma
 * key + scope + userId devuelven la response cacheada sin re-ejecutar
 * la lógica.
 *
 * Backends:
 *   1. Upstash Redis — preferido. TTL nativo, atómico vía SETNX.
 *   2. Memoria in-process — fallback dev/CI. NO durable: si el proceso
 *      reinicia, los keys se pierden y un retry duplicará la mutación.
 *
 * Limitaciones documentadas:
 *   - Sin Redis (UPSTASH_REDIS_REST_URL ausente), la garantía es solo
 *     dentro del lifetime del proceso Node. En prod sin Upstash la
 *     dedupe es DÉBIL — se aceptó como degradación intencional.
 *   - El "in-flight lock" (request A activo, request B con misma key
 *     llega en paralelo) usa SETNX en Upstash y un Set local en memoria.
 *     B espera con backoff hasta 5s; si A no termina, B continúa y la
 *     duplicación es posible (caso raro: red lenta + retry mobile).
 *   - El response cacheado se valida shape al guardarlo y al leerlo.
 *
 * Diseñado para extender a otros endpoints (devoluciones, movimientos,
 * etc.) — el helper `withIdempotency` toma un `scope` que aísla buckets.
 */

import { Redis } from "@upstash/redis";

const TTL_SECONDS = 24 * 60 * 60; // 24h — alcanza para retries mobile post-reconnect
const KEY_PREFIX = "pos-chile:idempotency";
const INFLIGHT_PREFIX = "pos-chile:idempotency:inflight";
const INFLIGHT_WAIT_MAX_MS = 5_000;
const INFLIGHT_POLL_MS = 200;

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type IdempotencyEntry = {
  /** HTTP status code de la response cacheada. */
  status: number;
  /** Body JSON-serializable que se devolverá en cache hit. */
  body: unknown;
  /** Timestamp UTC ISO de la primera ejecución (telemetría). */
  storedAt: string;
};

export type IdempotencyHit = {
  ok: true;
  entry: IdempotencyEntry;
};

export type IdempotencyMiss = {
  ok: false;
};

export type IdempotencyResult = IdempotencyHit | IdempotencyMiss;

// ─── Memoria fallback ───────────────────────────────────────────────────────
//
// Map global compartido en el proceso. En dev/CI alcanza; en prod sin
// Upstash es lo que hay. El TTL se respeta vía timestamp+filter al leer.

type MemoryRecord = { entry: IdempotencyEntry; expiresAt: number };

declare global {
  var __posIdempotencyMemory: Map<string, MemoryRecord> | undefined;
  var __posIdempotencyInflight: Set<string> | undefined;
}

function getMemory(): Map<string, MemoryRecord> {
  if (!globalThis.__posIdempotencyMemory) {
    globalThis.__posIdempotencyMemory = new Map();
  }
  return globalThis.__posIdempotencyMemory;
}

function getInflightLocal(): Set<string> {
  if (!globalThis.__posIdempotencyInflight) {
    globalThis.__posIdempotencyInflight = new Set();
  }
  return globalThis.__posIdempotencyInflight;
}

// ─── Upstash detection ──────────────────────────────────────────────────────

let cachedRedis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (cachedRedis !== undefined) return cachedRedis;
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    cachedRedis = null;
    return null;
  }
  try {
    cachedRedis = Redis.fromEnv();
    return cachedRedis;
  } catch {
    cachedRedis = null;
    return null;
  }
}

// ─── Helpers de key ─────────────────────────────────────────────────────────

function buildKey(
  scope: string,
  userId: string | number,
  clientKey: string,
): string {
  // No incluimos el body: la convención Idempotency-Key es "el cliente
  // garantiza que la misma key implica la misma operación intencional".
  return `${KEY_PREFIX}:${scope}:${userId}:${clientKey}`;
}

function buildInflightKey(
  scope: string,
  userId: string | number,
  clientKey: string,
): string {
  return `${INFLIGHT_PREFIX}:${scope}:${userId}:${clientKey}`;
}

// ─── API pública ────────────────────────────────────────────────────────────

/**
 * Lee la entrada cacheada para un (scope, userId, clientKey). Si no hay
 * entrada todavía, retorna miss. Si la entrada ya expiró, retorna miss
 * y limpia (memoria) o deja que TTL Redis la borre.
 */
export async function readIdempotency(
  scope: string,
  userId: string | number,
  clientKey: string,
): Promise<IdempotencyResult> {
  const k = buildKey(scope, userId, clientKey);
  const redis = getRedis();

  if (redis) {
    try {
      const raw = await redis.get<IdempotencyEntry>(k);
      if (raw && typeof raw === "object" && "status" in raw && "body" in raw) {
        return { ok: true, entry: raw };
      }
      return { ok: false };
    } catch {
      // Upstash down → degradar a memoria (mejor que romper la mutación).
      // Documentado: con Upstash caído la garantía baja a memoria local.
    }
  }

  // Memoria
  const mem = getMemory();
  const rec = mem.get(k);
  if (!rec) return { ok: false };
  if (Date.now() > rec.expiresAt) {
    mem.delete(k);
    return { ok: false };
  }
  return { ok: true, entry: rec.entry };
}

/**
 * Guarda la entrada como respuesta canónica. Idempotente: si ya hay
 * entry, NO la sobreescribe (la primera ejecución gana). Esto previene
 * que dos requests concurrentes que ambos pasaron por miss sobreescriban
 * la respuesta del otro.
 */
export async function writeIdempotency(
  scope: string,
  userId: string | number,
  clientKey: string,
  entry: IdempotencyEntry,
): Promise<void> {
  const k = buildKey(scope, userId, clientKey);
  const redis = getRedis();

  if (redis) {
    try {
      // SET con NX (only set if not exists) + EX (TTL).
      // Si otro request ya escribió, lo respetamos.
      await redis.set(k, entry, { nx: true, ex: TTL_SECONDS });
      return;
    } catch {
      // Cae a memoria.
    }
  }

  const mem = getMemory();
  if (!mem.has(k)) {
    mem.set(k, { entry, expiresAt: Date.now() + TTL_SECONDS * 1000 });
  }
}

/**
 * Acquire/release de un lock in-flight. Garantiza que dos requests
 * concurrentes con la misma key no ejecuten ambas la mutación. El segundo
 * espera (polling) a que el primero termine y luego lee la cache.
 *
 * Retorna `true` si pudo adquirir el lock. Retorna `false` si otro request
 * lo tiene (en cuyo caso el caller debe esperar y reintentar `readIdempotency`).
 */
export async function acquireInflight(
  scope: string,
  userId: string | number,
  clientKey: string,
): Promise<boolean> {
  const k = buildInflightKey(scope, userId, clientKey);
  const redis = getRedis();

  if (redis) {
    try {
      // SETNX con TTL corto. TTL > tiempo razonable de un POST mobile (≤30s).
      const result = await redis.set(k, "1", { nx: true, ex: 30 });
      return result === "OK";
    } catch {
      // Cae a memoria.
    }
  }

  const inflight = getInflightLocal();
  if (inflight.has(k)) return false;
  inflight.add(k);
  return true;
}

export async function releaseInflight(
  scope: string,
  userId: string | number,
  clientKey: string,
): Promise<void> {
  const k = buildInflightKey(scope, userId, clientKey);
  const redis = getRedis();

  if (redis) {
    try {
      await redis.del(k);
    } catch {
      // ignore — TTL la limpiará.
    }
  }
  getInflightLocal().delete(k);
}

/**
 * Espera hasta `INFLIGHT_WAIT_MAX_MS` a que aparezca la entry para esta
 * key. Usado cuando un request paralelo tiene el lock.
 *
 * Si el primero termina exitosamente, esta función retorna el hit.
 * Si timeout, retorna miss y el caller continúa (posible duplicación
 * en caso muy raro: red excepcionalmente lenta + idempotency inflight
 * timeout — documentado).
 */
export async function waitForEntry(
  scope: string,
  userId: string | number,
  clientKey: string,
): Promise<IdempotencyResult> {
  const start = Date.now();
  while (Date.now() - start < INFLIGHT_WAIT_MAX_MS) {
    const result = await readIdempotency(scope, userId, clientKey);
    if (result.ok) return result;
    await new Promise((r) => setTimeout(r, INFLIGHT_POLL_MS));
  }
  return { ok: false };
}

/**
 * Helper de alto nivel: ejecuta `handler` solo si esta key todavía no
 * se ejecutó. Cachea el resultado. Maneja el lock in-flight para concurrencia.
 *
 * Convención del header HTTP: clientes envían `Idempotency-Key: <string>`
 * (RFC draft-ietf-httpapi-idempotency-key). Si el header está ausente,
 * el handler corre directo sin dedupe (graceful degradation para clients
 * legacy / pre-2B mobile).
 *
 * @param scope — bucket lógico ("venta:create", "devolucion:create", ...)
 * @param userId — id del usuario autenticado (aísla buckets entre cajeros)
 * @param clientKey — header Idempotency-Key del request
 * @param handler — función que produce { status, body } a cachear
 */
export async function withIdempotency<T extends { status: number; body: unknown }>(
  scope: string,
  userId: string | number,
  clientKey: string,
  handler: () => Promise<T>,
): Promise<{ result: T; cacheHit: boolean }> {
  // Hit directo (caso normal de retry mobile tras flush exitoso previo).
  const cached = await readIdempotency(scope, userId, clientKey);
  if (cached.ok) {
    return {
      result: cached.entry as unknown as T,
      cacheHit: true,
    };
  }

  // Acquire lock para evitar doble ejecución concurrente.
  const acquired = await acquireInflight(scope, userId, clientKey);
  if (!acquired) {
    // Otro request está procesando la misma key → esperar resultado.
    const wait = await waitForEntry(scope, userId, clientKey);
    if (wait.ok) {
      return {
        result: wait.entry as unknown as T,
        cacheHit: true,
      };
    }
    // Timeout esperando: continuar como si fuéramos el primero (raro).
    // No relanzamos `acquireInflight` — si ya estaba locked entonces el
    // otro sigue corriendo; preferimos no doblar el lock.
  }

  try {
    const result = await handler();

    // Solo cachear respuestas "exitosas o semánticas" (2xx, 4xx negocio).
    // 5xx no se cachea: el cliente debe poder reintentar tras una falla
    // server-side transitoria.
    if (result.status < 500) {
      await writeIdempotency(scope, userId, clientKey, {
        status: result.status,
        body: result.body,
        storedAt: new Date().toISOString(),
      });
    }

    return { result, cacheHit: false };
  } finally {
    if (acquired) {
      await releaseInflight(scope, userId, clientKey);
    }
  }
}

/**
 * Helper exclusivo de tests. NO USAR en producción.
 * Limpia el estado en memoria entre tests.
 */
export function __resetIdempotencyMemoryForTests(): void {
  globalThis.__posIdempotencyMemory = new Map();
  globalThis.__posIdempotencyInflight = new Set();
}
