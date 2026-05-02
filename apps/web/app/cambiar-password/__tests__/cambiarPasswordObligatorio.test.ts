/**
 * Unit tests — cambiarPasswordObligatorio (Fase 3C.2).
 *
 * Server Action de la ruta /cambiar-password. Pide la contraseña temporal
 * de nuevo como defense-in-depth, y verifica que la nueva sea distinta.
 */

import { describe, test, expect, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

import {
  prismaMock,
  mockSession,
  redirectMock,
  resetMocks,
} from "@/test/setup";
import { cambiarPasswordObligatorio } from "../actions";

function fd(obj: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.append(k, v);
  return f;
}

beforeEach(() => {
  resetMocks();
  mockSession({ id: "7", rol: "CAJERO" });
  // redirect() throws en producción; en tests lo dejamos como mock
  // que no lanza, así podemos chequear los efectos previos.
  redirectMock.mockImplementation(((..._args: unknown[]) => {}) as never);
});

describe("cambiarPasswordObligatorio", () => {
  test("rechaza si nueva y confirmar no coinciden", async () => {
    const res = await cambiarPasswordObligatorio(undefined, fd({
      actual: "temp123",
      nueva: "abc1234",
      confirmar: "DIFERENTE",
    }));
    expect(res.error).toMatch(/no coinciden/i);
    expect(prismaMock.usuario.update).not.toHaveBeenCalled();
  });

  test("rechaza si nueva tiene menos de 6 chars", async () => {
    const res = await cambiarPasswordObligatorio(undefined, fd({
      actual: "temp123",
      nueva: "abc",
      confirmar: "abc",
    }));
    expect(res.error).toMatch(/6/i);
    expect(prismaMock.usuario.update).not.toHaveBeenCalled();
  });

  test("rechaza si la contraseña temporal es incorrecta", async () => {
    const tempPwd = "temp123";
    const hash = await bcrypt.hash(tempPwd, 12);
    prismaMock.usuario.findUnique.mockResolvedValue({
      password: hash,
      mustChangePassword: true,
    } as never);

    const res = await cambiarPasswordObligatorio(undefined, fd({
      actual: "incorrecta",
      nueva: "nueva-segura-9",
      confirmar: "nueva-segura-9",
    }));

    expect(res.error).toMatch(/temporal es incorrecta/i);
    expect(prismaMock.usuario.update).not.toHaveBeenCalled();
  });

  test("rechaza si nueva es igual a la temporal", async () => {
    const tempPwd = "temp123";
    const hash = await bcrypt.hash(tempPwd, 12);
    prismaMock.usuario.findUnique.mockResolvedValue({
      password: hash,
      mustChangePassword: true,
    } as never);

    const res = await cambiarPasswordObligatorio(undefined, fd({
      actual: tempPwd,
      nueva: tempPwd,
      confirmar: tempPwd,
    }));
    expect(res.error).toMatch(/distinta/i);
    expect(prismaMock.usuario.update).not.toHaveBeenCalled();
  });

  test("happy: hashea, setea mustChangePassword=false y redirige a /", async () => {
    const tempPwd = "temp123";
    const hash = await bcrypt.hash(tempPwd, 12);
    prismaMock.usuario.findUnique.mockResolvedValue({
      password: hash,
      mustChangePassword: true,
    } as never);
    prismaMock.usuario.update.mockResolvedValue({} as never);

    await cambiarPasswordObligatorio(undefined, fd({
      actual: tempPwd,
      nueva: "nueva-segura-9",
      confirmar: "nueva-segura-9",
    }));

    expect(prismaMock.usuario.update).toHaveBeenCalledTimes(1);
    const args = prismaMock.usuario.update.mock.calls[0]?.[0];
    expect(args?.where).toEqual({ id: 7 });
    expect(args?.data).toMatchObject({ mustChangePassword: false });
    expect(args?.data).toHaveProperty("password");

    expect(redirectMock).toHaveBeenCalledWith("/");
  });

  test("redirige a /login si no hay sesión", async () => {
    mockSession(null);
    // En runtime real, next/navigation `redirect()` THROWS un error con
    // `digest === "NEXT_REDIRECT"` para abortar el render. El mock
    // default no throwea, por lo que el resto del action seguiría
    // ejecutándose y crashearía leyendo `session.user`. Replicamos el
    // comportamiento para este test.
    redirectMock.mockImplementation(((path: string) => {
      const err = new Error(`NEXT_REDIRECT;${path}`);
      (err as unknown as { digest: string }).digest = `NEXT_REDIRECT;${path}`;
      throw err;
    }) as never);

    await expect(
      cambiarPasswordObligatorio(undefined, fd({
        actual: "temp123",
        nueva: "nueva-segura-9",
        confirmar: "nueva-segura-9",
      })),
    ).rejects.toThrow(/NEXT_REDIRECT/);

    expect(redirectMock).toHaveBeenCalledWith("/login");
    expect(prismaMock.usuario.update).not.toHaveBeenCalled();
  });
});
