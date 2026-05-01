/**
 * Contract tests — caja aperturas + movimientos (Fase 2B-P1).
 *
 * Verifica que los handlers usan los schemas compartidos
 * `AbrirCajaRequestSchema`, `CerrarCajaRequestSchema`,
 * `RegistrarMovimientoRequestSchema` y que las respuestas siguen
 * el envelope estándar { error, code?, details? }.
 */

import { describe, test, expect, beforeEach, vi } from "vitest";

import { mockSession, resetMocks } from "@/test/setup";

// Mock de las server actions del módulo caja — los handlers REST
// las invocan internamente. Este test cubre el *contrato* del handler
// (validación + mapping a envelope), no la lógica del action.
vi.mock("@/app/(dashboard)/caja/actions", () => ({
  abrirCaja: vi.fn(),
  cerrarCaja: vi.fn(),
  registrarMovimientoCaja: vi.fn(),
  obtenerAperturaActiva: vi.fn(),
}));

import {
  abrirCaja,
  cerrarCaja,
  registrarMovimientoCaja,
} from "@/app/(dashboard)/caja/actions";
import { POST as POST_APERTURAS } from "../aperturas/route";
import { PATCH as PATCH_APERTURA } from "../aperturas/[id]/route";
import { POST as POST_MOVIMIENTOS } from "../aperturas/[id]/movimientos/route";

const abrirMock = abrirCaja as unknown as ReturnType<typeof vi.fn>;
const cerrarMock = cerrarCaja as unknown as ReturnType<typeof vi.fn>;
const movMock = registrarMovimientoCaja as unknown as ReturnType<typeof vi.fn>;

function jsonReq(url: string, body: unknown, method = "POST"): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  resetMocks();
  mockSession({ id: "1", rol: "CAJERO" });
  abrirMock.mockReset();
  cerrarMock.mockReset();
  movMock.mockReset();
});

// ─── POST /api/v1/caja/aperturas ──────────────────────────────────────────

describe("POST /api/v1/caja/aperturas — contract", () => {
  test("body Zod fail (cajaId negativo) → 422 + VALIDATION_FAILED", async () => {
    const res = await POST_APERTURAS(
      jsonReq("http://localhost/api/v1/caja/aperturas", {
        cajaId: -1,
        montoInicial: 10_000,
      }),
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("VALIDATION_FAILED");
  });

  test("body no JSON → 400 + VALIDATION_FAILED", async () => {
    const res = await POST_APERTURAS(
      jsonReq("http://localhost/api/v1/caja/aperturas", "not-json{"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("VALIDATION_FAILED");
  });

  test("happy path → 200 + envelope { data: { id } }", async () => {
    abrirMock.mockResolvedValue({ ok: true, data: { id: 42 } });
    const res = await POST_APERTURAS(
      jsonReq("http://localhost/api/v1/caja/aperturas", {
        cajaId: 1,
        montoInicial: 50_000,
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data?.id).toBe(42);
  });

  test("error de negocio del action → 422 + BUSINESS_RULE", async () => {
    abrirMock.mockResolvedValue({
      ok: false,
      error: "Caja inactiva",
    });
    const res = await POST_APERTURAS(
      jsonReq("http://localhost/api/v1/caja/aperturas", {
        cajaId: 1,
        montoInicial: 0,
      }),
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("BUSINESS_RULE");
    expect(body.error).toMatch(/inactiva/i);
  });
});

// ─── PATCH /api/v1/caja/aperturas/[id] ────────────────────────────────────

describe("PATCH /api/v1/caja/aperturas/[id] — contract", () => {
  test("id no numérico → 400 + VALIDATION_FAILED", async () => {
    const res = await PATCH_APERTURA(
      jsonReq(
        "http://localhost/api/v1/caja/aperturas/abc",
        { montoFinalDeclarado: 50_000 },
        "PATCH",
      ),
      { params: Promise.resolve({ id: "abc" }) },
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("VALIDATION_FAILED");
  });

  test("happy path → 200 + envelope { data }", async () => {
    cerrarMock.mockResolvedValue({
      ok: true,
      data: { id: 7, diferencia: 0 },
    });
    const res = await PATCH_APERTURA(
      jsonReq(
        "http://localhost/api/v1/caja/aperturas/7",
        { montoFinalDeclarado: 80_000, observaciones: "OK" },
        "PATCH",
      ),
      { params: Promise.resolve({ id: "7" }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data?.id).toBe(7);
  });
});

// ─── POST /api/v1/caja/aperturas/[id]/movimientos ─────────────────────────

describe("POST /api/v1/caja/aperturas/[id]/movimientos — contract", () => {
  test("tipo inválido (no en enum) → 422 + VALIDATION_FAILED", async () => {
    const res = await POST_MOVIMIENTOS(
      jsonReq(
        "http://localhost/api/v1/caja/aperturas/7/movimientos",
        { tipo: "DESCONOCIDO", monto: 1000, motivo: "x" },
      ),
      { params: Promise.resolve({ id: "7" }) },
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("VALIDATION_FAILED");
  });

  test("motivo vacío → 422 + VALIDATION_FAILED + path detalle", async () => {
    const res = await POST_MOVIMIENTOS(
      jsonReq(
        "http://localhost/api/v1/caja/aperturas/7/movimientos",
        { tipo: "INGRESO", monto: 1000, motivo: "" },
      ),
      { params: Promise.resolve({ id: "7" }) },
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(
      body.details?.issues?.some(
        (i: { path: (string | number)[] }) => i.path.includes("motivo"),
      ),
    ).toBe(true);
  });

  test("happy path → 200 + envelope { data: { id } }", async () => {
    movMock.mockResolvedValue({ ok: true, data: { id: 99 } });
    const res = await POST_MOVIMIENTOS(
      jsonReq(
        "http://localhost/api/v1/caja/aperturas/7/movimientos",
        { tipo: "INGRESO", monto: 5000, motivo: "Refuerzo" },
      ),
      { params: Promise.resolve({ id: "7" }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data?.id).toBe(99);
  });
});
