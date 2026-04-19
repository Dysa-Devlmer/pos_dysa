import * as Sentry from "@sentry/nextjs";

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
});
