"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarDays,
  ReceiptText,
  Users,
} from "lucide-react";

import { CounterUp } from "@/components/counter-up";
import { Sparkline } from "@/components/sparkline";
import { TrendIndicator } from "@/components/trend-indicator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SOFT_BADGE } from "@/lib/badge-styles";
import { formatCLP } from "@/lib/utils";

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

export interface DashboardStatsProps {
  ventasHoy: { cantidad: number; total: number; totalAnterior: number };
  ventasMes: { cantidad: number; total: number; totalAnterior: number };
  stockBajo: { cantidad: number; umbral: number | null };
  clientes: { total: number; nuevos30d: number };
  /** Serie últimos 7 días (totales diarios) para sparklines. */
  sparkSerie: number[];
}

// ──────────────────────────────────────────────────────────────────────────
// KPI card con sparkline + counter + trend
// ──────────────────────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  icon: React.ReactNode;
  value: number;
  format?: (v: number) => string;
  footer?: React.ReactNode;
  sparkData?: number[];
  sparkTone?: "primary" | "positive" | "negative";
  accentBorder?: boolean;
}

function KpiCard({
  title,
  icon,
  value,
  format,
  footer,
  sparkData,
  sparkTone = "primary",
  accentBorder = false,
}: KpiCardProps) {
  const formatter = format ?? ((v: number) => Math.round(v).toLocaleString("es-CL"));
  return (
    <motion.div variants={itemVariants} className="h-full">
    <Card
      className={`relative h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-[var(--chart-1)]/40 group ${
        accentBorder ? "border-destructive/40" : ""
      }`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--chart-1)]/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="pb-4">
        <p className="text-2xl font-bold tabular-nums">
          <CounterUp value={value} format={formatter} />
        </p>
        {footer ? <div className="mt-1">{footer}</div> : null}
        {sparkData && sparkData.length > 0 ? (
          <div className="mt-3 -mx-1">
            <Sparkline data={sparkData} tone={sparkTone} height={36} />
          </div>
        ) : null}
      </CardContent>
    </Card>
    </motion.div>
  );
}

export function DashboardStats({
  ventasHoy,
  ventasMes,
  stockBajo,
  clientes,
  sparkSerie,
}: DashboardStatsProps) {
  const ticketPromMes =
    ventasMes.cantidad > 0
      ? Math.round(ventasMes.total / ventasMes.cantidad)
      : 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {/* Ventas hoy */}
      <KpiCard
        title="Ventas hoy"
        icon={<ReceiptText className="size-4 text-muted-foreground" />}
        value={ventasHoy.total}
        format={(v) => formatCLP(Math.round(v))}
        footer={
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              {ventasHoy.cantidad}{" "}
              {ventasHoy.cantidad === 1 ? "venta" : "ventas"}
            </p>
            <TrendIndicator
              current={ventasHoy.total}
              previous={ventasHoy.totalAnterior}
              label="vs ayer"
            />
          </div>
        }
        sparkData={sparkSerie}
        sparkTone="primary"
      />

      {/* Ventas mes */}
      <KpiCard
        title="Ventas este mes"
        icon={<CalendarDays className="size-4 text-muted-foreground" />}
        value={ventasMes.total}
        format={(v) => formatCLP(Math.round(v))}
        footer={
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              Ticket prom. {formatCLP(ticketPromMes)}
            </p>
            <TrendIndicator
              current={ventasMes.total}
              previous={ventasMes.totalAnterior}
              label="vs mes ant."
            />
          </div>
        }
        sparkData={sparkSerie}
        sparkTone="positive"
      />

      {/* Stock bajo */}
      <KpiCard
        title="Stock bajo"
        icon={
          <AlertTriangle
            className={
              stockBajo.cantidad > 0
                ? "size-4 text-destructive"
                : "size-4 text-muted-foreground"
            }
          />
        }
        value={stockBajo.cantidad}
        footer={
          <div className="flex items-center gap-2">
            {stockBajo.cantidad > 0 ? (
              <Badge variant="outline" className={`h-5 ${SOFT_BADGE.destructive}`}>
                Revisar
              </Badge>
            ) : (
              <Badge variant="outline" className={`h-5 ${SOFT_BADGE.success}`}>
                OK
              </Badge>
            )}
            <p className="text-xs text-muted-foreground">
              {stockBajo.umbral !== null
                ? `bajo ${stockBajo.umbral}`
                : "bajo umbral"}
            </p>
          </div>
        }
        accentBorder={stockBajo.cantidad > 0}
      />

      {/* Clientes */}
      <KpiCard
        title="Clientes registrados"
        icon={<Users className="size-4 text-muted-foreground" />}
        value={clientes.total}
        footer={
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              {clientes.total === 1 ? "cliente activo" : "clientes activos"}
            </p>
            {clientes.nuevos30d > 0 ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                +{clientes.nuevos30d} · 30d
              </span>
            ) : null}
          </div>
        }
      />
    </motion.div>
  );
}
