// Estilos soft-badge (tintados con /15 opacity) estandarizados en toda la app.
// Reemplazan los badges sólidos de fases anteriores (bg-*-100 text-*-900 border-*-200)
// por el pattern tintado moderno con buen contraste en light/dark.

import type { MetodoPago, Rol } from "@repo/db";

// ─── Tokens base por intento (success/warning/info/destructive/muted) ─────
export const SOFT_BADGE = {
  success:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-transparent",
  warning:
    "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-transparent",
  info: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-transparent",
  destructive:
    "bg-red-500/15 text-red-700 dark:text-red-400 border-transparent",
  muted:
    "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-transparent",
  violet:
    "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-transparent",
} as const;

// ─── Método de pago ───────────────────────────────────────────────────────
export const METODO_PAGO_BADGE: Record<MetodoPago, string> = {
  EFECTIVO: SOFT_BADGE.success,
  DEBITO: SOFT_BADGE.info,
  CREDITO: SOFT_BADGE.violet,
  TRANSFERENCIA: SOFT_BADGE.warning,
};

// ─── Rol de usuario ───────────────────────────────────────────────────────
export const ROL_BADGE: Record<Rol, string> = {
  ADMIN: SOFT_BADGE.violet,
  CAJERO: SOFT_BADGE.info,
  VENDEDOR: SOFT_BADGE.success,
};

// ─── Estado activo/inactivo genérico ──────────────────────────────────────
export function estadoBadge(activo: boolean): string {
  return activo ? SOFT_BADGE.success : SOFT_BADGE.muted;
}

// ─── Stock (derivado del stock vs alertaStock) ────────────────────────────
export function stockBadge(
  stock: number,
  alertaStock: number,
): { variant: "destructive" | "warning" | null; className: string } {
  if (stock <= 0) return { variant: "destructive", className: SOFT_BADGE.destructive };
  if (stock <= alertaStock)
    return { variant: "warning", className: SOFT_BADGE.warning };
  return { variant: null, className: "" };
}

// ─── Tipo de devolución ───────────────────────────────────────────────────
export function devolucionBadge(esTotal: boolean): string {
  return esTotal ? SOFT_BADGE.destructive : SOFT_BADGE.warning;
}
