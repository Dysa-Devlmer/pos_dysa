import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * KpiCard — Fase 2C UX polish.
 *
 * Card de KPI operacional para tops de tablas (ventas, devoluciones,
 * clientes, etc.). Server Component puro.
 *
 * Reemplaza dos patrones que coexistían en la app pre-2C:
 *   - `/devoluciones`: <Card><CardHeader><CardTitle>...</></><CardContent>...
 *     Card-en-Card visualmente pesado.
 *   - `/ventas`: <div className="rounded-md border bg-background p-3">...
 *     Hand-rolled, sin tone, sin tabular alignment formal.
 *
 * Densidad operacional, no decorativa: padding compacto, label uppercase
 * pequeño, value tabular, sublabel discreto. Tone opcional para casos
 * especiales (amber en devoluciones).
 */

type Tone = "default" | "amber" | "destructive" | "success" | "warning";

const TONE_VALUE_CLASSES: Record<Tone, string> = {
  default: "text-foreground",
  amber: "text-amber-700 dark:text-amber-400",
  destructive: "text-destructive",
  success: "text-emerald-700 dark:text-emerald-400",
  // warning ≠ amber: warning indica acción reversible (retiros, neutral con
  // signo); amber indica atención persistente (devoluciones, banners).
  warning: "text-orange-700 dark:text-orange-400",
};

export interface KpiCardProps {
  label: React.ReactNode;
  /** Valor primario — string o number ya formateado. */
  value: React.ReactNode;
  /** Línea pequeña debajo (ej. "12 de hoy", "CLP IVA incluido"). */
  sublabel?: React.ReactNode;
  /** Color del valor. Default = foreground. */
  tone?: Tone;
  className?: string;
}

export function KpiCard({
  label,
  value,
  sublabel,
  tone = "default",
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4 shadow-sm",
        className,
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold tabular-nums leading-tight",
          TONE_VALUE_CLASSES[tone],
        )}
      >
        {value}
      </p>
      {sublabel ? (
        <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>
      ) : null}
    </div>
  );
}
