"use client";

import * as React from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

import { cn } from "@/lib/utils";

export interface SparklineProps {
  /** Serie numérica ordenada cronológicamente (más viejo → más reciente). */
  data: number[];
  /** Color base (default: var(--primary)). Acepta cualquier CSS color. */
  color?: string;
  /** Tono del gradient: "positive" → emerald, "negative" → red. Default primary. */
  tone?: "primary" | "positive" | "negative";
  className?: string;
  /** Altura en px (default 36). */
  height?: number;
}

/**
 * Micro-chart de área usado dentro de KPI cards. Renderiza solo la línea + fill
 * gradient, sin ejes ni tooltip. Optimizado para lecturas rápidas.
 */
export function Sparkline({
  data,
  color,
  tone = "primary",
  className,
  height = 36,
}: SparklineProps) {
  const id = React.useId();
  const gradientId = `sparkline-gradient-${id.replace(/:/g, "-")}`;

  const strokeColor =
    color ??
    (tone === "positive"
      ? "rgb(16 185 129)" /* emerald-500 */
      : tone === "negative"
        ? "rgb(239 68 68)" /* red-500 */
        : "var(--primary)");

  // Recharts necesita objetos con una key. Creamos un wrapper mínimo.
  const series = data.map((v, i) => ({ i, v }));

  // Padding pequeño para que la línea no pegue al borde top/bottom.
  const values = data.length ? data : [0];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const domain: [number, number] =
    max === min ? [min - 1, max + 1] : [min - (max - min) * 0.1, max + (max - min) * 0.1];

  return (
    <div className={cn("w-full", className)} style={{ height }} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={strokeColor}
            strokeWidth={1.75}
            fill={`url(#${gradientId})`}
            isAnimationActive={true}
            animationDuration={900}
            dot={false}
            activeDot={false}
            {...{ yAxisDomain: domain }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
