"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/money-input";
import { abrirCaja } from "../actions";

interface CajaOption {
  id: number;
  nombre: string;
  ubicacion: string | null;
}

export function AbrirCajaForm({ cajas }: { cajas: CajaOption[] }) {
  const router = useRouter();
  const [cajaId, setCajaId] = React.useState<number | null>(
    cajas[0]?.id ?? null,
  );
  const [montoInicial, setMontoInicial] = React.useState<number>(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    if (!cajaId) {
      setError("Selecciona una caja");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await abrirCaja({ cajaId, montoInicial });
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

  if (cajas.length === 0) {
    return (
      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
        No hay cajas activas configuradas. Contacta al administrador para crear
        una caja antes de operar.
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="space-y-4 rounded-xl border bg-card p-4"
    >
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Caja</label>
        <select
          value={cajaId ?? ""}
          onChange={(e) => setCajaId(Number(e.target.value) || null)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          disabled={submitting}
        >
          {cajas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
              {c.ubicacion ? ` — ${c.ubicacion}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Monto inicial (CLP)</label>
        <MoneyInput
          value={montoInicial}
          onValueChange={setMontoInicial}
          placeholder="0"
          disabled={submitting}
        />
        <p className="text-xs text-muted-foreground">
          Efectivo con el que se inicia el turno (cambio de caja).
        </p>
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
        Abrir caja
      </Button>
    </form>
  );
}
