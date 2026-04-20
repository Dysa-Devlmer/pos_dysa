"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn, validarRUT } from "@/lib/utils";

/**
 * Limpia y formatea un string RUT conforme el usuario tipea:
 * - Elimina caracteres no válidos (solo dígitos + K al final)
 * - Inserta puntos cada 3 dígitos y un guión antes del DV
 * - "123456789"  → "12.345.678-9"
 * - "12.345.678-K" → "12.345.678-K"
 * - Retorna la cadena formateada. Si es <2 chars, devuelve el input limpio.
 */
export function formatearRutLive(raw: string): string {
  // Normalizar a mayúsculas y sacar todo lo que no sea dígito o K
  const limpio = raw.toUpperCase().replace(/[^0-9K]/g, "");
  if (limpio.length === 0) return "";
  if (limpio.length === 1) return limpio;
  const cuerpo = limpio.slice(0, -1).replace(/[^0-9]/g, ""); // el cuerpo solo números
  const dv = limpio.slice(-1);
  const cuerpoFmt = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${cuerpoFmt}-${dv}`;
}

export interface RutInputProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> {
  value: string;
  onValueChange: (formatted: string) => void;
  /** Si true (default), muestra feedback inline de validación. */
  showValidation?: boolean;
}

export function RutInput({
  value,
  onValueChange,
  showValidation = true,
  className,
  placeholder = "12.345.678-9",
  ...rest
}: RutInputProps) {
  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const next = formatearRutLive(e.target.value);
    onValueChange(next);
  };

  const trimmed = value.trim();
  const vacio = trimmed.length === 0;
  const valido = !vacio && trimmed.length >= 9 && validarRUT(trimmed);
  const invalido = !vacio && trimmed.length >= 9 && !valido;

  return (
    <div className="space-y-1">
      <div className="relative">
        <Input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          maxLength={12}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={cn(
            "pr-8 font-mono tracking-tight",
            valido && "border-emerald-500/60 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/30",
            invalido && "border-red-500/60 focus-visible:border-red-500 focus-visible:ring-red-500/30",
            className,
          )}
          aria-invalid={invalido || undefined}
          {...rest}
        />
        {showValidation && valido ? (
          <span
            aria-hidden
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-500"
          >
            ✓
          </span>
        ) : null}
        {showValidation && invalido ? (
          <span
            aria-hidden
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-red-600 dark:text-red-500"
          >
            ✕
          </span>
        ) : null}
      </div>
      {showValidation && invalido ? (
        <p className="text-xs text-red-600 dark:text-red-500">
          Dígito verificador incorrecto.
        </p>
      ) : null}
    </div>
  );
}
