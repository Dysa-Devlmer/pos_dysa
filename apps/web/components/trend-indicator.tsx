"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

export interface TrendIndicatorProps {
  /** Valor actual. */
  current: number;
  /** Valor del período previo (base de comparación). */
  previous: number;
  /**
   * Si true, invierte la semántica: subir es malo (ej. tasa de error, stock bajo).
   * Por defecto false — subir es bueno.
   */
  invert?: boolean;
  /** Etiqueta del período anterior (ej. "vs ayer", "vs mes anterior"). */
  label?: string;
  className?: string;
}

/**
 * Cálculo del %: ((current - previous) / max(previous, 1)) * 100
 * · Si previous === 0 y current > 0 → "Nuevo" (sin %)
 * · Si ambos === 0 → "Sin cambio"
 */
export function TrendIndicator({
  current,
  previous,
  invert = false,
  label,
  className,
}: TrendIndicatorProps) {
  const iguales = current === previous;
  const neutro = current === 0 && previous === 0;

  // Casos borde
  if (neutro) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium text-muted-foreground",
          className,
        )}
      >
        <Minus className="size-3" aria-hidden />
        <span>Sin datos</span>
        {label ? (
          <span className="text-[10px] font-normal text-muted-foreground/80">
            {label}
          </span>
        ) : null}
      </div>
    );
  }

  if (previous === 0 && current > 0) {
    const esBueno = invert ? false : true;
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium",
          esBueno
            ? "text-emerald-700 dark:text-emerald-400"
            : "text-red-700 dark:text-red-400",
          className,
        )}
      >
        <ArrowUpRight className="size-3" aria-hidden />
        <span>Nuevo</span>
        {label ? (
          <span className="text-[10px] font-normal text-muted-foreground">
            {label}
          </span>
        ) : null}
      </div>
    );
  }

  const diff = current - previous;
  const pct = (diff / Math.max(Math.abs(previous), 1)) * 100;
  const pctFmt = `${pct > 0 ? "+" : ""}${pct.toFixed(pct > -10 && pct < 10 ? 1 : 0)}%`;

  // Semántica del color
  const subiendo = diff > 0;
  const bueno = invert ? !subiendo : subiendo;
  const Icon = iguales ? Minus : subiendo ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium tabular-nums",
        iguales
          ? "text-muted-foreground"
          : bueno
            ? "text-emerald-700 dark:text-emerald-400"
            : "text-red-700 dark:text-red-400",
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      <span>{iguales ? "0%" : pctFmt}</span>
      {label ? (
        <span className="text-[10px] font-normal text-muted-foreground">
          {label}
        </span>
      ) : null}
    </div>
  );
}
