import { createHash } from "node:crypto";

/**
 * Helper de pseudonimización para PII en logs, telemetría, analytics.
 *
 * Convierte un identificador sensible (RUT, email, IP) en un hash estable
 * de 16 caracteres hex. Misma entrada → mismo hash (permite correlacionar
 * eventos del mismo usuario en Sentry/PostHog sin saber quién es).
 * No invertible sin el salt.
 *
 * Uso canónico:
 * ```ts
 * import { pseudonymize } from "@/lib/privacy";
 *
 * Sentry.captureException(err, {
 *   extra: {
 *     clienteHash: pseudonymize(cliente.rut),  // ✓ seguro
 *     // rut: cliente.rut                      // ✗ PII cruda a 3rd party
 *   },
 * });
 * ```
 *
 * Reglas operativas:
 * - Rotar `PII_LOG_SALT` anualmente (o antes si hay breach). Al rotar,
 *   hashes anteriores pierden correlación — aceptable en exchange por
 *   defensa-en-profundidad.
 * - Nunca usar este hash como PK en la DB. Es para logs/telemetría solamente.
 * - En dev sin salt → usa fallback determinístico pero inseguro; en prod
 *   (NODE_ENV=production) el módulo falla si falta el salt.
 *
 * Alineado con `packages/db/prisma/schema.prisma` y la política de PII
 * documentada en `.claude/skills/privacy-compliance/SKILL.md`.
 */

// En producción, la ausencia de salt es un error crítico — no queremos que
// logs se escriban con salt dev leakeable. Validación en lazy-init para no
// romper build de rutas que no importan este módulo.
// NOTA: leemos `process.env.PII_LOG_SALT` en cada llamada (no a nivel módulo)
// para permitir rotación en caliente sin reiniciar el runtime, y para que los
// tests puedan inyectar salts distintos via mutación de `process.env`.
function getSalt(): string {
  const salt = process.env.PII_LOG_SALT;
  if (!salt) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "PII_LOG_SALT es requerido en producción — configurar en .env.docker antes de deploy.",
      );
    }
    // Dev fallback — marcado explícitamente como no-prod para que cualquier
    // filtro de code review lo detecte.
    return "dev-salt-NOT-FOR-PROD-pos-chile";
  }
  return salt;
}

/**
 * Hashea un valor con el salt de logs. Devuelve 16 chars hex (8 bytes).
 *
 * Null/undefined/empty → null (evita emitir hash de cadena vacía).
 */
export function pseudonymize(value: string | null | undefined): string | null {
  if (!value) return null;
  const salt = getSalt();
  return createHash("sha256").update(salt + value).digest("hex").slice(0, 16);
}

/**
 * Versión que acepta objetos y pseudonimiza las keys marcadas como PII.
 * Útil para sanear `extra` de Sentry de una sola vez.
 *
 * @example
 * Sentry.captureException(err, {
 *   extra: scrubPII({ rut: cliente.rut, action: "deleteVenta" }, ["rut"]),
 * });
 * // → { rut: "a3f2...", action: "deleteVenta" }  (action queda intacto)
 */
export function scrubPII<T extends Record<string, unknown>>(
  obj: T,
  piiKeys: readonly (keyof T)[],
): T {
  const result = { ...obj };
  for (const key of piiKeys) {
    const value = result[key];
    if (typeof value === "string" && value.length > 0) {
      result[key] = pseudonymize(value) as T[typeof key];
    }
  }
  return result;
}

/**
 * Trunca una IP a /24 (IPv4) o /48 (IPv6) — granularidad ≈ ISP/sitio.
 * Suficiente para detectar abuso sin identificar dispositivo individual.
 *
 * Uso canónico: antes de enviar a Sentry / analytics 3rd party.
 *
 * @example
 * truncateIP("190.110.45.123")  // → "190.110.45.0"
 * truncateIP("2001:db8::1")     // → "2001:db8:0::"
 * truncateIP("not an ip")       // → null
 */
export function truncateIP(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const trimmed = ip.trim();
  if (!trimmed) return null;

  const v4Match = trimmed.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.\d{1,3}$/);
  if (v4Match) {
    const [, a, b, c] = v4Match;
    if ([a, b, c].every((o) => Number(o) >= 0 && Number(o) <= 255)) {
      return `${a}.${b}.${c}.0`;
    }
    return null;
  }

  if (trimmed.includes(":")) {
    const expanded = trimmed.includes("::") ? expandIPv6(trimmed) : trimmed;
    if (!expanded) return null;
    const hextets = expanded.split(":");
    if (hextets.length !== 8) return null;
    return `${hextets.slice(0, 3).join(":")}::`;
  }

  return null;
}

function expandIPv6(addr: string): string | null {
  const parts = addr.split("::");
  if (parts.length > 2) return null;
  const left = parts[0] ? parts[0].split(":") : [];
  const right = parts[1] ? parts[1].split(":") : [];
  const missing = 8 - (left.length + right.length);
  if (missing < 0) return null;
  const middle = Array(missing).fill("0");
  return [...left, ...middle, ...right].join(":");
}
