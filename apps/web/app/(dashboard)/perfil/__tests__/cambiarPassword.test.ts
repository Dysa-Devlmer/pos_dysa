/**
 * Unit tests — cambiarPassword (perfil) limpia mustChangePassword.
 *
 * Fase 3C.2: el cambio voluntario desde el perfil propio también limpia
 * el flag (defense-in-depth + UX simétrica con /cambiar-password).
 */

import { describe, test, expect, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

import { prismaMock, mockSession, resetMocks } from "@/test/setup";
import { cambiarPassword } from "../actions";

beforeEach(() => {
  resetMocks();
  mockSession({ id: "5", rol: "CAJERO" });
});

describe("cambiarPassword (perfil) — flag mustChangePassword", () => {
  test("setea mustChangePassword=false al cambiar con éxito", async () => {
    const hashTemp = await bcrypt.hash("temp123", 12);
    prismaMock.usuario.findUnique.mockResolvedValue({
      password: hashTemp,
    } as never);
    prismaMock.usuario.update.mockResolvedValue({} as never);

    const res = await cambiarPassword({
      actual: "temp123",
      nueva: "nueva-real-456",
      confirmar: "nueva-real-456",
    });

    expect(res.ok).toBe(true);
    expect(prismaMock.usuario.update).toHaveBeenCalledTimes(1);
    const args = prismaMock.usuario.update.mock.calls[0]?.[0];
    expect(args?.where).toEqual({ id: 5 });
    expect(args?.data).toMatchObject({ mustChangePassword: false });
    expect(args?.data).toHaveProperty("password");
  });

  test("NO toca el flag si la actual es incorrecta", async () => {
    const hashTemp = await bcrypt.hash("temp123", 12);
    prismaMock.usuario.findUnique.mockResolvedValue({
      password: hashTemp,
    } as never);

    const res = await cambiarPassword({
      actual: "MAL",
      nueva: "nueva-real-456",
      confirmar: "nueva-real-456",
    });

    expect(res.ok).toBe(false);
    expect(prismaMock.usuario.update).not.toHaveBeenCalled();
  });

  test("NO toca el flag si nueva === actual", async () => {
    const hashTemp = await bcrypt.hash("temp123", 12);
    prismaMock.usuario.findUnique.mockResolvedValue({
      password: hashTemp,
    } as never);

    const res = await cambiarPassword({
      actual: "temp123",
      nueva: "temp123",
      confirmar: "temp123",
    });

    expect(res.ok).toBe(false);
    expect(prismaMock.usuario.update).not.toHaveBeenCalled();
  });
});
