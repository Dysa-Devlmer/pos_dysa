"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/money-input";
import { registrarMovimientoCaja } from "../../actions";

interface Props {
  aperturaId: number;
  cajaNombre: string;
}

// NOTA: NO importar `TipoMovimientoCaja` desde `@repo/db` en este client component.
// Eso evalúa `packages/db/src/client.ts` en el bundle cliente y rompe con
// "POS_DATABASE_URL no definida" en el browser (gotcha 90 — client/server boundary).
// Replicamos el enum como string literal local; el server action lo valida con Zod.
type TipoMovimientoCaja = "INGRESO" | "EGRESO" | "RETIRO" | "AJUSTE";
const TipoMovimientoCaja = {
  INGRESO: "INGRESO",
  EGRESO: "EGRESO",
  RETIRO: "RETIRO",
  AJUSTE: "AJUSTE",
} as const satisfies Record<string, TipoMovimientoCaja>;

const TIPOS: { value: TipoMovimientoCaja; label: string; hint: string }[] = [
  {
    value: TipoMovimientoCaja.INGRESO,
    label: "Ingreso",
    hint: "Aporte de efectivo a la caja (cambio extra, fondo, etc.)",
  },
  {
    value: TipoMovimientoCaja.EGRESO,
    label: "Egreso",
    hint: "Pago de gastos desde la caja (proveedores, servicios)",
  },
  {
    value: TipoMovimientoCaja.RETIRO,
    label: "Retiro",
    hint: "Sacar efectivo (depósito al banco, fondo a otra caja)",
  },
  {
    value: TipoMovimientoCaja.AJUSTE,
    label: "Ajuste",
    hint: "Corrección manual; el monto puede ser positivo o negativo",
  },
];

export function MovimientoForm({ aperturaId, cajaNombre }: Props) {
  const router = useRouter();
  const [tipo, setTipo] = React.useState<TipoMovimientoCaja>(
    TipoMovimientoCaja.RETIRO,
  );
  const [monto, setMonto] = React.useState<number>(0);
  const [motivo, setMotivo] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    if (!motivo.trim()) {
      setError("Motivo requerido");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await registrarMovimientoCaja({
        aperturaId,
        tipo,
        monto,
        motivo: motivo.trim(),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/caja");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const tipoSel = TIPOS.find((t) => t.value === tipo)!;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="space-y-4 rounded-xl border bg-card p-4"
    >
      <div className="text-xs text-muted-foreground">
        Caja: <span className="font-medium text-foreground">{cajaNombre}</span> ·
        apertura #{aperturaId}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Tipo</label>
        <div className="grid grid-cols-2 gap-2">
          {TIPOS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTipo(t.value)}
              disabled={submitting}
              className={
                "rounded-md border px-3 py-2 text-sm transition-colors " +
                (tipo === t.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "hover:bg-muted")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{tipoSel.hint}</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Monto {tipo === TipoMovimientoCaja.AJUSTE ? "(puede ser negativo)" : "(CLP)"}
        </label>
        {tipo === TipoMovimientoCaja.AJUSTE ? (
          <input
            type="number"
            value={monto}
            onChange={(e) => setMonto(Math.trunc(Number(e.target.value) || 0))}
            disabled={submitting}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm tabular-nums"
            placeholder="0"
            step={1}
          />
        ) : (
          <MoneyInput
            value={monto}
            onValueChange={setMonto}
            placeholder="0"
            disabled={submitting}
          />
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Motivo</label>
        <input
          type="text"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          maxLength={255}
          disabled={submitting}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Ej: depósito banco, pago boleta gas, etc."
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
        Registrar movimiento
      </Button>
    </form>
  );
}
