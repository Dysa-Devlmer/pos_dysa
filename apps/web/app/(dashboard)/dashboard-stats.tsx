"use client";

import {
  AlertTriangle,
  CalendarDays,
  ReceiptText,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCLP } from "@/lib/utils";

export interface DashboardStatsProps {
  ventasHoy: { cantidad: number; total: number };
  ventasMes: { cantidad: number; total: number };
  stockBajo: { cantidad: number; umbral: number };
  totalClientes: number;
}

export function DashboardStats({
  ventasHoy,
  ventasMes,
  stockBajo,
  totalClientes,
}: DashboardStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* Ventas hoy */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Ventas hoy
          </CardTitle>
          <ReceiptText className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold tabular-nums">
            {formatCLP(ventasHoy.total)}
          </p>
          <p className="text-xs text-muted-foreground">
            {ventasHoy.cantidad} {ventasHoy.cantidad === 1 ? "venta" : "ventas"}
          </p>
        </CardContent>
      </Card>

      {/* Ventas mes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Ventas este mes
          </CardTitle>
          <CalendarDays className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold tabular-nums">
            {formatCLP(ventasMes.total)}
          </p>
          <p className="text-xs text-muted-foreground">
            {ventasMes.cantidad} {ventasMes.cantidad === 1 ? "venta" : "ventas"}{" "}
            · ticket prom.{" "}
            {ventasMes.cantidad > 0
              ? formatCLP(Math.round(ventasMes.total / ventasMes.cantidad))
              : formatCLP(0)}
          </p>
        </CardContent>
      </Card>

      {/* Stock bajo */}
      <Card className={stockBajo.cantidad > 0 ? "border-destructive/40" : ""}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Stock bajo
          </CardTitle>
          <AlertTriangle
            className={
              stockBajo.cantidad > 0
                ? "size-4 text-destructive"
                : "size-4 text-muted-foreground"
            }
          />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold tabular-nums">
              {stockBajo.cantidad}
            </p>
            {stockBajo.cantidad > 0 ? (
              <Badge variant="destructive">Revisar</Badge>
            ) : (
              <Badge variant="secondary">OK</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            productos con stock menor a {stockBajo.umbral}
          </p>
        </CardContent>
      </Card>

      {/* Clientes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Clientes registrados
          </CardTitle>
          <Users className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold tabular-nums">{totalClientes}</p>
          <p className="text-xs text-muted-foreground">
            {totalClientes === 1 ? "cliente activo" : "clientes activos"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
