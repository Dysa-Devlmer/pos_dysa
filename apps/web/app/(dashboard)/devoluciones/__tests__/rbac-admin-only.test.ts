/**
 * Patch RBAC Fase 3D.4 — devoluciones ADMIN-only por decisión CEO.
 *
 * Hallazgo H2: el manual web ya declaraba devoluciones ADMIN, pero
 * server-side solo había `requireSession`. Decisión Pierre 2026-05-04:
 * durante este patch, devoluciones quedan ADMIN-only en TODOS los
 * surfaces (web + API REST + mobile). Cuando llegue Fase 3D.5 con
 * MANAGER + permisos granulares, esto se relaja.
 */

import { describe, test, expect, beforeEach } from "vitest";

import { prismaMock, mockSession, resetMocks } from "@/test/setup";
import { crearDevolucion } from "../actions";

beforeEach(() => {
  resetMocks();
});

const VALID = {
  ventaId: 1,
  motivo: "Producto defectuoso",
  items: [{ productoId: 1, cantidadDevolver: 1 }],
};

describe("devoluciones · RBAC patch 3D.4 · denegación CAJERO/VENDEDOR", () => {
  test("CAJERO NO puede crearDevolucion (ADMIN-only por patch)", async () => {
    mockSession({ id: "2", rol: "CAJERO" });
    const res = await crearDevolucion(VALID);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected fail");
    expect(res.error).toMatch(/permiso denegado/i);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  test("VENDEDOR NO puede crearDevolucion", async () => {
    mockSession({ id: "3", rol: "VENDEDOR" });
    const res = await crearDevolucion(VALID);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected fail");
    expect(res.error).toMatch(/permiso denegado/i);
  });
});
