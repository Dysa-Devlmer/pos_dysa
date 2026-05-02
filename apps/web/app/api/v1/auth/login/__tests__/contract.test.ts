/**
 * Contract tests — POST /api/v1/auth/login.
 *
 * Cubre el gate mobile de Fase 3C.2: un usuario con contraseña temporal
 * no debe recibir JWT por la API mobile hasta cambiarla en el panel web.
 */

import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { describe, expect, test, beforeEach, vi } from "vitest";

import { prismaMock, resetMocks } from "@/test/setup";

import { POST } from "../route";

vi.mock("next-auth/jwt", () => ({
  encode: vi.fn().mockResolvedValue("jwt-mobile-test"),
}));

function jsonRequest(body: unknown): NextRequest {
  return new Request("http://localhost/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }) as unknown as NextRequest;
}

beforeEach(() => {
  resetMocks();
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.NEXTAUTH_SECRET = "test-secret";
});

describe("POST /api/v1/auth/login — temporary password gate", () => {
  test("usuario con mustChangePassword=true → 403 sin JWT", async () => {
    const password = "Temp12345";
    prismaMock.usuario.findUnique.mockResolvedValue({
      id: 7,
      email: "cajero-temp@pos-chile.cl",
      nombre: "Cajero Temporal",
      rol: "CAJERO",
      activo: true,
      mustChangePassword: true,
      password: await bcrypt.hash(password, 12),
    } as never);

    const res = await POST(jsonRequest({
      email: "cajero-temp@pos-chile.cl",
      password,
    }));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/contraseña temporal/i);
    expect(body.token).toBeUndefined();
  });

  test("usuario sin mustChangePassword=true → 200 con JWT", async () => {
    const password = "Temp12345";
    prismaMock.usuario.findUnique.mockResolvedValue({
      id: 8,
      email: "cajero-ok@pos-chile.cl",
      nombre: "Cajero OK",
      rol: "CAJERO",
      activo: true,
      mustChangePassword: false,
      password: await bcrypt.hash(password, 12),
    } as never);

    const res = await POST(jsonRequest({
      email: "cajero-ok@pos-chile.cl",
      password,
    }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBe("jwt-mobile-test");
    expect(body.user.email).toBe("cajero-ok@pos-chile.cl");
  });
});
