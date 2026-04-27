import * as Sentry from "@sentry/nextjs";
import type { SeverityLevel } from "@sentry/nextjs";

import { pseudonymize, truncateIP } from "@/lib/privacy";

/**
 * Wrapper de Sentry.captureMessage que pseudonimiza PII automáticamente
 * antes de enviar. Defensa en profundidad sobre el `beforeSend` global —
 * si alguien por error pasa email/IP en `extra`, este wrapper lo cubre
 * sin depender solo del hook global.
 *
 * Reemplazo directo de `Sentry.captureMessage(msg, { level, extra })`.
 *
 * Reglas:
 * - `extra.email` → pseudonimizado a hash 16 chars hex
 * - `extra.ip` → truncado a /24 IPv4 o /48 IPv6
 * - `extra.rut`, `extra.telefono` → pseudonimizados
 * - El resto de keys queda intacto
 */
export function captureMessageSafe(
  message: string,
  options: {
    level?: SeverityLevel;
    extra?: Record<string, unknown>;
  } = {},
): void {
  const { level = "info", extra } = options;
  Sentry.captureMessage(message, {
    level,
    extra: extra ? sanitizeExtra(extra) : undefined,
  });
}

/**
 * Wrapper de Sentry.captureException con la misma sanitización.
 */
export function captureExceptionSafe(
  error: unknown,
  options: { extra?: Record<string, unknown> } = {},
): void {
  const { extra } = options;
  Sentry.captureException(error, {
    extra: extra ? sanitizeExtra(extra) : undefined,
  });
}

/**
 * Sanitiza un objeto `extra` aplicando pseudonymize/truncateIP a las
 * keys conocidas como PII. Las keys no listadas pasan tal cual.
 */
function sanitizeExtra(
  extra: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...extra };

  if (typeof out.email === "string" && out.email.length > 0) {
    out.emailHash = pseudonymize(out.email);
    delete out.email;
  }

  if (typeof out.rut === "string" && out.rut.length > 0) {
    out.rutHash = pseudonymize(out.rut);
    delete out.rut;
  }

  if (typeof out.telefono === "string" && out.telefono.length > 0) {
    out.telefonoHash = pseudonymize(out.telefono);
    delete out.telefono;
  }

  if (typeof out.ip === "string" && out.ip.length > 0) {
    out.ipTruncated = truncateIP(out.ip) ?? "(invalid)";
    delete out.ip;
  }

  return out;
}
