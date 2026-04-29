/**
 * Setup global para Vitest — POS Chile web.
 *
 * F-6 (audit Claude Code CLI 2026-04-28): infraestructura compartida de
 * mocks que cualquier suite puede importar para testar server actions
 * con dependencias pesadas (Prisma, NextAuth, next/cache, etc.) sin
 * tocar BD real.
 *
 * Patrón canónico:
 *
 * ```ts
 * import { prismaMock, resetMocks, mockSession } from "@/test/setup";
 *
 * beforeEach(() => {
 *   resetMocks();
 *   mockSession({ id: "1", rol: "ADMIN" });
 * });
 *
 * test("crearVenta happy", async () => {
 *   prismaMock.producto.findMany.mockResolvedValue([...]);
 *   prismaMock.$transaction.mockImplementation((cb) => cb(prismaMock));
 *   // ...
 * });
 * ```
 *
 * Por qué `vitest-mock-extended` y no jest.fn() manual:
 *   - DeepMockProxy maneja la API chainable de Prisma (model.method.method)
 *     automáticamente. Sin esto, cada model tendría que declararse a mano.
 *   - El cliente Prisma genera tipos — el mock los respeta exactamente,
 *     así un test que usa la API equivocada falla en tsc, no en runtime.
 *   - `mockReset()` global limpia state entre tests sin perder shape.
 */

import type { PrismaClient } from "@prisma/client";
import { vi } from "vitest";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";

// ─── 1. Prisma client mock ───────────────────────────────────────────────
//
// Importante: este mock vive a nivel módulo. La sustitución del módulo real
// `@repo/db` se hace via `vi.mock(...)` que cada test suite invoca al top
// (Vitest hoistea estos como Jest). Aquí solo exportamos el handle del mock
// para que las suites puedan reach in y configurar respuestas.

export const prismaMock: DeepMockProxy<PrismaClient> = mockDeep<PrismaClient>();

// ─── 2. Session mock helpers ─────────────────────────────────────────────

type MockUser = {
  id: string;
  email?: string;
  nombre?: string;
  rol?: "ADMIN" | "CAJERO" | "VENDEDOR";
};

export const authMock = vi.fn();

/**
 * Helper para configurar la session que `auth()` (de @/auth) retorna.
 * Pasa null para simular "no autenticado".
 */
export function mockSession(user: MockUser | null) {
  if (user === null) {
    authMock.mockResolvedValue(null);
    return;
  }
  authMock.mockResolvedValue({
    user: {
      id: user.id,
      email: user.email ?? "test@pos-chile.cl",
      nombre: user.nombre ?? "Test User",
      rol: user.rol ?? "ADMIN",
    },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  });
}

// ─── 3. next/cache + next/navigation mocks ───────────────────────────────

export const revalidatePathMock = vi.fn();
export const redirectMock = vi.fn();

// ─── 4. Reset utility ────────────────────────────────────────────────────

/**
 * Resetea TODOS los mocks entre tests. Llamar en `beforeEach` siempre.
 *
 * Sin esto, mocks de un test "leakean" al siguiente — un test que pasa
 * en isolation puede fallar cuando se corre el suite completo (orden-
 * dependiente, anti-patrón).
 */
export function resetMocks() {
  mockReset(prismaMock);
  authMock.mockReset();
  revalidatePathMock.mockReset();
  redirectMock.mockReset();
}

// ─── 5. Auto-wire vi.mock para los módulos canónicos ─────────────────────
//
// Estos mocks aplican a TODO el suite. Cualquier import de `@repo/db`,
// `@/auth`, `next/cache` desde código bajo test usa estos handles.
//
// Importante: vi.mock() se hoistea al TOP del archivo donde se invoca,
// pero los símbolos exportados arriba se inicializan ANTES (TDZ-safe).

vi.mock("@repo/db", async () => {
  // Re-exportamos los enums + tipos del paquete real (no hay forma de
  // mockear `enum` runtime — Prisma client los exporta como objetos).
  const actual = await vi.importActual<typeof import("@repo/db")>("@repo/db");
  return {
    ...actual,
    prisma: prismaMock,
  };
});

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
  revalidateTag: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  notFound: vi.fn(),
}));
