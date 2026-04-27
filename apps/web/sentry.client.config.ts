import * as Sentry from "@sentry/nextjs";

import { truncateIP } from "@/lib/privacy-edge";

/**
 * Sentry runtime cliente (browser). Carga via `instrumentation-client.ts`
 * en Next 15 (Turbopack) o auto-detect del SDK.
 *
 * Mismo beforeSend que server/edge — Ley 21.719: cero PII cruda a 3rd party.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // No replay session por default — costo + privacidad. Habilitarlo solo
  // si se contrata el plan y se anonimiza el screen content.
  replaysOnErrorSampleRate: 0,
  replaysSessionSampleRate: 0,

  sendDefaultPii: false,

  beforeSend(event) {
    if (event.user) {
      // Browser: redactar email directo (no node:crypto disponible).
      if (event.user.email) {
        event.user.email = "(redacted-client)";
      }
      if (event.user.ip_address && event.user.ip_address !== "{{auto}}") {
        event.user.ip_address = truncateIP(event.user.ip_address) ?? undefined;
      }
    }
    if (event.request?.headers) {
      const headers = event.request.headers as Record<string, string>;
      for (const key of Object.keys(headers)) {
        const lower = key.toLowerCase();
        if (lower === "cookie" || lower === "authorization") {
          headers[key] = "(redacted)";
        }
      }
    }
    return event;
  },
});
