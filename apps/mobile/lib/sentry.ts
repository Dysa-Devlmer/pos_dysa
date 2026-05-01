/**
 * Sentry mobile — error tracking + PII pseudonymization (Fase 2D · 2026-05-01).
 *
 * Wrapper alrededor de `@sentry/react-native` con tres garantías:
 *
 * 1. **Degradación silenciosa**: si `EXPO_PUBLIC_SENTRY_DSN` está vacío
 *    (dev sin DSN, CI, contributor sin acceso a Sentry), `initSentry()` NO
 *    inicializa el SDK. Las funciones `captureExceptionSafe` /
 *    `captureMessageSafe` quedan como no-ops. El bundle JS sigue funcionando.
 *    Mismo patrón que `apps/web/lib/sentry-helpers.ts`.
 *
 * 2. **PII pseudonymization en `beforeSend`**: emails, RUTs y teléfonos
 *    se hashean ANTES de salir del device. El payload de Sentry recibe
 *    `emailHash` / `rutHash` / `telefonoHash` en lugar del valor crudo.
 *    Defensa en profundidad — si un componente accidentalmente pasa
 *    `extra: { email }`, el hook lo cubre.
 *
 * 3. **Sanitización del request body**: `event.request?.data` (cuando
 *    Sentry captura ApiClientError con payload) se inspecciona y se
 *    eliminan los campos `password`, `email`, `rut`, `telefono` recursivamente.
 *
 * Hash: implementación inline determinística (FNV-1a 32-bit + djb2 32-bit
 * concatenados → 16 chars hex). NO criptográficamente segura, pero suficiente
 * para evitar exponer PII crudo. Si en el futuro se requiere SHA-256, agregar
 * `expo-crypto` y reemplazar `pseudonymize`.
 */

// Carga lazy del módulo Sentry — bug conocido del transform
// `_interopRequireWildcard` de jest-expo + babel-preset-expo: con
// `import * as Sentry` o `import { init }`, los named exports en jest
// quedan como `undefined` aunque el mock factory los expone (ver
// __tests__/sentry.test.ts). Late-binding via `require()` evade el bug
// porque jest mockea el require call en runtime y devuelve el mock
// completo. En runtime RN/Metro no hay diferencia funcional.
type SentryRN = typeof import("@sentry/react-native");

function getSentry(): SentryRN {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("@sentry/react-native") as SentryRN;
}

// ─── Pseudonymization helpers ───────────────────────────────────────────────

/**
 * FNV-1a 32-bit hash de un string. Determinístico, sin deps.
 */
function fnv1a32(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * djb2 hash de un string. Combinado con FNV-1a producen 64 bits efectivos
 * de espacio para reducir colisiones.
 */
function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

/**
 * Pseudonimiza un identificador a un hash determinístico de 16 chars hex.
 * No reversible sin tabla rainbow del input space — para PII de bajo volumen
 * (emails) un attacker podría brute-forcear, pero es suficiente para evitar
 * exponer el email crudo en Sentry events.
 */
export function pseudonymize(value: string): string {
  if (!value) return "";
  const a = fnv1a32(value).toString(16).padStart(8, "0");
  const b = djb2(value).toString(16).padStart(8, "0");
  return a + b;
}

// ─── Sanitizers ─────────────────────────────────────────────────────────────

const PII_KEYS = new Set(["email", "rut", "telefono", "phone"]);
const SECRET_KEYS = new Set(["password", "token", "authorization", "cookie"]);

/**
 * Sanitiza recursivamente un objeto:
 *   - keys en PII_KEYS → reemplazadas por `${key}Hash` con valor pseudonimizado.
 *   - keys en SECRET_KEYS → eliminadas.
 *   - el resto pasa intacto.
 *
 * Maneja arrays, objetos plain, y deja primitivos intactos. NO recursa en
 * objetos nativos (Date, Map, etc.) para evitar loops infinitos.
 */
function sanitize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(sanitize);
  if (typeof value !== "object") return value;
  if (value.constructor !== Object) return value;

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const lower = k.toLowerCase();
    if (SECRET_KEYS.has(lower)) {
      // Drop completamente — secrets no deben aparecer ni hasheados.
      continue;
    }
    if (PII_KEYS.has(lower) && typeof v === "string") {
      out[`${k}Hash`] = pseudonymize(v);
      continue;
    }
    out[k] = sanitize(v);
  }
  return out;
}

// ─── Init ───────────────────────────────────────────────────────────────────

/**
 * Indica si Sentry está activo en este runtime. `false` si:
 *   - DSN vacío (no configurado)
 *   - initSentry no fue llamado todavía
 */
let sentryActive = false;

export function isSentryActive(): boolean {
  return sentryActive;
}

/**
 * Inicializa Sentry RN si hay DSN configurado. Idempotente — llamadas
 * subsecuentes no reinicializan.
 *
 * Llamar UNA vez en el root del app (`app/_layout.tsx`) antes del primer
 * render.
 */
export function initSentry(): void {
  if (sentryActive) return;

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn || dsn.trim().length === 0) {
    // Degradación silenciosa: dev sin DSN, CI, contributor externo.
    // No log warning — sería ruido en cada arranque.
    return;
  }

  getSentry().init({
    dsn,
    // Solo errors en este sprint. Tracing queda para futuro cuando haya
    // volumen real (Codex Q2 Fase 2D).
    tracesSampleRate: 0,
    // Mostrar al developer, NO al usuario final, qué Sentry envía/no envía.
    // En release builds (__DEV__ === false) Sentry usa false automáticamente.
    debug: false,
    // Patrón "fail-open" en sanitización: si beforeSend lanza, NO bloquear
    // el envío del evento (preferimos un evento con PII a perder un crash
    // crítico). Pero log a console.warn para que se note.
    beforeSend(event) {
      try {
        // Sanitiza extras y tags del root del evento.
        if (event.extra) {
          event.extra = sanitize(event.extra) as typeof event.extra;
        }
        if (event.tags) {
          event.tags = sanitize(event.tags) as typeof event.tags;
        }
        // Sanitiza request.data (si Sentry capturó un ApiClientError con body).
        if (event.request?.data) {
          event.request.data = sanitize(event.request.data) as never;
        }
        // Sanitiza user object — Sentry agrega user.email automáticamente
        // si está en el contexto. Lo pseudonimizamos.
        if (event.user) {
          const u = event.user;
          if (typeof u.email === "string") {
            (u as Record<string, unknown>).emailHash = pseudonymize(u.email);
            delete u.email;
          }
          if (typeof u.ip_address === "string" && u.ip_address !== "{{auto}}") {
            // Truncar IP (igual que web). IPv4 → /24; IPv6 → /48.
            u.ip_address = truncateIp(u.ip_address);
          }
        }
      } catch (e) {
        // Fail-open: log y dejar pasar el evento sin sanitizar.
         
        console.warn("[sentry] beforeSend sanitize failed:", e);
      }
      return event;
    },
  });
  sentryActive = true;
}

/**
 * Trunca una dirección IP a /24 (IPv4) o /48 (IPv6) — patrón equivalente
 * al `truncateIP` del web. Reduce la granularidad geográfica a "barrio /
 * carrier" en lugar de identificar al device.
 */
function truncateIp(ip: string): string {
  if (ip.includes(":")) {
    // IPv6 → primeros 3 grupos hexadecimales + "::" (≈ /48).
    const parts = ip.split(":");
    return parts.slice(0, 3).join(":") + "::";
  }
  // IPv4 → primeros 3 octetos + ".0".
  const parts = ip.split(".");
  if (parts.length === 4) return parts.slice(0, 3).join(".") + ".0";
  return ip;
}

// ─── Public API: capture* helpers ───────────────────────────────────────────

/**
 * Captura un Error en Sentry con sanitización de `extra`. Si Sentry no está
 * activo (DSN vacío), NO-OP — no lanza.
 */
export function captureExceptionSafe(
  error: unknown,
  options: { extra?: Record<string, unknown>; tags?: Record<string, string> } = {},
): void {
  if (!sentryActive) return;
  try {
    getSentry().captureException(error, {
      extra: options.extra
        ? (sanitize(options.extra) as Record<string, unknown>)
        : undefined,
      tags: options.tags,
    });
  } catch (e) {
    // Defensa contra crash dentro de Sentry: el error original no debe
    // perderse. Log a console (visible en Metro / device logs).
     
    console.warn("[sentry] captureException failed:", e, "original:", error);
  }
}

/**
 * Captura un mensaje arbitrario (info / warning) con sanitización.
 */
export function captureMessageSafe(
  message: string,
  options: {
    level?: "info" | "warning" | "error";
    extra?: Record<string, unknown>;
    tags?: Record<string, string>;
  } = {},
): void {
  if (!sentryActive) return;
  try {
    getSentry().captureMessage(message, {
      level: options.level ?? "info",
      extra: options.extra
        ? (sanitize(options.extra) as Record<string, unknown>)
        : undefined,
      tags: options.tags,
    });
  } catch (e) {
     
    console.warn("[sentry] captureMessage failed:", e);
  }
}

// ─── Test-only exports ──────────────────────────────────────────────────────
//
// Sólo expuestos para que jest pueda testar la lógica de sanitización sin
// tocar `@sentry/react-native`. NO usar en código de producción.

export const __test_internals__ = {
  pseudonymize,
  sanitize,
  truncateIp,
};

/** Resetea el flag `sentryActive` entre tests. NO usar en producción. */
export function __resetSentryForTests__(): void {
  sentryActive = false;
}

/**
 * Re-export `Sentry.wrap` evitando el `import * as` que rompe con jest mock
 * (ver comentario al inicio del archivo). Usar en `app/_layout.tsx`:
 *
 *   export default sentryWrap(RootLayout);
 *
 * Si Sentry no está inicializado (DSN vacío), `wrap` retorna el componente
 * tal cual sin error boundary — comportamiento idéntico al SDK oficial.
 */
export const sentryWrap: SentryRN["wrap"] = ((Component: unknown) => {
  return getSentry().wrap(Component as never);
}) as SentryRN["wrap"];
