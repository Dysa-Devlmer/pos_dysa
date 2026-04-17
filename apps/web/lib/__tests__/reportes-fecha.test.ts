import { describe, it, expect } from "vitest";
import {
  CHILE_TZ,
  esFechaYMD,
  finDelDiaChile,
  inicioDelDiaChile,
  parseRangoDesdeURL,
  primeroDelMesChileISODate,
  hoyChileISODate,
  formatCLPPlain,
} from "../reportes-fecha";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de test
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Devuelve la fecha/hora mostrada en Chile para un Date dado,
 * usando el mismo mecanismo que la implementación. Evita depender
 * del huso real del runner y solo valida la invariante: inicioDelDiaChile
 * debe caer a las 00:00 hora Chile, finDelDiaChile a las 23:59.
 */
function partsInChile(d: Date): { h: string; m: string } {
  // Usamos hourCycle: "h23" para garantizar 00..23 (es-CL devuelve "24" a
  // medianoche con hour12:false). Fallback: normalizar "24" -> "00".
  const parts = new Intl.DateTimeFormat("es-CL", {
    timeZone: CHILE_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  let h = parts.find((p) => p.type === "hour")?.value ?? "";
  const m = parts.find((p) => p.type === "minute")?.value ?? "";
  if (h === "24") h = "00";
  return { h, m };
}

// ─────────────────────────────────────────────────────────────────────────────
// esFechaYMD
// ─────────────────────────────────────────────────────────────────────────────
describe("esFechaYMD", () => {
  it("acepta strings YYYY-MM-DD bien formados", () => {
    expect(esFechaYMD("2026-01-01")).toBe(true);
    expect(esFechaYMD("2026-12-31")).toBe(true);
  });

  it("rechaza formatos inválidos", () => {
    expect(esFechaYMD("2026/01/01")).toBe(false);
    expect(esFechaYMD("26-01-01")).toBe(false);
    expect(esFechaYMD("2026-1-1")).toBe(false);
    expect(esFechaYMD("2026-01")).toBe(false);
    expect(esFechaYMD("")).toBe(false);
  });

  it("rechaza tipos no-string", () => {
    expect(esFechaYMD(20260101)).toBe(false);
    expect(esFechaYMD(null)).toBe(false);
    expect(esFechaYMD(undefined)).toBe(false);
    expect(esFechaYMD({})).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// inicioDelDiaChile / finDelDiaChile
// ─────────────────────────────────────────────────────────────────────────────
describe("inicioDelDiaChile", () => {
  it("produce una fecha que es 00:00 hora Chile", () => {
    const d = inicioDelDiaChile("2026-04-16");
    const { h, m } = partsInChile(d);
    expect(h).toBe("00");
    expect(m).toBe("00");
  });

  it("produce fechas ordenables cronológicamente", () => {
    const a = inicioDelDiaChile("2026-01-01");
    const b = inicioDelDiaChile("2026-06-01");
    const c = inicioDelDiaChile("2026-12-31");
    expect(a.getTime()).toBeLessThan(b.getTime());
    expect(b.getTime()).toBeLessThan(c.getTime());
  });
});

describe("finDelDiaChile", () => {
  it("produce una fecha que es 23:59 hora Chile", () => {
    const d = finDelDiaChile("2026-04-16");
    const { h, m } = partsInChile(d);
    expect(h).toBe("23");
    expect(m).toBe("59");
  });

  it("es estrictamente posterior al inicio del mismo día", () => {
    const ini = inicioDelDiaChile("2026-04-16");
    const fin = finDelDiaChile("2026-04-16");
    expect(fin.getTime()).toBeGreaterThan(ini.getTime());
    // Duración ≈ 24h - 0.001s
    const diffMs = fin.getTime() - ini.getTime();
    expect(diffMs).toBeGreaterThan(23 * 60 * 60 * 1000);
    expect(diffMs).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// hoyChileISODate / primeroDelMesChileISODate
// ─────────────────────────────────────────────────────────────────────────────
describe("hoyChileISODate", () => {
  it("devuelve un YYYY-MM-DD válido", () => {
    const v = hoyChileISODate();
    expect(esFechaYMD(v)).toBe(true);
  });
});

describe("primeroDelMesChileISODate", () => {
  it("termina en -01 y tiene mismo mes que hoy", () => {
    const hoy = hoyChileISODate();
    const primero = primeroDelMesChileISODate();
    expect(primero).toMatch(/^\d{4}-\d{2}-01$/);
    expect(primero.slice(0, 7)).toBe(hoy.slice(0, 7));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// parseRangoDesdeURL
// ─────────────────────────────────────────────────────────────────────────────
describe("parseRangoDesdeURL", () => {
  it("usa desde=primero del mes / hasta=hoy cuando no hay params", () => {
    const url = new URL("https://ejemplo.cl/api/reportes");
    const r = parseRangoDesdeURL(url);
    expect(r.desdeYMD).toBe(primeroDelMesChileISODate());
    expect(r.hastaYMD).toBe(hoyChileISODate());
    expect(r.desde.getTime()).toBeLessThanOrEqual(r.hasta.getTime());
  });

  it("acepta params válidos y los devuelve tal cual", () => {
    const url = new URL(
      "https://ejemplo.cl/api/reportes?desde=2026-01-01&hasta=2026-01-31",
    );
    const r = parseRangoDesdeURL(url);
    expect(r.desdeYMD).toBe("2026-01-01");
    expect(r.hastaYMD).toBe("2026-01-31");
  });

  it("produce Date desde al inicio del día y hasta al fin del día", () => {
    const url = new URL(
      "https://ejemplo.cl/api/reportes?desde=2026-04-01&hasta=2026-04-30",
    );
    const r = parseRangoDesdeURL(url);
    expect(partsInChile(r.desde).h).toBe("00");
    expect(partsInChile(r.desde).m).toBe("00");
    expect(partsInChile(r.hasta).h).toBe("23");
    expect(partsInChile(r.hasta).m).toBe("59");
  });

  it("lanza error si 'desde' es inválido", () => {
    const url = new URL("https://ejemplo.cl/api/reportes?desde=2026/01/01");
    expect(() => parseRangoDesdeURL(url)).toThrow(/desde/);
  });

  it("lanza error si 'hasta' es inválido", () => {
    const url = new URL("https://ejemplo.cl/api/reportes?hasta=31-12-2026");
    expect(() => parseRangoDesdeURL(url)).toThrow(/hasta/);
  });

  it("no lanza cuando el param está vacío (se ignora y usa default)", () => {
    const url = new URL("https://ejemplo.cl/api/reportes?desde=&hasta=");
    expect(() => parseRangoDesdeURL(url)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatCLPPlain
// ─────────────────────────────────────────────────────────────────────────────
describe("formatCLPPlain", () => {
  it("formatea enteros positivos con separador de miles", () => {
    expect(formatCLPPlain(1000)).toBe("$1.000");
    expect(formatCLPPlain(1_234_567)).toBe("$1.234.567");
    expect(formatCLPPlain(0)).toBe("$0");
  });

  it("redondea decimales con Math.round", () => {
    expect(formatCLPPlain(1000.4)).toBe("$1.000");
    expect(formatCLPPlain(1000.5)).toBe("$1.001");
  });

  it("formatea negativos con signo '-$'", () => {
    expect(formatCLPPlain(-500)).toBe("-$500");
    expect(formatCLPPlain(-1_234_567)).toBe("-$1.234.567");
  });
});
