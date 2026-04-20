import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { checkEnv } from "../check-env";

// ─────────────────────────────────────────────────────────────────────────────
// checkEnv — validación de NEXTAUTH_SECRET en producción
// ─────────────────────────────────────────────────────────────────────────────
describe("checkEnv (production)", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSecret = process.env.NEXTAUTH_SECRET;
  const originalAuth = process.env.AUTH_SECRET;
  const originalPhase = process.env.NEXT_PHASE;

  beforeEach(() => {
    // @ts-expect-error - NODE_ENV es readonly en types pero mutable en runtime
    process.env.NODE_ENV = "production";
    delete process.env.NEXT_PHASE;
    delete process.env.AUTH_SECRET;
  });

  afterEach(() => {
    // @ts-expect-error
    process.env.NODE_ENV = originalNodeEnv;
    process.env.NEXTAUTH_SECRET = originalSecret;
    process.env.AUTH_SECRET = originalAuth;
    process.env.NEXT_PHASE = originalPhase;
  });

  it("throws si NEXTAUTH_SECRET no está definida", () => {
    delete process.env.NEXTAUTH_SECRET;
    expect(() => checkEnv()).toThrow(/no definida en producción/);
  });

  it("rechaza el placeholder clásico 'cambiar'", () => {
    process.env.NEXTAUTH_SECRET = "pos-chile-secret-2025-cambiar-en-produccion";
    expect(() => checkEnv()).toThrow(/cambiar/);
  });

  it("rechaza el placeholder del .env.example 'generar-con-openssl-rand-base64-32'", () => {
    process.env.NEXTAUTH_SECRET = "generar-con-openssl-rand-base64-32";
    expect(() => checkEnv()).toThrow(/generar-con-openssl/);
  });

  it("rechaza el placeholder original 'CAMBIAR_generar_con_openssl'", () => {
    process.env.NEXTAUTH_SECRET = "CAMBIAR_generar_con_openssl";
    // Cualquier patrón matcheado es aceptable (contiene "cambiar" + otros)
    expect(() => checkEnv()).toThrow(/placeholder|cambiar/i);
  });

  it("rechaza secret con patrón regex (test-secret, demo_secret, etc.)", () => {
    process.env.NEXTAUTH_SECRET = "test-secret";
    expect(() => checkEnv()).toThrow();
    process.env.NEXTAUTH_SECRET = "demo_secret";
    expect(() => checkEnv()).toThrow();
    process.env.NEXTAUTH_SECRET = "placeholdersecret";
    expect(() => checkEnv()).toThrow();
  });

  it("rechaza secret muy corto (<32 chars)", () => {
    process.env.NEXTAUTH_SECRET = "a".repeat(20);
    expect(() => checkEnv()).toThrow(/demasiado corta/);
  });

  it("acepta secret válido (≥32 chars, sin patrones conocidos)", () => {
    process.env.NEXTAUTH_SECRET = "K8sHx2pJQ7mNvR4wT9yU3iO5aS1bC0dE";
    expect(() => checkEnv()).not.toThrow();
  });

  it("boundary: secret de exactamente 31 chars → falla (<32)", () => {
    process.env.NEXTAUTH_SECRET = "K8sHx2pJQ7mNvR4wT9yU3iO5aS1bC0d"; // 31 chars
    expect(process.env.NEXTAUTH_SECRET.length).toBe(31);
    expect(() => checkEnv()).toThrow(/demasiado corta/);
  });

  it("boundary: secret de exactamente 32 chars → pasa", () => {
    process.env.NEXTAUTH_SECRET = "K8sHx2pJQ7mNvR4wT9yU3iO5aS1bC0dE"; // 32 chars
    expect(process.env.NEXTAUTH_SECRET.length).toBe(32);
    expect(() => checkEnv()).not.toThrow();
  });

  it("rechaza placeholder con guión: 'placeholder-secret'", () => {
    process.env.NEXTAUTH_SECRET = "placeholder-secret";
    expect(() => checkEnv()).toThrow(/placeholder/i);
  });

  it("acepta AUTH_SECRET como alternativa a NEXTAUTH_SECRET", () => {
    delete process.env.NEXTAUTH_SECRET;
    process.env.AUTH_SECRET = "K8sHx2pJQ7mNvR4wT9yU3iO5aS1bC0dE";
    expect(() => checkEnv()).not.toThrow();
  });

  it("no valida durante build (NEXT_PHASE=phase-production-build)", () => {
    process.env.NEXT_PHASE = "phase-production-build";
    process.env.NEXTAUTH_SECRET = "cambiar"; // inválido pero no debe fallar en build
    expect(() => checkEnv()).not.toThrow();
  });
});

describe("checkEnv (development)", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    // @ts-expect-error
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("no valida nada en development (aunque el secret sea placeholder)", () => {
    // @ts-expect-error
    process.env.NODE_ENV = "development";
    process.env.NEXTAUTH_SECRET = "cambiar";
    expect(() => checkEnv()).not.toThrow();
  });
});
