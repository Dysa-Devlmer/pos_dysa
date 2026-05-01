/**
 * Contract tests — productos POST/PUT (Fase 2B-P1).
 *
 * Verifica que los handlers usan los schemas compartidos
 * `CrearProductoRequestSchema` / `ActualizarProductoRequestSchema` y
 * que las respuestas siguen el envelope estándar:
 *   - 400 + VALIDATION_FAILED para body no JSON.
 *   - 422 + VALIDATION_FAILED + details.issues para Zod fail.
 *   - 409 + DUPLICATE para código de barras existente.
 *   - 404 + NOT_FOUND para id inexistente en PUT.
 *   - 200 envelope { data: producto } en happy path.
 */

import { describe, test, expect, beforeEach } from "vitest";

import { prismaMock, mockSession, resetMocks } from "@/test/setup";

import { POST as POST_LIST } from "../route";
import { PUT } from "../[id]/route";

function jsonRequest(
  body: unknown,
  url = "http://localhost/api/v1/productos",
): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function putRequest(body: unknown, id = "5"): Request {
  return new Request(`http://localhost/api/v1/productos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const productoOK = {
  id: 5,
  nombre: "Café 500g",
  descripcion: null,
  codigoBarras: "7800001",
  precio: 5_000,
  stock: 50,
  categoriaId: 1,
  activo: true,
  ventas: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  categoria: { id: 1, nombre: "Almacén" },
};

beforeEach(() => {
  resetMocks();
  mockSession({ id: "1", rol: "ADMIN" });
});

// ─── POST /api/v1/productos ──────────────────────────────────────────────

describe("POST /api/v1/productos — contract", () => {
  test("body no JSON → 400 + VALIDATION_FAILED", async () => {
    const res = await POST_LIST(jsonRequest("not-json{"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("VALIDATION_FAILED");
  });

  test("body Zod fail (precio negativo) → 422 + VALIDATION_FAILED + issues", async () => {
    const res = await POST_LIST(
      jsonRequest({
        nombre: "X",
        codigoBarras: "C1",
        precio: -100,
        categoriaId: 1,
      }),
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("VALIDATION_FAILED");
    expect(Array.isArray(body.details?.issues)).toBe(true);
    expect(
      body.details.issues.some(
        (i: { path: (string | number)[] }) => i.path.includes("precio"),
      ),
    ).toBe(true);
  });

  test("body Zod fail (campo requerido faltante) → 422", async () => {
    const res = await POST_LIST(jsonRequest({ nombre: "X" })); // sin codigoBarras/precio/categoriaId
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("VALIDATION_FAILED");
  });

  test("código de barras duplicado → 409 + DUPLICATE", async () => {
    prismaMock.producto.create.mockRejectedValue(
      new Error(
        "Unique constraint failed on the fields: (`codigoBarras`)",
      ),
    );
    const res = await POST_LIST(
      jsonRequest({
        nombre: "Café 500g",
        codigoBarras: "DUP-1",
        precio: 5000,
        categoriaId: 1,
      }),
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("DUPLICATE");
  });

  test("happy path → 200 + envelope { data: producto }", async () => {
    prismaMock.producto.create.mockResolvedValue(productoOK as never);
    const res = await POST_LIST(
      jsonRequest({
        nombre: "Café 500g",
        codigoBarras: "7800001",
        precio: 5000,
        categoriaId: 1,
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data?.id).toBe(5);
  });

  test("CAJERO no puede crear (403 FORBIDDEN)", async () => {
    mockSession({ id: "2", rol: "CAJERO" });
    const res = await POST_LIST(
      jsonRequest({
        nombre: "Café",
        codigoBarras: "C1",
        precio: 5000,
        categoriaId: 1,
      }),
    );
    expect(res.status).toBe(403);
  });
});

// ─── PUT /api/v1/productos/[id] ──────────────────────────────────────────

describe("PUT /api/v1/productos/[id] — contract", () => {
  test("body Zod fail → 422 + details.issues", async () => {
    const res = await PUT(
      putRequest({ precio: 0 }), // precio debe ser positive
      { params: Promise.resolve({ id: "5" }) },
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("VALIDATION_FAILED");
  });

  test("happy path: campo único permitido (parcial) → 200", async () => {
    prismaMock.producto.update.mockResolvedValue({
      ...productoOK,
      stock: 100,
    } as never);

    const res = await PUT(
      putRequest({ stock: 100 }),
      { params: Promise.resolve({ id: "5" }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data?.stock).toBe(100);
  });

  test("id inexistente (Prisma throws) → 404 + NOT_FOUND", async () => {
    prismaMock.producto.update.mockRejectedValue(
      new Error("Record to update not found"),
    );
    const res = await PUT(
      putRequest({ stock: 1 }),
      { params: Promise.resolve({ id: "999" }) },
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe("NOT_FOUND");
  });
});
