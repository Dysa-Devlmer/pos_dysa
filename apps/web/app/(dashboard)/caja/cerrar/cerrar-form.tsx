"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { MetodoPago } from "@repo/db";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/money-input";
import { formatCLP } from "@/lib/utils";
import { cerrarCaja } from "../actions";

interface PagoMetodoSummary {
  metodo: MetodoPago;
  total: number;
  count: number;
}

interface Props {
  aperturaId: number;
  cajaNombre: string;
  montoInicial: number;
  ventasCount: number;
  ventasTotal: number;
  montoFinalSistema: number;
  pagosPorMetodo: PagoMetodoSummary[];
}

export function CerrarCajaForm({
  aperturaId,
  cajaNombre,
  montoInicial,
  ventasCount,
  ventasTotal,
  montoFinalSistema,
  pagosPorMetodo,
}: Props) {
  const router = useRouter();
  const [montoFinalDeclarado, setMontoFinalDeclarado] = React.useState<number>(
    montoFinalSistema,
  );
  const [observaciones, setObservaciones] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const diferencia = montoFinalDeclarado - montoFinalSistema;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await cerrarCaja({
        aperturaId,
        montoFinalDeclarado,
        observaciones: observaciones.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/caja/${aperturaId}/cierre`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="space-y-4"
    >
      {/* Resumen */}
      <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">Caja</p>
          <p className="font-medium">{cajaNombre}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Apertura #</p>
          <p className="font-mono">{aperturaId}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Monto inicial</p>
          <p className="tabular-nums">{formatCLP(montoInicial)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Ventas del turno</p>
          <p className="tabular-nums">
            {ventasCount} · {formatCLP(ventasTotal)}
          </p>
        </div>
      </div>

      {/* Pagos por método */}
      {pagosPorMetodo.length > 0 ? (
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-2 text-sm font-medium">Pagos por método</p>
          <ul className="space-y-1 text-sm">
            {pagosPorMetodo.map((p) => (
              <li
                key={p.metodo}
                className="flex items-center justify-between border-b last:border-0 py-1"
              >
                <span>
                  {p.metodo} · {p.count}
                </span>
                <span className="tabular-nums">{formatCLP(p.total)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Cierre */}
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Monto final sistema</span>
          <span className="font-semibold tabular-nums">
            {formatCLP(montoFinalSistema)}
          </span>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Monto final declarado (efectivo contado)
          </label>
          <MoneyInput
            value={montoFinalDeclarado}
            onValueChange={setMontoFinalDeclarado}
            placeholder="0"
            disabled={submitting}
          />
        </div>

        <div
          className={
            "flex items-center justify-between rounded-md px-3 py-2 text-sm " +
            (diferencia === 0
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "bg-amber-500/10 text-amber-700 dark:text-amber-400")
          }
        >
          <span className="font-medium">Diferencia</span>
          <span className="font-semibold tabular-nums">
            {diferencia >= 0 ? "+" : ""}
            {formatCLP(diferencia)}
          </span>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Observaciones (opcional)</label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={3}
            maxLength={500}
            disabled={submitting}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Notas del turno, justificación de diferencia, etc."
          />
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            {error}
          </div>
        ) : null}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Cerrar caja
        </Button>
      </div>
    </form>
  );
}
