import * as Sentry from "@sentry/nextjs";

import { pseudonymize, truncateIP } from "@/lib/privacy";

// Si SENTRY_DSN no está definida, Sentry se auto-desactiva (no-op).
// En producción real, setea SENTRY_DSN en el env y todo empieza a reportarse.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Performance: 10% de transacciones en prod, 100% en dev.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // PII: no enviar IP ni user-agent automáticamente.
  // Los datos sensibles se añaden manualmente vía Sentry.captureMessage({ extra }).
  sendDefaultPii: false,

  /**
   * Defensa en profundidad — Ley 21.719 + skill privacy-compliance.
   * Aunque los callsites usan `lib/sentry-helpers.ts` (pseudonimización
   * explícita), este `beforeSend` cubre paths que se nos escapen:
   *  - Errores no-instrumentados auto-capturados
   *  - Breadcrumbs (request URLs, console.log)
   *  - `event.user` seteado por @sentry/nextjs cuando hay session
   *  - Headers `x-forwarded-for`/`x-real-ip` si sendDefaultPii flippea
   */
  beforeSend(event) {
    if (event.user) {
      if (event.user.email) {
        event.user.email = pseudonymize(event.user.email) ?? undefined;
      }
      if (event.user.ip_address && event.user.ip_address !== "{{auto}}") {
        event.user.ip_address = truncateIP(event.user.ip_address) ?? undefined;
      }
    }

    if (event.request?.headers) {
      const headers = event.request.headers as Record<string, string>;
      for (const key of Object.keys(headers)) {
        const lower = key.toLowerCase();
        if (lower === "x-forwarded-for" || lower === "x-real-ip") {
          headers[key] = truncateIP(headers[key]) ?? "(invalid)";
        }
        if (lower === "cookie" || lower === "authorization") {
          headers[key] = "(redacted)";
        }
      }
    }

    return event;
  },
});
