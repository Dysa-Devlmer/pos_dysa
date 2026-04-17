import { describe, it, expect } from "vitest";
import {
  calcularIVA,
  formatCLP,
  formatRUT,
  validarRUT,
} from "../utils";

// ─────────────────────────────────────────────────────────────────────────────
// validarRUT
// ─────────────────────────────────────────────────────────────────────────────
describe("validarRUT", () => {
  it("acepta RUTs válidos con puntos y guion", () => {
    expect(validarRUT("11.111.111-1")).toBe(true);
    expect(validarRUT("12.345.678-5")).toBe(true);
  });

  it("acepta RUTs válidos sin puntos ni guion", () => {
    expect(validarRUT("111111111")).toBe(true);
    expect(validarRUT("123456785")).toBe(true);
  });

  it("acepta RUT con dígito verificador K (mayúscula y minúscula)", () => {
    // 8.765.432-K: suma=155, 155%11=1, DV=11-1=10 → K
    expect(validarRUT("8.765.432-K")).toBe(true);
    expect(validarRUT("8.765.432-k")).toBe(true);
  });

  it("acepta RUT con dígito verificador 0", () => {
    // 14.000.000-0: suma=11, 11%11=0, DV=11-0=11 → 0
    expect(validarRUT("14.000.000-0")).toBe(true);
  });

  it("rechaza RUTs con DV incorrecto", () => {
    expect(validarRUT("12.345.678-9")).toBe(false);
    expect(validarRUT("11.111.111-2")).toBe(false);
  });

  it("rechaza cadenas demasiado cortas (<2 chars)", () => {
    expect(validarRUT("")).toBe(false);
    expect(validarRUT("1")).toBe(false);
    expect(validarRUT("-")).toBe(false);
  });

  it("rechaza cuerpos no numéricos", () => {
    // Cuerpo con letras -> parseInt = NaN, suma = NaN, DV nunca matchea
    expect(validarRUT("ABC.DEF.GHI-J")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatRUT
// ─────────────────────────────────────────────────────────────────────────────
describe("formatRUT", () => {
  it("formatea RUT sin puntos ni guion", () => {
    expect(formatRUT("123456789")).toBe("12.345.678-9");
  });

  it("re-formatea RUT que ya tenía puntos y guion", () => {
    expect(formatRUT("12.345.678-9")).toBe("12.345.678-9");
  });

  it("preserva el dígito K como DV", () => {
    expect(formatRUT("7654321K")).toBe("7.654.321-K");
  });

  it("maneja RUTs cortos", () => {
    expect(formatRUT("1234567")).toBe("123.456-7");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcularIVA
// ─────────────────────────────────────────────────────────────────────────────
describe("calcularIVA", () => {
  it("calcula 19% e impuesto y total correctos con montos exactos", () => {
    const { impuesto, total } = calcularIVA(1000);
    expect(impuesto).toBe(190);
    expect(total).toBe(1190);
  });

  it("redondea el impuesto con Math.round (half-up)", () => {
    // 105 * 0.19 = 19.95 -> round -> 20
    const { impuesto, total } = calcularIVA(105);
    expect(impuesto).toBe(20);
    expect(total).toBe(125);
  });

  it("redondea hacia abajo cuando el decimal es < .5", () => {
    // 104 * 0.19 = 19.76 -> round -> 20
    const r1 = calcularIVA(104);
    expect(r1.impuesto).toBe(20);

    // 100 * 0.19 = 19 exacto
    const r2 = calcularIVA(100);
    expect(r2.impuesto).toBe(19);
  });

  it("maneja subtotal 0 sin impuesto", () => {
    const { impuesto, total } = calcularIVA(0);
    expect(impuesto).toBe(0);
    expect(total).toBe(0);
  });

  it("maneja montos grandes sin overflow ni pérdida de precisión entera", () => {
    const { impuesto, total } = calcularIVA(10_000_000);
    expect(impuesto).toBe(1_900_000);
    expect(total).toBe(11_900_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatCLP
// ─────────────────────────────────────────────────────────────────────────────
describe("formatCLP", () => {
  // Intl con "es-CL" típicamente produce "$X.XXX" con separador de miles ".".
  // Algunos runtimes añaden NBSP (\u00A0) entre signo y dígito. Verificamos
  // usando una normalización de espacios para hacer los asserts robustos.
  const norm = (s: string) => s.replace(/\s|\u00A0|\u202F/g, "");

  it("formatea 1000 como moneda CLP sin decimales", () => {
    const s = norm(formatCLP(1000));
    expect(s).toBe("$1.000");
  });

  it("formatea millones con separador de miles", () => {
    const s = norm(formatCLP(1_234_567));
    expect(s).toBe("$1.234.567");
  });

  it("formatea 0 como $0", () => {
    const s = norm(formatCLP(0));
    expect(s).toBe("$0");
  });

  it("no expone decimales incluso con fracciones (truncado por Intl)", () => {
    const s = norm(formatCLP(1000.7));
    // maximumFractionDigits: 0 -> redondeo Intl
    expect(s).toMatch(/^\$1\.001$/);
  });
});
