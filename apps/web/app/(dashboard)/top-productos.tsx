"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, Package, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SOFT_BADGE } from "@/lib/badge-styles";

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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: 0.25 }}
    >
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="size-4 text-[var(--chart-1)]" />
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
                <motion.li
                  key={p.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: 0.3 + idx * 0.07, ease: "easeOut" }}
                  className="space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--chart-1)]/15 text-[10px] font-semibold tabular-nums text-[var(--chart-1)]">
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
                          <Badge
                            variant="outline"
                            className={`gap-1 ${SOFT_BADGE.destructive}`}
                          >
                            <AlertTriangle className="size-3" />
                            Agotado
                          </Badge>
                        ) : stockBajo ? (
                          <Badge
                            variant="outline"
                            className={`gap-1 ${SOFT_BADGE.warning}`}
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
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: 0.4 + idx * 0.07, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                      className="h-full rounded-full bg-gradient-to-r from-[var(--chart-1)] to-[var(--chart-2)]"
                    />
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
    </motion.div>
  );
}
