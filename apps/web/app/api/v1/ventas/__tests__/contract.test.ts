/**
 * Contract tests — POST /api/v1/ventas (Fase 2B-P0).
 *
 * Verifica:
 *   1. Body NO JSON → 400 + code VALIDATION_FAILED.
 *   2. Body Zod fail → 422 + code VALIDATION_FAILED + details.issues.
 *   3. Caja cerrada → 422 + code BUSINESS_RULE.
 *   4. Stock insuficiente → 409 + code BUSINESS_RULE.
 *   5. Happy path: venta creada, response envelope { data }.
 *   6. Idempotency miss (sin header): handler ejecuta normal.
 *   7. Idempotency hit: misma key NO duplica venta — response cacheada
 *      con header Idempotent-Replay: true.
 *
 * Estos tests cubren el path REST handler completo, incluyendo helpers
 * (jsonZodError, withIdempotencyResponse) y el wrapper de transacciones.
 */

import { describe, test, expect, beforeEach } from "vitest";

import { prismaMock, mockSession, resetMocks } from "@/test/setup";
import { __resetIdempotencyMemoryForTests } from "@/lib/idempotency";

import { POST } from "../route";

// Apertura caja "abierta" estándar para que los happy paths no fallen
// con BUSINESS_RULE caja cerrada.
const aperturaActiva = { id: 7 };

// Productos default que pasan validación de stock para los happy paths.
const productoActivo = {
  id: 1,
  nombre: "Café 500g",
  precio: 5_000,
  stock: 100,
  activo: true,
};

function jsonRequest(body: unknown, headers?: Record<string, string>): Request {
  return new Request("http://localhost/api/v1/ventas", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(headers ?? {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  resetMocks();
  __resetIdempotencyMemoryForTests();
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  mockSession({ id: "1", rol: "ADMIN" });

  prismaMock.aperturaCaja.findFirst.mockResolvedValue(aperturaActiva as never);
  prismaMock.producto.findMany.mockResolvedValue([productoActivo] as never);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismaMock.$transaction.mockImplementation(async (cb: any) =>
    cb(prismaMock),
  );
});

// ─── Validation paths ─────────────────────────────────────────────────────

describe("POST /api/v1/ventas — validation envelope", () => {
  test("body NO JSON → 400 + code VALIDATION_FAILED", async () => {
    const res = await POST(jsonRequest("not-json{"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/JSON/i);
    expect(body.code).toBe("VALIDATION_FAILED");
  });

  test("Zod fail (items vacío) → 422 + details.issues", async () => {
    const res = await POST(jsonRequest({ items: [] }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("VALIDATION_FAILED");
    expect(Array.isArray(body.details?.issues)).toBe(true);
    expect(body.details.issues.length).toBeGreaterThanOrEqual(1);
  });

  test("Zod fail (cantidad negativa) preserva path en issues", async () => {
    const res = await POST(
      jsonRequest({ items: [{ productoId: 1, cantidad: -3 }] }),
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.details.issues.some(
      (i: { path: (string | number)[] }) => i.path.includes("cantidad"),
    )).toBe(true);
  });
});

// ─── Business-rule paths ──────────────────────────────────────────────────

describe("POST /api/v1/ventas — business rules", () => {
  test("caja cerrada → 422 + code BUSINESS_RULE", async () => {
    prismaMock.aperturaCaja.findFirst.mockResolvedValue(null);

    const res = await POST(
      jsonRequest({ items: [{ productoId: 1, cantidad: 1 }] }),
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("BUSINESS_RULE");
    expect(body.error).toMatch(/abrir caja/i);
  });

  test("stock insuficiente → 409 + code BUSINESS_RULE", async () => {
    prismaMock.producto.findMany.mockResolvedValue([
      { ...productoActivo, stock: 0 },
    ] as never);

    const res = await POST(
      jsonRequest({ items: [{ productoId: 1, cantidad: 5 }] }),
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("BUSINESS_RULE");
    expect(body.error).toMatch(/stock/i);
  });

  test("producto no encontrado → 409 + code BUSINESS_RULE", async () => {
    prismaMock.producto.findMany.mockResolvedValue([] as never);

    const res = await POST(
      jsonRequest({ items: [{ productoId: 999, cantidad: 1 }] }),
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("BUSINESS_RULE");
    expect(body.error).toMatch(/no encontrado|inactivo/i);
  });
});

// ─── Idempotency paths ────────────────────────────────────────────────────

describe("POST /api/v1/ventas — idempotency", () => {
  test("sin Idempotency-Key: handler corre normal, sin header replay", async () => {
    const ventaCreada = {
      id: 100,
      numeroBoleta: "BOL-100",
      total: 5950,
      detalles: [],
      pagos: [],
    };
    prismaMock.venta.create.mockResolvedValue(ventaCreada as never);
    prismaMock.producto.update.mockResolvedValue({} as never);

    const res = await POST(
      jsonRequest({ items: [{ productoId: 1, cantidad: 1 }] }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Idempotent-Replay")).toBeNull();
    const body = await res.json();
    expect(body.data.id).toBe(100);
  });

  test("idempotency hit: misma key NO duplica la venta", async () => {
    const ventaCreada = {
      id: 200,
      numeroBoleta: "BOL-200",
      total: 5950,
      detalles: [],
      pagos: [],
    };
    prismaMock.venta.create.mockResolvedValue(ventaCreada as never);
    prismaMock.producto.update.mockResolvedValue({} as never);

    const KEY = "nanoid-mobile-V42";

    // Primer call — handler corre, venta.create se invoca.
    const r1 = await POST(
      jsonRequest(
        { items: [{ productoId: 1, cantidad: 1 }] },
        { "Idempotency-Key": KEY },
      ),
    );
    expect(r1.status).toBe(200);
    expect(r1.headers.get("Idempotent-Replay")).toBeNull();
    expect(prismaMock.venta.create).toHaveBeenCalledTimes(1);

    // Segundo call con la misma key — handler NO debe correr.
    prismaMock.venta.create.mockClear();
    const r2 = await POST(
      jsonRequest(
        { items: [{ productoId: 1, cantidad: 1 }] },
        { "Idempotency-Key": KEY },
      ),
    );
    expect(r2.status).toBe(200);
    expect(r2.headers.get("Idempotent-Replay")).toBe("true");
    expect(prismaMock.venta.create).not.toHaveBeenCalled();
    const body = await r2.json();
    expect(body.data.id).toBe(200); // misma respuesta cacheada
  });

  test("idempotency con error de negocio (BUSINESS_RULE 422) también se cachea", async () => {
    prismaMock.aperturaCaja.findFirst.mockResolvedValue(null);

    const KEY = "nanoid-V99";
    const r1 = await POST(
      jsonRequest(
        { items: [{ productoId: 1, cantidad: 1 }] },
        { "Idempotency-Key": KEY },
      ),
    );
    expect(r1.status).toBe(422);

    // Cambiar el mock para que la "segunda corrida" tendría éxito; pero
    // como el error 422 ya se cacheó, el segundo retry NO debe re-ejecutar
    // ni darnos 200 — devuelve el error original.
    prismaMock.aperturaCaja.findFirst.mockResolvedValue(aperturaActiva as never);
    prismaMock.aperturaCaja.findFirst.mockClear();

    const r2 = await POST(
      jsonRequest(
        { items: [{ productoId: 1, cantidad: 1 }] },
        { "Idempotency-Key": KEY },
      ),
    );
    expect(r2.status).toBe(422);
    expect(r2.headers.get("Idempotent-Replay")).toBe("true");
    expect(prismaMock.aperturaCaja.findFirst).not.toHaveBeenCalled();
  });

  test("idempotency keys distintas NO comparten cache", async () => {
    const ventaCreada = {
      id: 1,
      numeroBoleta: "BOL-1",
      total: 5950,
      detalles: [],
      pagos: [],
    };
    prismaMock.venta.create.mockResolvedValue(ventaCreada as never);
    prismaMock.producto.update.mockResolvedValue({} as never);

    await POST(
      jsonRequest(
        { items: [{ productoId: 1, cantidad: 1 }] },
        { "Idempotency-Key": "key-A" },
      ),
    );
    prismaMock.venta.create.mockClear();

    await POST(
      jsonRequest(
        { items: [{ productoId: 1, cantidad: 1 }] },
        { "Idempotency-Key": "key-B" },
      ),
    );
    expect(prismaMock.venta.create).toHaveBeenCalledTimes(1);
  });
});
