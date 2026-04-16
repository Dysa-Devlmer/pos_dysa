"use client";

import Link from "next/link";
import { AlertTriangle, Package, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface TopProductoRow {
  id: number;
  nombre: string;
  categoriaNombre: string;
  ventas: number;
  stock: number;
}

export interface TopProductosProps {
  data: TopProductoRow[];
}

const STOCK_BAJO_UMBRAL = 10;

export function TopProductos({ data }: TopProductosProps) {
  const maxVentas = data.reduce((m, p) => Math.max(m, p.ventas), 0) || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="size-4" />
          Top productos
        </CardTitle>
        <CardDescription>
          Los 5 productos más vendidos (acumulado histórico).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
            <Package className="size-8 opacity-40" />
            Aún no hay ventas registradas.
            <Button asChild size="sm" variant="outline" className="mt-2">
              <Link href="/caja">Ir al POS</Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {data.map((p, idx) => {
              const pct = Math.round((p.ventas / maxVentas) * 100);
              const stockBajo = p.stock < STOCK_BAJO_UMBRAL;
              const sinStock = p.stock <= 0;
              return (
                <li key={p.id} className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold tabular-nums text-primary">
                          {idx + 1}
                        </span>
                        <span className="truncate">{p.nombre}</span>
                      </p>
                      <p className="mt-0.5 flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="text-[10px]">
                          {p.categoriaNombre}
                        </Badge>
                        <span
                          className={
                            sinStock
                              ? "text-destructive"
                              : stockBajo
                                ? "text-amber-600 dark:text-amber-500"
                                : "text-muted-foreground"
                          }
                        >
                          Stock: {p.stock}
                        </span>
                        {sinStock ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="size-3" />
                            Agotado
                          </Badge>
                        ) : stockBajo ? (
                          <Badge
                            variant="outline"
                            className="gap-1 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                          >
                            <AlertTriangle className="size-3" />
                            Bajo
                          </Badge>
                        ) : null}
                      </p>
                    </div>
                    <span className="shrink-0 text-right text-sm tabular-nums">
                      <strong>{p.ventas}</strong>
                      <span className="ml-1 text-xs text-muted-foreground">
                        uds
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
