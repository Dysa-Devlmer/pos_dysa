/**
 * Unit tests — mustChangePassword en crearUsuario y actualizarUsuario.
 *
 * Fase 3C.2: la password asignada por ADMIN siempre arranca como
 * temporal (must_change_password = true). Cuando ADMIN edita un usuario
 * existente:
 *   - Si manda password nueva → flag se setea true (force change).
 *   - Si NO manda password → flag se preserva (no se toca).
 */

import { describe, test, expect, beforeEach } from "vitest";

import { prismaMock, mockSession, resetMocks } from "@/test/setup";
import { crearUsuario, actualizarUsuario } from "../actions";

beforeEach(() => {
  resetMocks();
  mockSession({ id: "1", rol: "ADMIN" });
});

describe("crearUsuario — flag mustChangePassword", () => {
  test("crea usuario nuevo con mustChangePassword=true", async () => {
    prismaMock.usuario.findUnique.mockResolvedValue(null);
    prismaMock.usuario.create.mockResolvedValue({} as never);

    const res = await crearUsuario({
      nombre: "Pierre Benites",
      email: "p@example.cl",
      password: "tempPassw0rd",
      rol: "CAJERO",
      activo: true,
    });

    expect(res.ok).toBe(true);
    expect(prismaMock.usuario.create).toHaveBeenCalledTimes(1);
    const args = prismaMock.usuario.create.mock.calls[0]?.[0];
    expect(args?.data).toMatchObject({
      email: "p@example.cl",
      nombre: "Pierre Benites",
      rol: "CAJERO",
      activo: true,
      mustChangePassword: true,
    });
  });
});

describe("actualizarUsuario — flag mustChangePassword", () => {
  test("setea mustChangePassword=true cuando ADMIN cambia la password", async () => {
    prismaMock.usuario.findFirst.mockResolvedValue(null); // no email collision
    prismaMock.usuario.update.mockResolvedValue({} as never);

    await actualizarUsuario(99, {
      nombre: "Pierre",
      email: "p@example.cl",
      rol: "CAJERO",
      activo: true,
      password: "nuevaTemp123",
    });

    const args = prismaMock.usuario.update.mock.calls[0]?.[0];
    expect(args?.where).toEqual({ id: 99 });
    expect(args?.data).toMatchObject({ mustChangePassword: true });
    expect(args?.data).toHaveProperty("password");
  });

  test("NO toca mustChangePassword cuando ADMIN edita SIN password", async () => {
    prismaMock.usuario.findFirst.mockResolvedValue(null);
    prismaMock.usuario.update.mockResolvedValue({} as never);

    await actualizarUsuario(99, {
      nombre: "Pierre",
      email: "p@example.cl",
      rol: "CAJERO",
      activo: true,
      // sin password
    });

    const args = prismaMock.usuario.update.mock.calls[0]?.[0];
    expect(args?.data).not.toHaveProperty("mustChangePassword");
    expect(args?.data).not.toHaveProperty("password");
  });
});
