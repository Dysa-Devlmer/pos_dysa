"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Receipt } from "lucide-react";
import type { MetodoPago } from "@repo/db";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { METODO_PAGO_BADGE } from "@/lib/badge-styles";
import { formatCLP } from "@/lib/utils";

export interface UltimaVentaRow {
  id: number;
  numeroBoleta: string;
  fechaISO: string;
  clienteNombre: string | null;
  metodoPago: MetodoPago;
  total: number;
}

export interface UltimasVentasProps {
  data: UltimaVentaRow[];
}

function formatFechaHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function UltimasVentas({ data }: UltimasVentasProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: 0.35 }}
    >
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="size-4 text-[var(--chart-2)]" />
            Últimas ventas
          </CardTitle>
          <CardDescription>
            Las 5 boletas más recientes registradas.
          </CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/ventas">
            Ver todas
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aún no hay ventas registradas.
          </p>
        ) : (
          <ul className="divide-y">
            {data.map((v, idx) => (
              <motion.li
                key={v.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.4 + idx * 0.06, ease: "easeOut" }}
                className="flex items-center justify-between gap-3 py-3 rounded-md px-2 -mx-2 transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/ventas/${v.id}`}
                    className="block font-mono text-xs font-medium hover:underline"
                  >
                    {v.numeroBoleta}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatFechaHora(v.fechaISO)}
                    <span className="mx-1.5">·</span>
                    {v.clienteNombre ?? (
                      <span className="italic">Sin cliente</span>
                    )}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={METODO_PAGO_BADGE[v.metodoPago]}
                >
                  {v.metodoPago}
                </Badge>
                <span className="w-24 shrink-0 text-right tabular-nums font-semibold">
                  {formatCLP(v.total)}
                </span>
              </motion.li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
    </motion.div>
  );
}
