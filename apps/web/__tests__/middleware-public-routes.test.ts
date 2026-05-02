import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const middlewareSource = readFileSync(
  new URL("../middleware.ts", import.meta.url),
  "utf8",
);

describe("middleware public route exclusions", () => {
  test("mantiene publicos los comprobantes compartibles", () => {
    const matcher = middlewareSource.match(/"\/\(\(\?![^"]+\)\.\*\)"/)?.[0];
    expect(matcher).toBeDefined();

    const regex = new RegExp(`^${JSON.parse(matcher!)}$`);
    expect(regex.test("/dashboard")).toBe(true);
    expect(regex.test("/comprobante/tok_1234567890")).toBe(false);
    expect(regex.test("/comprobante/devolucion/tok_1234567890")).toBe(false);
    expect(regex.test("/privacidad")).toBe(false);
  });
});
