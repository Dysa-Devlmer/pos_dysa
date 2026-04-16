"use client";

import Link from "next/link";
import { ArrowRight, Receipt } from "lucide-react";
import type { MetodoPago } from "@repo/db";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

const METODO_STYLES: Record<MetodoPago, string> = {
  EFECTIVO:
    "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-900",
  DEBITO:
    "bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-900",
  CREDITO:
    "bg-purple-100 text-purple-900 border-purple-200 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-900",
  TRANSFERENCIA:
    "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-900",
};

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
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="size-4" />
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
            {data.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between gap-3 py-3"
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
                  className={METODO_STYLES[v.metodoPago]}
                >
                  {v.metodoPago}
                </Badge>
                <span className="w-24 shrink-0 text-right tabular-nums font-semibold">
                  {formatCLP(v.total)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
