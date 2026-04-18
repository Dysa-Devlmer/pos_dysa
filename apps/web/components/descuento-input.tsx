"use client";

import * as React from "react";
import { DollarSign, Percent, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatCLP } from "@/lib/utils";

export type DescuentoModo = "pct" | "monto";

export interface DescuentoInputProps {
  modo: DescuentoModo;
  onChangeModo: (m: DescuentoModo) => void;
  descuentoPct: number;
  onChangeDescuentoPct: (v: number) => void;
  descuentoMonto: number;
  onChangeDescuentoMonto: (v: number) => void;
  /** Subtotal bruto actual (para validar y prevenir descuento > subtotal). */
  subtotalBruto: number;
  className?: string;
}

export function DescuentoInput({
  modo,
  onChangeModo,
  descuentoPct,
  onChangeDescuentoPct,
  descuentoMonto,
  onChangeDescuentoMonto,
  subtotalBruto,
  className,
}: DescuentoInputProps) {
  const pctInvalido =
    descuentoPct < 0 || descuentoPct > 100 || !Number.isFinite(descuentoPct);
  const montoInvalido =
    descuentoMonto < 0 ||
    descuentoMonto > subtotalBruto ||
    !Number.isFinite(descuentoMonto);

  const hayDescuento =
    (modo === "pct" && descuentoPct > 0) ||
    (modo === "monto" && descuentoMonto > 0);

  const setModo = (m: DescuentoModo) => {
    onChangeModo(m);
    // Resetear el otro modo al cambiar (solo uno activo a la vez)
    if (m === "pct") onChangeDescuentoMonto(0);
    else onChangeDescuentoPct(0);
  };

  const limpiar = () => {
    onChangeDescuentoPct(0);
    onChangeDescuentoMonto(0);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Descuento</span>
        {hayDescuento ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={limpiar}
            aria-label="Quitar descuento"
          >
            <X className="size-3" />
            Quitar
          </Button>
        ) : null}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setModo("pct")}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
            modo === "pct"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:bg-accent",
          )}
          aria-pressed={modo === "pct"}
        >
          <Percent className="size-3" />
          Porcentaje
        </button>
        <button
          type="button"
          onClick={() => setModo("monto")}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
            modo === "monto"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:bg-accent",
          )}
          aria-pressed={modo === "monto"}
        >
          <DollarSign className="size-3" />
          Monto fijo
        </button>
      </div>

      {modo === "pct" ? (
        <div className="relative">
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={0.5}
            value={Number.isFinite(descuentoPct) ? descuentoPct : 0}
            onChange={(e) => {
              const v = Number(e.target.value);
              onChangeDescuentoPct(
                Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0,
              );
            }}
            aria-invalid={pctInvalido || undefined}
            className="pr-10"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            %
          </span>
        </div>
      ) : (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={subtotalBruto > 0 ? subtotalBruto : undefined}
            step={100}
            value={Number.isFinite(descuentoMonto) ? descuentoMonto : 0}
            onChange={(e) => {
              const raw = e.target.valueAsNumber;
              const v = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
              onChangeDescuentoMonto(v);
            }}
            aria-invalid={montoInvalido || undefined}
            className="pl-8"
          />
        </div>
      )}

      {modo === "monto" && montoInvalido && subtotalBruto > 0 ? (
        <p className="text-xs text-destructive">
          El monto no puede exceder el subtotal ({formatCLP(subtotalBruto)}).
        </p>
      ) : null}
      {modo === "pct" && pctInvalido ? (
        <p className="text-xs text-destructive">
          El porcentaje debe estar entre 0 y 100.
        </p>
      ) : null}
    </div>
  );
}
