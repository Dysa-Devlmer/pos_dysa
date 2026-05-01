/**
 * Unit tests — apps/mobile/lib/sentry.ts (Fase 2D · 2026-05-01).
 *
 * Cubre:
 *   - pseudonymize: determinístico, distinto entre inputs distintos.
 *   - sanitize: PII keys → hashed, secret keys → eliminadas, primitivos
 *     intactos, recursivo en objetos/arrays.
 *   - truncateIp: IPv4 → /24; IPv6 → /48.
 *   - initSentry: degrada a no-op cuando DSN está vacío; llama Sentry.init
 *     cuando DSN está presente.
 *   - capture* helpers: NO-OP cuando Sentry no está activo; pasan extras
 *     sanitizadas cuando sí está activo.
 */

import {
  __resetSentryForTests__,
  __test_internals__,
  captureExceptionSafe,
  captureMessageSafe,
  initSentry,
  isSentryActive,
} from "../lib/sentry";

const mockInit = jest.fn();
const mockCaptureException = jest.fn();
const mockCaptureMessage = jest.fn();

jest.mock("@sentry/react-native", () => ({
  __esModule: true,
  init: mockInit,
  captureException: mockCaptureException,
  captureMessage: mockCaptureMessage,
  wrap: <T>(c: T) => c,
}));

const { pseudonymize, sanitize, truncateIp } = __test_internals__;

beforeEach(() => {
  mockInit.mockClear();
  mockCaptureException.mockClear();
  mockCaptureMessage.mockClear();
  __resetSentryForTests__();
  delete process.env.EXPO_PUBLIC_SENTRY_DSN;
});

// ─── pseudonymize ──────────────────────────────────────────────────────────

describe("pseudonymize", () => {
  test("retorna 16 chars hex para input no vacío", () => {
    const h = pseudonymize("admin@dypos.cl");
    expect(h).toMatch(/^[0-9a-f]{16}$/);
  });

  test("es determinístico (mismo input → mismo output)", () => {
    const a = pseudonymize("user@example.cl");
    const b = pseudonymize("user@example.cl");
    expect(a).toBe(b);
  });

  test("inputs distintos producen outputs distintos", () => {
    const a = pseudonymize("a@x.cl");
    const b = pseudonymize("b@x.cl");
    expect(a).not.toBe(b);
  });

  test("string vacío retorna string vacío", () => {
    expect(pseudonymize("")).toBe("");
  });
});

// ─── sanitize ──────────────────────────────────────────────────────────────

describe("sanitize", () => {
  test("PII keys email/rut/telefono → reemplazadas por *Hash", () => {
    const out = sanitize({
      email: "x@y.cl",
      rut: "12.345.678-9",
      telefono: "+56 9 1234 5678",
      otra: "OK",
    });
    expect(out).toEqual({
      emailHash: pseudonymize("x@y.cl"),
      rutHash: pseudonymize("12.345.678-9"),
      telefonoHash: pseudonymize("+56 9 1234 5678"),
      otra: "OK",
    });
  });

  test("PII case-insensitive por nombre de key", () => {
    const out = sanitize({ Email: "x@y.cl", RUT: "1-1" });
    expect((out as Record<string, unknown>).EmailHash).toBe(
      pseudonymize("x@y.cl"),
    );
    expect((out as Record<string, unknown>).RUTHash).toBe(pseudonymize("1-1"));
  });

  test("secret keys (password/token/authorization/cookie) → eliminadas", () => {
    const out = sanitize({
      password: "secret",
      token: "abc",
      Authorization: "Bearer xyz",
      Cookie: "sid=abc",
      ok: 1,
    });
    expect(out).toEqual({ ok: 1 });
  });

  test("primitivos intactos", () => {
    expect(sanitize(42)).toBe(42);
    expect(sanitize("hola")).toBe("hola");
    expect(sanitize(null)).toBeNull();
    expect(sanitize(undefined)).toBeUndefined();
    expect(sanitize(true)).toBe(true);
  });

  test("arrays se sanitizan recursivamente", () => {
    const out = sanitize([
      { email: "a@x.cl", n: 1 },
      { rut: "1-1", n: 2 },
    ]);
    expect(out).toEqual([
      { emailHash: pseudonymize("a@x.cl"), n: 1 },
      { rutHash: pseudonymize("1-1"), n: 2 },
    ]);
  });

  test("objetos anidados se sanitizan recursivamente", () => {
    const out = sanitize({
      cliente: { email: "c@d.cl", id: 5, password: "x" },
      total: 100,
    });
    expect(out).toEqual({
      cliente: { emailHash: pseudonymize("c@d.cl"), id: 5 },
      total: 100,
    });
  });

  test("PII con valor no-string → key se mantiene tal cual", () => {
    const out = sanitize({ email: 42 });
    // No hace pseudonymize sobre número; deja key original.
    expect(out).toEqual({ email: 42 });
  });
});

// ─── truncateIp ────────────────────────────────────────────────────────────

describe("truncateIp", () => {
  test("IPv4 → primeros 3 octetos + .0", () => {
    expect(truncateIp("192.168.1.42")).toBe("192.168.1.0");
    expect(truncateIp("10.0.0.7")).toBe("10.0.0.0");
  });

  test("IPv6 → primeros 3 grupos + ::", () => {
    expect(truncateIp("2001:db8:85a3::8a2e:0370:7334")).toBe("2001:db8:85a3::");
  });

  test("string no-IP se devuelve tal cual", () => {
    expect(truncateIp("not-an-ip")).toBe("not-an-ip");
  });
});

// ─── initSentry — degradación silenciosa ───────────────────────────────────

describe("initSentry — degradación silenciosa sin DSN", () => {
  test("DSN ausente → NO llama Sentry.init y isSentryActive=false", () => {
    initSentry();
    expect(mockInit).not.toHaveBeenCalled();
    expect(isSentryActive()).toBe(false);
  });

  test("DSN string vacío (whitespace) → NO inicializa", () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = "   ";
    initSentry();
    expect(mockInit).not.toHaveBeenCalled();
    expect(isSentryActive()).toBe(false);
  });

  test("DSN presente → llama Sentry.init con beforeSend", () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = "https://abc@sentry.io/123";
    initSentry();
    expect(mockInit).toHaveBeenCalledTimes(1);
    const cfg = mockInit.mock.calls[0]![0];
    expect(cfg.dsn).toBe("https://abc@sentry.io/123");
    expect(cfg.tracesSampleRate).toBe(0);
    expect(typeof cfg.beforeSend).toBe("function");
    expect(isSentryActive()).toBe(true);
  });

  test("initSentry idempotente (segunda llamada no re-inicializa)", () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = "https://abc@sentry.io/123";
    initSentry();
    initSentry();
    expect(mockInit).toHaveBeenCalledTimes(1);
  });
});

// ─── beforeSend — sanitización del evento ──────────────────────────────────

describe("beforeSend del init — sanitiza el evento", () => {
  function getBeforeSend() {
    process.env.EXPO_PUBLIC_SENTRY_DSN = "https://abc@sentry.io/123";
    initSentry();
    return mockInit.mock.calls[0]![0].beforeSend as (e: unknown) => unknown;
  }

  test("event.extra con email/rut → sanitizado a *Hash", () => {
    const beforeSend = getBeforeSend();
    const sanitized = beforeSend({
      extra: { email: "a@b.cl", rut: "1-1", monto: 5000 },
    }) as { extra: Record<string, unknown> };
    expect(sanitized.extra).toEqual({
      emailHash: pseudonymize("a@b.cl"),
      rutHash: pseudonymize("1-1"),
      monto: 5000,
    });
  });

  test("event.user.email → emailHash + delete email", () => {
    const beforeSend = getBeforeSend();
    const sanitized = beforeSend({
      user: { id: "5", email: "u@dypos.cl", username: "ulmer" },
    }) as { user: Record<string, unknown> };
    expect(sanitized.user.emailHash).toBe(pseudonymize("u@dypos.cl"));
    expect(sanitized.user.email).toBeUndefined();
    expect(sanitized.user.username).toBe("ulmer");
  });

  test("event.user.ip_address → truncado a /24", () => {
    const beforeSend = getBeforeSend();
    const sanitized = beforeSend({
      user: { ip_address: "190.55.4.123" },
    }) as { user: Record<string, unknown> };
    expect(sanitized.user.ip_address).toBe("190.55.4.0");
  });

  test("event.request.data con password → password eliminado", () => {
    const beforeSend = getBeforeSend();
    const sanitized = beforeSend({
      request: {
        data: {
          email: "a@b.cl",
          password: "supersecret",
          other: "x",
        },
      },
    }) as { request: { data: Record<string, unknown> } };
    expect(sanitized.request.data).toEqual({
      emailHash: pseudonymize("a@b.cl"),
      other: "x",
    });
    expect(sanitized.request.data.password).toBeUndefined();
  });
});

// ─── capture* helpers ──────────────────────────────────────────────────────

describe("captureExceptionSafe / captureMessageSafe", () => {
  test("sin Sentry activo: NO-OP (no llama Sentry.*)", () => {
    captureExceptionSafe(new Error("x"), { extra: { email: "y@z.cl" } });
    captureMessageSafe("hola", { extra: { email: "y@z.cl" } });
    expect(mockCaptureException).not.toHaveBeenCalled();
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  test("con Sentry activo: llama y sanitiza extra", () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = "https://abc@sentry.io/123";
    initSentry();
    captureExceptionSafe(new Error("oops"), {
      extra: { email: "a@b.cl", n: 5 },
    });
    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    const args = mockCaptureException.mock.calls[0]!;
    expect((args[1] as { extra: Record<string, unknown> }).extra).toEqual({
      emailHash: pseudonymize("a@b.cl"),
      n: 5,
    });
  });

  test("con Sentry activo: captureMessage sanitiza extra y propaga level", () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = "https://abc@sentry.io/123";
    initSentry();
    captureMessageSafe("warn", {
      level: "warning",
      extra: { rut: "1-1", n: 9 },
    });
    expect(mockCaptureMessage).toHaveBeenCalledTimes(1);
    const args = mockCaptureMessage.mock.calls[0]!;
    expect(args[0]).toBe("warn");
    expect((args[1] as { level: string }).level).toBe("warning");
    expect((args[1] as { extra: Record<string, unknown> }).extra).toEqual({
      rutHash: pseudonymize("1-1"),
      n: 9,
    });
  });
});
