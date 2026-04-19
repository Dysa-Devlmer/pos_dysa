// Placeholders conocidos que NUNCA deben pasar como secret en producción.
// Cada entry puede ser substring o regex — ambos se matchean.
const INVALID_SECRET_PATTERNS: readonly (string | RegExp)[] = [
  "cambiar",
  "generar-con-openssl-rand-base64-32",
  "CAMBIAR_generar_con_openssl",
  "your-secret-here",
  "changeme",
  /^(test|demo|example|placeholder)[-_]?secret$/i,
];

function matchesInvalidPattern(secret: string): string | null {
  for (const pattern of INVALID_SECRET_PATTERNS) {
    if (typeof pattern === "string") {
      if (secret.toLowerCase().includes(pattern.toLowerCase())) {
        return pattern;
      }
    } else if (pattern.test(secret)) {
      return pattern.source;
    }
  }
  return null;
}

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

  const matched = matchesInvalidPattern(secret);
  if (matched) {
    throw new Error(
      `NEXTAUTH_SECRET contiene el placeholder "${matched}" — es un valor por defecto inseguro. ` +
      "Genera uno nuevo con: openssl rand -base64 32"
    );
  }

  // Longitud mínima sugerida (base64 de 32 bytes ≈ 44 caracteres)
  if (secret.length < 32) {
    throw new Error(
      `NEXTAUTH_SECRET demasiado corta (${secret.length} caracteres). ` +
      "Mínimo recomendado: 32. Genera con: openssl rand -base64 32"
    );
  }
}
