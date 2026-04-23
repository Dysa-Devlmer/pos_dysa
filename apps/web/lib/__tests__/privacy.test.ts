import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { pseudonymize, scrubPII } from "../privacy";

// ─────────────────────────────────────────────────────────────────────────────
// pseudonymize — hashing estable de PII para logs/telemetría
// ─────────────────────────────────────────────────────────────────────────────

describe("pseudonymize", () => {
  const originalSalt = process.env.PII_LOG_SALT;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.PII_LOG_SALT = "test-salt-consistent";
    // Nota: no reasignamos NODE_ENV aquí; cada caso lo maneja explícitamente
  });

  afterEach(() => {
    if (originalSalt === undefined) delete process.env.PII_LOG_SALT;
    else process.env.PII_LOG_SALT = originalSalt;
    if (originalNodeEnv === undefined) {
      // @ts-expect-error NODE_ENV readonly en types pero mutable en runtime
      delete process.env.NODE_ENV;
    } else {
      // @ts-expect-error NODE_ENV readonly en types pero mutable en runtime
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it("same input → same hash (determinístico)", () => {
    expect(pseudonymize("12.345.678-9")).toBe(pseudonymize("12.345.678-9"));
  });

  it("different inputs → different hashes", () => {
    expect(pseudonymize("12.345.678-9")).not.toBe(pseudonymize("12.345.679-K"));
  });

  it("null/undefined/empty → null", () => {
    expect(pseudonymize(null)).toBeNull();
    expect(pseudonymize(undefined)).toBeNull();
    expect(pseudonymize("")).toBeNull();
  });

  it("retorna 16 chars hex lowercase", () => {
    const h = pseudonymize("test@example.cl");
    expect(h).toMatch(/^[a-f0-9]{16}$/);
    expect(h).toHaveLength(16);
  });

  it("salt diferente → hash diferente para misma entrada", () => {
    const h1 = pseudonymize("same-input");
    process.env.PII_LOG_SALT = "different-salt";
    const h2 = pseudonymize("same-input");
    expect(h1).not.toBe(h2);
  });

  it("NO contiene el valor original (no leak)", () => {
    const sensitive = "12.345.678-9";
    const h = pseudonymize(sensitive);
    expect(h).not.toContain(sensitive);
    expect(h).not.toContain("12345678");
    expect(h).not.toContain("678");
  });

  it("dev sin salt usa fallback (no throw)", () => {
    delete process.env.PII_LOG_SALT;
    // @ts-expect-error NODE_ENV readonly en types pero mutable en runtime
    process.env.NODE_ENV = "development";
    expect(() => pseudonymize("algo")).not.toThrow();
    expect(pseudonymize("algo")).toMatch(/^[a-f0-9]{16}$/);
  });

  it("producción sin salt → throw al primer uso", () => {
    delete process.env.PII_LOG_SALT;
    // @ts-expect-error NODE_ENV readonly en types pero mutable en runtime
    process.env.NODE_ENV = "production";
    expect(() => pseudonymize("algo")).toThrow(/PII_LOG_SALT/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// scrubPII — sanitiza objeto completo pre-telemetría
// ─────────────────────────────────────────────────────────────────────────────

describe("scrubPII", () => {
  beforeEach(() => {
    process.env.PII_LOG_SALT = "test-salt-consistent";
  });

  it("reemplaza solo las keys marcadas como PII", () => {
    const input = { rut: "12.345.678-9", action: "deleteVenta", amount: 5000 };
    const result = scrubPII(input, ["rut"] as const);
    expect(result.rut).toMatch(/^[a-f0-9]{16}$/);
    expect(result.action).toBe("deleteVenta");
    expect(result.amount).toBe(5000);
  });

  it("no modifica el objeto original (inmutable)", () => {
    const input = { email: "cliente@test.cl" };
    const copy = { ...input };
    scrubPII(input, ["email"] as const);
    expect(input).toEqual(copy);
  });

  it("ignora keys PII ausentes o no-string", () => {
    const input = { email: undefined, count: 42 };
    const result = scrubPII(input, ["email", "count"] as const);
    expect(result.email).toBeUndefined();
    expect(result.count).toBe(42);
  });

  it("trata strings vacías como no-PII (no hashea)", () => {
    const input = { email: "" };
    const result = scrubPII(input, ["email"] as const);
    expect(result.email).toBe("");
  });
});
