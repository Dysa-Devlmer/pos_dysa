import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Web-only: combinar Tailwind classes con merge de conflictos.
 * No se mueve a @repo/domain porque RN no usa Tailwind string classes.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─────────────────────────────────────────────────────────────────────────────
// Lógica de negocio compartida web + mobile — viven en @repo/domain.
// Se re-exportan desde acá para preservar el import path histórico
// (`@/lib/utils`) sin romper los ~30 callsites del web.
// Ver gotcha G-M11 en memory/projects/pos-chile-mobile.md.
// ─────────────────────────────────────────────────────────────────────────────
export {
  formatCLP,
  calcularIVA,
  calcularDesglose,
  validarRUT,
  formatRUT,
} from "@repo/domain";

export type { DesgloseVenta } from "@repo/domain";
