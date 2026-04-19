"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCLP } from "@/lib/utils";

export interface VentasPorDia {
  /** ISO date (YYYY-MM-DD), zona Chile */
  fecha: string;
  /** Etiqueta corta del eje X (ej. "Lun 14") */
  etiqueta: string;
  /** Total CLP del día */
  total: number;
  /** Cantidad de ventas del día */
  cantidad: number;
}

export interface VentasChartProps {
  data: VentasPorDia[];
}

interface ChartDatum {
  fecha: string;
  etiqueta: string;
  total: number;
  cantidad: number;
}

function TooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDatum }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0]!.payload;
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{d.etiqueta}</p>
      <p className="text-muted-foreground">
        {d.cantidad} {d.cantidad === 1 ? "venta" : "ventas"}
      </p>
      <p className="mt-0.5 tabular-nums font-semibold">{formatCLP(d.total)}</p>
    </div>
  );
}

function formatCompactCLP(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${v}`;
}

export function VentasChart({ data }: VentasChartProps) {
  const totalPeriodo = data.reduce((a, d) => a + d.total, 0);
  const ventasPeriodo = data.reduce((a, d) => a + d.cantidad, 0);
  const hayDatos = data.some((d) => d.total > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ventas últimos 7 días</CardTitle>
        <CardDescription>
          {ventasPeriodo} {ventasPeriodo === 1 ? "venta" : "ventas"} · Total:{" "}
          <span className="font-medium tabular-nums text-foreground">
            {formatCLP(totalPeriodo)}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hayDatos ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="ventasBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--primary)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--primary)"
                      stopOpacity={0.2}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                  vertical={false}
                />
                <XAxis
                  dataKey="etiqueta"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={formatCompactCLP}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                />
                <Tooltip
                  content={<TooltipContent />}
                  cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                />
                <Bar
                  dataKey="total"
                  fill="url(#ventasBarGradient)"
                  radius={[6, 6, 0, 0]}
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-72 items-center justify-center rounded-md border border-dashed bg-muted/10 text-sm text-muted-foreground">
            Aún no hay ventas registradas en los últimos 7 días.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
