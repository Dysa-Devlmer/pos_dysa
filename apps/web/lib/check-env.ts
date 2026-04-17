export function checkEnv() {
  // Solo validar en runtime de producción, no durante build
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error(
      "NEXTAUTH_SECRET no definida en producción. " +
      "Genera con: openssl rand -base64 32"
    );
  }
  if (secret.includes("cambiar")) {
    throw new Error(
      "NEXTAUTH_SECRET contiene 'cambiar' — es el valor por defecto. " +
      "Genera uno nuevo con: openssl rand -base64 32"
    );
  }
}
