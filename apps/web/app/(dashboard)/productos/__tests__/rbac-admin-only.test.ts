/**
 * Patch RBAC Fase 3D.4 — productos ADMIN-only.
 *
 * Antes: `requireSession()` solo verificaba sesión presente. CAJERO o
 * VENDEDOR podían ejecutar `crearProducto`/`actualizarProducto`/
 * `eliminarProducto` (privilege escalation lateral, hallazgo H1).
 *
 * Ahora: `requireAdmin()` lanza si rol !== "ADMIN". Las actions están
 * envueltas en try/catch y devuelven `{ ok: false, error: "Permiso
 * denegado..." }` para CAJERO/VENDEDOR.
 *
 * Estos tests cubren la matriz mínima:
 *   - CAJERO no puede mutar (3 actions × 1 input mínimo).
 *   - VENDEDOR no puede mutar.
 *   - ADMIN sí puede.
 */

import { describe, test, expect, beforeEach } from "vitest";

import { prismaMock, mockSession, resetMocks } from "@/test/setup";
import {
  crearProducto,
  actualizarProducto,
  eliminarProducto,
} from "../actions";

beforeEach(() => {
  resetMocks();
});

const VALID_INPUT = {
  nombre: "Coca-Cola 1.5L",
  codigoBarras: "7800001",
  precio: 1990,
  stock: 60,
  categoriaId: 1,
  alertaStock: 5,
  activo: true,
};

const VALID_UPDATE = {
  nombre: "Coca-Cola 2L",
  codigoBarras: "7800001",
  precio: 2490,
  stock: 60,
  categoriaId: 1,
  alertaStock: 5,
  activo: true,
};

describe("productos · RBAC patch 3D.4 · denegación CAJERO/VENDEDOR", () => {
  test("CAJERO NO puede crearProducto", async () => {
    mockSession({ id: "2", rol: "CAJERO" });
    const res = await crearProducto(VALID_INPUT);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected fail");
    expect(res.error).toMatch(/permiso denegado/i);
    expect(prismaMock.producto.create).not.toHaveBeenCalled();
  });

  test("CAJERO NO puede actualizarProducto", async () => {
    mockSession({ id: "2", rol: "CAJERO" });
    const res = await actualizarProducto(99, VALID_UPDATE);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected fail");
    expect(res.error).toMatch(/permiso denegado/i);
    expect(prismaMock.producto.update).not.toHaveBeenCalled();
  });

  test("CAJERO NO puede eliminarProducto", async () => {
    mockSession({ id: "2", rol: "CAJERO" });
    const res = await eliminarProducto(99);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected fail");
    expect(res.error).toMatch(/permiso denegado/i);
    expect(prismaMock.producto.delete).not.toHaveBeenCalled();
  });

  test("VENDEDOR NO puede crearProducto", async () => {
    mockSession({ id: "3", rol: "VENDEDOR" });
    const res = await crearProducto(VALID_INPUT);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected fail");
    expect(res.error).toMatch(/permiso denegado/i);
  });
});

describe("productos · RBAC patch 3D.4 · ADMIN no se ve afectado", () => {
  test("ADMIN puede crearProducto (happy path no rompe)", async () => {
    mockSession({ id: "1", rol: "ADMIN" });
    prismaMock.producto.findUnique.mockResolvedValue(null);
    prismaMock.categoria.findUnique.mockResolvedValue({
      id: 1,
      activa: true,
    } as never);
    prismaMock.producto.create.mockResolvedValue({ id: 99 } as never);

    const res = await crearProducto(VALID_INPUT);
    expect(res.ok).toBe(true);
    expect(prismaMock.producto.create).toHaveBeenCalledTimes(1);
  });
});
