// Edge-safe subset de privacy.ts. NO usa node:crypto → seguro para
// sentry.edge.config.ts y middleware.ts. Solo expone truncateIP, que
// hace pattern matching puro y no necesita hashing.
//
// Para pseudonimizar emails/RUTs en eventos del edge runtime, redactar
// directamente o capturar el evento desde server.config (donde sí hay
// node:crypto disponible).

/**
 * Trunca una IP a /24 (IPv4) o /48 (IPv6) — granularidad ≈ ISP/sitio.
 * Idéntica semántica que `lib/privacy.ts#truncateIP`, separada solo
 * para evitar arrastrar `node:crypto` al edge bundle.
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
