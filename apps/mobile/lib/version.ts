/**
 * Utilidades de versionado semántico (semver) para el update checker mobile.
 *
 * Mantenemos una implementación mínima inline en vez de agregar una dependencia
 * (`semver` pesa ~50KB en el bundle JS). Solo necesitamos comparar 3 segmentos
 * enteros — no pre-releases, no build metadata, no rangos.
 *
 * Si en el futuro usamos versiones tipo "1.0.0-beta.2", migrar a npm:semver.
 */

/**
 * Parsea "1.2.3" → [1, 2, 3]. Lanza error si no matchea el formato.
 */
function parseVersion(v: string): [number, number, number] {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(v.trim());
  if (!match) {
    throw new Error(`Versión inválida (se esperaba X.Y.Z): "${v}"`);
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/**
 * Compara dos versiones semver. Devuelve:
 *   < 0  si a < b  (a es más vieja)
 *     0  si a === b
 *   > 0  si a > b  (a es más nueva)
 *
 * Si alguna versión es inválida, devuelve 0 (fail-safe: asumir igual = no update).
 */
export function compareVersions(a: string, b: string): number {
  try {
    const [aMajor, aMinor, aPatch] = parseVersion(a);
    const [bMajor, bMinor, bPatch] = parseVersion(b);
    if (aMajor !== bMajor) return aMajor - bMajor;
    if (aMinor !== bMinor) return aMinor - bMinor;
    return aPatch - bPatch;
  } catch {
    return 0;
  }
}

/**
 * `true` si `installed` es menor que `available` (hay update disponible).
 */
export function isUpdateAvailable(installed: string, available: string): boolean {
  return compareVersions(installed, available) < 0;
}

/**
 * `true` si `installed` es menor que `minVersion` (update OBLIGATORIO).
 * Si `minVersion` es null/undefined, devuelve false.
 */
export function isForceUpdate(
  installed: string,
  minVersion: string | null | undefined,
): boolean {
  if (!minVersion) return false;
  return compareVersions(installed, minVersion) < 0;
}
