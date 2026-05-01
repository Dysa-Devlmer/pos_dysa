/**
 * Unit tests — idempotency store (Fase 2B-P0).
 *
 * Verifica el comportamiento del fallback en memoria (sin Upstash). Los
 * casos cubiertos:
 *
 *   1. miss → handler se ejecuta, response se cachea.
 *   2. hit → handler NO se ejecuta, response cacheada se devuelve.
 *   3. distintos scopes/userIds NO comparten bucket.
 *   4. status 5xx NO se cachea (para permitir retry).
 *   5. status 4xx semántico SÍ se cachea (errors de negocio son
 *      determinísticos por la misma key).
 *   6. dos calls concurrentes con misma key serializan vía in-flight lock.
 *
 * Estos tests NO tocan Upstash: garantizan el contrato del store en el
 * peor escenario (CI / dev sin Redis).
 */

import { describe, test, expect, beforeEach, vi } from "vitest";

import {
  withIdempotency,
  __resetIdempotencyMemoryForTests,
} from "@/lib/idempotency";

beforeEach(() => {
  __resetIdempotencyMemoryForTests();
  // Asegurar que NO hay Upstash configurado en este test environment.
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

describe("withIdempotency — fallback memoria", () => {
  test("miss: handler se ejecuta y response queda cacheada", async () => {
    const handler = vi.fn().mockResolvedValue({
      status: 200,
      body: { data: { id: 1, numeroBoleta: "BOL-1" } },
    });

    const r1 = await withIdempotency("venta:create", 42, "key-A", handler);
    expect(r1.cacheHit).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(r1.result.status).toBe(200);
  });

  test("hit: misma key reusa response sin re-ejecutar handler", async () => {
    const handler = vi.fn().mockResolvedValue({
      status: 200,
      body: { data: { id: 99, numeroBoleta: "BOL-99" } },
    });

    await withIdempotency("venta:create", 7, "key-B", handler);
    handler.mockClear();

    const r2 = await withIdempotency("venta:create", 7, "key-B", handler);
    expect(r2.cacheHit).toBe(true);
    expect(handler).not.toHaveBeenCalled();
    expect(r2.result.body).toEqual({
      data: { id: 99, numeroBoleta: "BOL-99" },
    });
  });

  test("scopes distintos NO comparten bucket", async () => {
    const h1 = vi.fn().mockResolvedValue({ status: 200, body: { x: 1 } });
    const h2 = vi.fn().mockResolvedValue({ status: 200, body: { x: 2 } });

    await withIdempotency("venta:create", 1, "shared-key", h1);
    const r2 = await withIdempotency(
      "devolucion:create",
      1,
      "shared-key",
      h2,
    );

    expect(r2.cacheHit).toBe(false);
    expect(h2).toHaveBeenCalledTimes(1);
    expect(r2.result.body).toEqual({ x: 2 });
  });

  test("usuarios distintos NO comparten bucket (aislamiento por cajero)", async () => {
    const h1 = vi.fn().mockResolvedValue({ status: 200, body: { user: 1 } });
    const h2 = vi.fn().mockResolvedValue({ status: 200, body: { user: 2 } });

    await withIdempotency("venta:create", 1, "same-key", h1);
    const r2 = await withIdempotency("venta:create", 2, "same-key", h2);

    expect(r2.cacheHit).toBe(false);
    expect(r2.result.body).toEqual({ user: 2 });
  });

  test("status 5xx NO se cachea (permite retry)", async () => {
    const handler = vi.fn().mockResolvedValue({
      status: 500,
      body: { error: "Internal" },
    });

    await withIdempotency("venta:create", 1, "key-5xx", handler);
    handler.mockClear();

    const r2 = await withIdempotency("venta:create", 1, "key-5xx", handler);
    expect(r2.cacheHit).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test("status 422 (BUSINESS_RULE) SÍ se cachea — error determinístico", async () => {
    const handler = vi.fn().mockResolvedValue({
      status: 422,
      body: { error: "Stock insuficiente", code: "BUSINESS_RULE" },
    });

    await withIdempotency("venta:create", 1, "key-422", handler);
    handler.mockClear();

    const r2 = await withIdempotency("venta:create", 1, "key-422", handler);
    expect(r2.cacheHit).toBe(true);
    expect(handler).not.toHaveBeenCalled();
    expect(r2.result.status).toBe(422);
  });

  test("dos calls concurrentes con misma key serializan via in-flight lock", async () => {
    let resolveFirst: (v: { status: number; body: unknown }) => void;
    const firstStarted = new Promise<void>((res) => {
      resolveFirst = (v) => {
        // notificar que el handler arrancó antes de resolver
        res();
        setTimeout(() => firstFulfill(v), 50);
      };
    });
    let firstFulfill: (v: { status: number; body: unknown }) => void = () => {};
    const firstResolution = new Promise<{ status: number; body: unknown }>(
      (res) => {
        firstFulfill = res;
      },
    );

    const handler = vi.fn().mockImplementation(async () => {
      // Simula latencia red. Solo el primero pasa por aquí.
      resolveFirst({ status: 200, body: { id: "first" } });
      return await firstResolution;
    });

    const p1 = withIdempotency("venta:create", 9, "race-key", handler);
    // Asegurar que p1 ya tomó el lock antes de lanzar p2.
    await firstStarted;
    const p2 = withIdempotency("venta:create", 9, "race-key", handler);

    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1.cacheHit).toBe(false);
    // El segundo debería leer la cache después de que el lock se libera.
    expect(r2.cacheHit).toBe(true);
    expect(r2.result.body).toEqual({ id: "first" });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
