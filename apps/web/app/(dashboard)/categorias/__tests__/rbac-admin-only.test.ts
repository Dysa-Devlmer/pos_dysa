/**
 * Patch RBAC Fase 3D.4 — categorías ADMIN-only.
 *
 * Mismo patrón que productos: CAJERO/VENDEDOR no pueden mutar
 * categorías. Antes había `requireSession` ahora hay `requireAdmin`.
 */

import { describe, test, expect, beforeEach } from "vitest";

import { prismaMock, mockSession, resetMocks } from "@/test/setup";
import {
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
} from "../actions";

beforeEach(() => {
  resetMocks();
});

const VALID = {
  nombre: "Bebidas",
  descripcion: "Bebidas frías y calientes",
  activa: true,
};

describe("categorias · RBAC patch 3D.4 · denegación CAJERO/VENDEDOR", () => {
  test("CAJERO NO puede crearCategoria", async () => {
    mockSession({ id: "2", rol: "CAJERO" });
    const res = await crearCategoria(VALID);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected fail");
    expect(res.error).toMatch(/permiso denegado/i);
    expect(prismaMock.categoria.create).not.toHaveBeenCalled();
  });

  test("CAJERO NO puede actualizarCategoria", async () => {
    mockSession({ id: "2", rol: "CAJERO" });
    const res = await actualizarCategoria(7, VALID);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected fail");
    expect(res.error).toMatch(/permiso denegado/i);
    expect(prismaMock.categoria.update).not.toHaveBeenCalled();
  });

  test("CAJERO NO puede eliminarCategoria", async () => {
    mockSession({ id: "2", rol: "CAJERO" });
    const res = await eliminarCategoria(7);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected fail");
    expect(res.error).toMatch(/permiso denegado/i);
    expect(prismaMock.categoria.delete).not.toHaveBeenCalled();
  });

  test("VENDEDOR NO puede crearCategoria", async () => {
    mockSession({ id: "3", rol: "VENDEDOR" });
    const res = await crearCategoria(VALID);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected fail");
    expect(res.error).toMatch(/permiso denegado/i);
  });
});

describe("categorias · RBAC patch 3D.4 · ADMIN sí puede", () => {
  test("ADMIN puede crearCategoria (happy path)", async () => {
    mockSession({ id: "1", rol: "ADMIN" });
    prismaMock.categoria.findUnique.mockResolvedValue(null);
    prismaMock.categoria.create.mockResolvedValue({ id: 9 } as never);

    const res = await crearCategoria(VALID);
    expect(res.ok).toBe(true);
    expect(prismaMock.categoria.create).toHaveBeenCalledTimes(1);
  });
});
