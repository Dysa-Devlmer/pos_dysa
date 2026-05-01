/**
 * Unit tests — _helpers.ts (Fase 2B-P0).
 *
 * Cobertura:
 *   - jsonError(message) → backwards compatible {error}, status 400.
 *   - jsonError(message, status, opts) → envelope completo con code/details.
 *   - jsonZodError(zodError) → 422 + code VALIDATION_FAILED + issues estructurado.
 *   - readIdempotencyKey → null/string según header válido.
 *   - withIdempotencyResponse → sin header pasa directo, con header dedupe.
 *
 * Estos tests no tocan Prisma ni Upstash; testan el contrato del helper
 * en aislamiento.
 */

import { describe, test, expect, beforeEach, vi } from "vitest";
import { z } from "zod";

import {
  jsonError,
  jsonZodError,
  readIdempotencyKey,
  withIdempotencyResponse,
} from "../_helpers";
import { __resetIdempotencyMemoryForTests } from "@/lib/idempotency";

beforeEach(() => {
  __resetIdempotencyMemoryForTests();
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

describe("jsonError — envelope estandar", () => {
  test("firma legacy mantiene shape {error}", async () => {
    const res = jsonError("RUT ya registrado", 409);
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body).toEqual({ error: "RUT ya registrado" });
    expect(body).not.toHaveProperty("code");
    expect(body).not.toHaveProperty("details");
  });

  test("firma extendida agrega code y details preservando error", async () => {
    const res = jsonError("Stock insuficiente", 422, {
      code: "BUSINESS_RULE",
      details: { productoId: 5, disponible: 0 },
    });
    const body = await res.json();
    expect(res.status).toBe(422);
    expect(body).toEqual({
      error: "Stock insuficiente",
      code: "BUSINESS_RULE",
      details: { productoId: 5, disponible: 0 },
    });
  });

  test("status default 400 cuando se omite", async () => {
    const res = jsonError("Body inválido");
    expect(res.status).toBe(400);
  });

  test("opts.headers se aplican (Retry-After)", async () => {
    const res = jsonError("Rate limited", 429, {
      code: "RATE_LIMITED",
      headers: { "Retry-After": "60" },
    });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
  });
});

describe("jsonZodError — preserva estructura issues", () => {
  test("retorna 422 + code VALIDATION_FAILED + details.issues estructurado", async () => {
    const schema = z.object({
      cantidad: z.number().int().positive(),
      productoId: z.number().int().positive(),
    });
    const result = schema.safeParse({ cantidad: -1, productoId: 0 });
    expect(result.success).toBe(false);

    if (result.success) throw new Error("expected failure");
    const res = jsonZodError(result.error);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.code).toBe("VALIDATION_FAILED");
    expect(body.details).toBeDefined();
    expect(Array.isArray(body.details.issues)).toBe(true);
    expect(body.details.issues.length).toBeGreaterThanOrEqual(1);
    // Primer issue debe traer path + message + code (no string aplanado).
    const first = body.details.issues[0];
    expect(first).toHaveProperty("path");
    expect(first).toHaveProperty("message");
    expect(first).toHaveProperty("code");
    // message del envelope = primer issue (UX legible).
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  test("status custom override (raro, pero permite p.ej. 400 si caller lo necesita)", async () => {
    const schema = z.object({ x: z.string() });
    const result = schema.safeParse({ x: 1 });
    if (result.success) throw new Error("expected failure");
    const res = jsonZodError(result.error, 400);
    expect(res.status).toBe(400);
  });
});

describe("readIdempotencyKey — validación header", () => {
  function reqWith(key: string | null): Request {
    const headers = new Headers();
    if (key !== null) headers.set("Idempotency-Key", key);
    return new Request("http://localhost/x", { method: "POST", headers });
  }

  test("retorna null cuando el header está ausente", () => {
    expect(readIdempotencyKey(reqWith(null))).toBeNull();
  });

  test("retorna null para header vacío o whitespace", () => {
    expect(readIdempotencyKey(reqWith(""))).toBeNull();
    expect(readIdempotencyKey(reqWith("   "))).toBeNull();
  });

  test("retorna null para chars peligrosos (whitespace interno, símbolos)", () => {
    expect(readIdempotencyKey(reqWith("abc def"))).toBeNull();
    expect(readIdempotencyKey(reqWith("a;drop table"))).toBeNull();
    expect(readIdempotencyKey(reqWith("a/b"))).toBeNull();
  });

  test("acepta nanoid típico (alfanum + guión + underscore)", () => {
    expect(readIdempotencyKey(reqWith("V3xK_-aB7yz9"))).toBe("V3xK_-aB7yz9");
  });

  test("rechaza key > 200 chars", () => {
    expect(readIdempotencyKey(reqWith("a".repeat(201)))).toBeNull();
    expect(readIdempotencyKey(reqWith("a".repeat(200)))).toBe("a".repeat(200));
  });
});

describe("withIdempotencyResponse — wiring helper ↔ store", () => {
  function reqWith(key: string | null): Request {
    const headers = new Headers();
    if (key !== null) headers.set("Idempotency-Key", key);
    return new Request("http://localhost/api/v1/ventas", {
      method: "POST",
      headers,
    });
  }

  test("sin header: handler corre directo y NO setea Idempotent-Replay", async () => {
    const handler = vi.fn().mockResolvedValue({
      status: 200,
      body: { data: { id: 1 } },
    });
    const res = await withIdempotencyResponse(
      reqWith(null),
      "venta:create",
      1,
      handler,
    );
    expect(handler).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(res.headers.get("Idempotent-Replay")).toBeNull();
  });

  test("con header: primer call ejecuta, segundo retorna replay", async () => {
    const handler = vi.fn().mockResolvedValue({
      status: 200,
      body: { data: { id: 42, numeroBoleta: "BOL-42" } },
    });

    const r1 = await withIdempotencyResponse(
      reqWith("nano-1"),
      "venta:create",
      1,
      handler,
    );
    expect(r1.status).toBe(200);
    expect(r1.headers.get("Idempotent-Replay")).toBeNull();
    expect(r1.headers.get("Idempotency-Key")).toBe("nano-1");

    handler.mockClear();
    const r2 = await withIdempotencyResponse(
      reqWith("nano-1"),
      "venta:create",
      1,
      handler,
    );
    expect(handler).not.toHaveBeenCalled();
    expect(r2.status).toBe(200);
    expect(r2.headers.get("Idempotent-Replay")).toBe("true");
    const body = await r2.json();
    expect(body).toEqual({ data: { id: 42, numeroBoleta: "BOL-42" } });
  });
});
