// Utilidades compartidas para rangos de fechas de reportes (zona Chile).

export const CHILE_TZ = "America/Santiago";

/** YYYY-MM-DD del día "ahora" en zona Chile. */
export function hoyChileISODate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CHILE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** YYYY-MM-01 del mes actual en zona Chile. */
export function primeroDelMesChileISODate(): string {
  const hoy = hoyChileISODate(); // "2026-04-16"
  return `${hoy.slice(0, 7)}-01`;
}

/**
 * Offset actual del huso America/Santiago, en minutos desde UTC.
 * Chile usa UTC-4 (verano) o UTC-3 (invierno). El resultado siempre
 * es negativo (-240 o -180).
 */
function offsetChileMin(atUTC: Date): number {
  const tzDate = new Date(
    atUTC.toLocaleString("en-US", { timeZone: CHILE_TZ }),
  );
  const utcDate = new Date(
    atUTC.toLocaleString("en-US", { timeZone: "UTC" }),
  );
  return (tzDate.getTime() - utcDate.getTime()) / 60_000;
}

/** "±HH:MM" dado offset en minutos. */
function offsetToISO(minutes: number): string {
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${sign}${hh}:${mm}`;
}

/**
 * Convierte "YYYY-MM-DD" (Chile) a Date UTC representando el inicio del día
 * (00:00) en zona Chile.
 */
export function inicioDelDiaChile(ymd: string): Date {
  const probe = new Date(`${ymd}T12:00:00Z`);
  const off = offsetChileMin(probe);
  return new Date(`${ymd}T00:00:00${offsetToISO(off)}`);
}

/**
 * Convierte "YYYY-MM-DD" (Chile) a Date UTC representando el fin del día
 * (23:59:59.999) en zona Chile.
 */
export function finDelDiaChile(ymd: string): Date {
  const probe = new Date(`${ymd}T12:00:00Z`);
  const off = offsetChileMin(probe);
  return new Date(`${ymd}T23:59:59.999${offsetToISO(off)}`);
}

/** Valida formato YYYY-MM-DD. */
export function esFechaYMD(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/**
 * Extrae y normaliza ?desde=&hasta= de una URL.
 * - Si faltan → default: desde = primero del mes, hasta = hoy (Chile).
 * - Si formato inválido → throw.
 */
export function parseRangoDesdeURL(url: URL): {
  desdeYMD: string;
  hastaYMD: string;
  desde: Date;
  hasta: Date;
} {
  const d = url.searchParams.get("desde");
  const h = url.searchParams.get("hasta");

  const desdeYMD = d && esFechaYMD(d) ? d : primeroDelMesChileISODate();
  const hastaYMD = h && esFechaYMD(h) ? h : hoyChileISODate();

  if (d && !esFechaYMD(d)) throw new Error("Parámetro 'desde' inválido");
  if (h && !esFechaYMD(h)) throw new Error("Parámetro 'hasta' inválido");

  return {
    desdeYMD,
    hastaYMD,
    desde: inicioDelDiaChile(desdeYMD),
    hasta: finDelDiaChile(hastaYMD),
  };
}

/** Formato CLP sin Intl (determinista en PDF): "$1.234" */
export function formatCLPPlain(amount: number): string {
  const n = Math.round(amount);
  const s = Math.abs(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (n < 0 ? "-$" : "$") + s;
}
