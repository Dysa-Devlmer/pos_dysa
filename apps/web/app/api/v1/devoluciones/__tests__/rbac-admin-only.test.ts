/**
 * Contract test RBAC — POST /api/v1/devoluciones es ADMIN-only.
 *
 * Patch RBAC Fase 3D.4 (decisión CEO): el endpoint que la app móvil
 * usa para crear devoluciones queda gateado a ADMIN durante este patch.
 * Cuando llegue Fase 3D.5 con MANAGER y permisos granulares, esto se
 * relaja a `requirePermission(Permiso.DEVOLUCIONES_CREAR)`.
 *
 * Impacto temporal mobile documentado en
 * `memory/problems/2026-05-04-rbac-h1-h2-privilege-escalation.md`.
 */

import { describe, test, expect, beforeEach } from "vitest";

import { mockSession, resetMocks } from "@/test/setup";

import { POST } from "../route";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/v1/devoluciones", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  resetMocks();
});

describe("POST /api/v1/devoluciones · RBAC patch 3D.4", () => {
  test("CAJERO no puede crear (403 FORBIDDEN)", async () => {
    mockSession({ id: "2", rol: "CAJERO" });
    const res = await POST(
      jsonRequest({
        ventaId: 1,
        motivo: "Producto defectuoso",
        items: [{ productoId: 1, cantidadDevolver: 1 }],
      }),
    );
    expect(res.status).toBe(403);
  });

  test("VENDEDOR no puede crear (403 FORBIDDEN)", async () => {
    mockSession({ id: "3", rol: "VENDEDOR" });
    const res = await POST(
      jsonRequest({
        ventaId: 1,
        motivo: "Producto defectuoso",
        items: [{ productoId: 1, cantidadDevolver: 1 }],
      }),
    );
    expect(res.status).toBe(403);
  });
});
