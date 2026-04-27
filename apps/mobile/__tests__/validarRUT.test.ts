/**
 * Unit tests — @repo/domain validarRUT (algoritmo módulo 11 chileno).
 *
 * Estos tests viven en mobile porque el package domain todavía no tiene
 * setup de jest propio; el plan post-R3 es mover el suite completo a
 * packages/domain/__tests__ una vez que vitest este configurado en el
 * workspace.
 */
import { validarRUT } from "@repo/domain";

describe("validarRUT — happy path", () => {
  test("RUT con puntos y guion", () => {
    expect(validarRUT("11.111.111-1")).toBe(true);
  });
  test("RUT sin puntos ni guion", () => {
    expect(validarRUT("111111111")).toBe(true);
  });
  test("RUT con DV K mayuscula", () => {
    expect(validarRUT("8.765.432-K")).toBe(true);
  });
  test("RUT con DV k minuscula", () => {
    expect(validarRUT("8765432k")).toBe(true);
  });
});

describe("validarRUT — edge cases", () => {
  test("RUT con DV incorrecto", () => {
    expect(validarRUT("12.345.678-9")).toBe(false);
  });
  test("string vacio", () => {
    expect(validarRUT("")).toBe(false);
  });
  test("solo guion", () => {
    expect(validarRUT("-")).toBe(false);
  });
  test("RUT 0-0 (matematicamente valido)", () => {
    expect(validarRUT("0-0")).toBe(true);
  });
});
