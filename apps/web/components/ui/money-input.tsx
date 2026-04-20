"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Formatea Int CLP con separadores de miles es-CL: 1234567 → "1.234.567" */
export function formatearMilesCL(n: number): string {
  if (!Number.isFinite(n)) return "";
  return Math.max(0, Math.floor(n)).toLocaleString("es-CL");
}

/** Extrae el entero representado en un string tipeado: "$1.234,50" → 1234 */
export function parsearMilesCL(raw: string): number {
  const soloDigitos = raw.replace(/[^\d]/g, "");
  if (!soloDigitos) return 0;
  const n = Number(soloDigitos);
  return Number.isFinite(n) ? n : 0;
}

export interface MoneyInputProps
  extends Omit<
    React.ComponentProps<"input">,
    "value" | "onChange" | "type" | "inputMode"
  > {
  /** Valor numérico (CLP, Int). Puede ser 0. */
  value: number;
  /** Callback con el nuevo valor numérico (Int, sin decimales). */
  onValueChange: (value: number) => void;
  /** Máximo valor permitido (para validación visual). */
  max?: number;
  /** Mostrar símbolo $ a la izquierda. Default: true */
  showSymbol?: boolean;
}

/**
 * Input de monto en CLP con separador de miles mientras se tipea.
 * Acepta solo dígitos; cualquier otro caracter se ignora.
 * Almacena internamente el string formateado para UX fluida, pero
 * propaga siempre el Int al padre vía onValueChange.
 */
export function MoneyInput({
  value,
  onValueChange,
  max,
  showSymbol = true,
  className,
  placeholder = "0",
  ...rest
}: MoneyInputProps) {
  // Display: string formateado. Lo mantenemos sincronizado con el prop value.
  const [display, setDisplay] = React.useState<string>(() =>
    value > 0 ? formatearMilesCL(value) : "",
  );

  // Re-sync cuando cambia value externamente (ej. reset del form)
  React.useEffect(() => {
    const parsed = parsearMilesCL(display);
    if (parsed !== value) {
      setDisplay(value > 0 ? formatearMilesCL(value) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const n = parsearMilesCL(e.target.value);
    const limited = typeof max === "number" ? Math.min(n, max) : n;
    setDisplay(limited > 0 ? formatearMilesCL(limited) : "");
    onValueChange(limited);
  };

  const sobreLimite = typeof max === "number" && value > max;

  return (
    <div className="relative">
      {showSymbol ? (
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 select-none text-sm text-muted-foreground"
        >
          $
        </span>
      ) : null}
      <Input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(
          "tabular-nums",
          showSymbol ? "pl-7" : undefined,
          sobreLimite &&
            "border-red-500/60 focus-visible:border-red-500 focus-visible:ring-red-500/30",
          className,
        )}
        aria-invalid={sobreLimite || undefined}
        {...rest}
      />
    </div>
  );
}
