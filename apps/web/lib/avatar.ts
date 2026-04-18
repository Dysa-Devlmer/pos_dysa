// Helpers para avatares (iniciales + color determinista desde el nombre)

const PALETTE = [
  "from-rose-500 to-pink-500",
  "from-orange-500 to-amber-500",
  "from-yellow-500 to-lime-500",
  "from-emerald-500 to-teal-500",
  "from-sky-500 to-blue-500",
  "from-indigo-500 to-violet-500",
  "from-fuchsia-500 to-purple-500",
  "from-red-500 to-rose-600",
  "from-cyan-500 to-sky-600",
  "from-green-500 to-emerald-600",
] as const;

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** Devuelve iniciales (máx 2) del nombre. "Juan Pérez" → "JP" */
export function inicialesDe(nombre: string | null | undefined): string {
  const n = (nombre ?? "").trim();
  if (!n) return "?";
  const partes = n.split(/\s+/).filter(Boolean);
  if (partes.length === 1) return partes[0]!.slice(0, 2).toUpperCase();
  return (
    (partes[0]!.charAt(0) + partes[partes.length - 1]!.charAt(0)).toUpperCase()
  );
}

/** Clase Tailwind gradient determinista para el nombre dado. */
export function gradientePorNombre(nombre: string | null | undefined): string {
  const n = (nombre ?? "").trim() || "default";
  const idx = hashString(n) % PALETTE.length;
  return PALETTE[idx]!;
}
