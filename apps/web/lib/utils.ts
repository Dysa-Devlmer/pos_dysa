import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formatear precios en CLP chileno.
// Normaliza \u202f (NBSP estrecho, Node 20+) y \u00a0 (NBSP) a espacio
// regular para evitar "Text content did not match" en hidratación React.
export function formatCLP(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace(/[\u202f\u00a0]/g, " ");
}

// Calcular IVA 19%
export function calcularIVA(subtotal: number): {
  impuesto: number;
  total: number;
} {
  const impuesto = Math.round(subtotal * 0.19);
  return { impuesto, total: subtotal + impuesto };
}

/**
 * Desglose completo de una venta con descuentos.
 * Todos los montos en CLP (Int, sin decimales).
 *
 * Orden de aplicación:
 *   1. descuentoPorcentual = round(subtotalBruto * pct / 100)
 *   2. baseTrasPct = subtotalBruto - descuentoPorcentual
 *   3. descuentoFijo = min(descuentoMonto, baseTrasPct)  ← no excede la base
 *   4. baseImponible = max(0, baseTrasPct - descuentoFijo)
 *   5. iva = round(baseImponible * 0.19)
 *   6. total = baseImponible + iva
 */
export interface DesgloseVenta {
  subtotalBruto: number;
  descuentoPorcentual: number;
  descuentoFijo: number;
  descuentoTotal: number;
  baseImponible: number;
  iva: number;
  total: number;
}

export function calcularDesglose(
  subtotalBruto: number,
  descuentoPct: number = 0,
  descuentoMonto: number = 0,
): DesgloseVenta {
  const bruto = Math.max(0, Math.floor(subtotalBruto));
  const pct = Math.max(0, Math.min(100, Number(descuentoPct) || 0));
  const monto = Math.max(0, Math.floor(descuentoMonto) || 0);

  const descuentoPorcentual = Math.round(bruto * (pct / 100));
  const baseTrasPct = Math.max(0, bruto - descuentoPorcentual);
  const descuentoFijo = Math.min(monto, baseTrasPct);
  const baseImponible = Math.max(0, baseTrasPct - descuentoFijo);
  const { impuesto: iva } = calcularIVA(baseImponible);
  const total = baseImponible + iva;

  return {
    subtotalBruto: bruto,
    descuentoPorcentual,
    descuentoFijo,
    descuentoTotal: descuentoPorcentual + descuentoFijo,
    baseImponible,
    iva,
    total,
  };
}

// Validar RUT chileno
export function validarRUT(rut: string): boolean {
  const rutLimpio = rut.replace(/[\.\-]/g, "");
  if (rutLimpio.length < 2) return false;
  const cuerpo = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1).toUpperCase();
  let suma = 0;
  let multiplo = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i] ?? "0") * multiplo;
    multiplo = multiplo < 7 ? multiplo + 1 : 2;
  }
  const dvEsperado = 11 - (suma % 11);
  const dvCalculado =
    dvEsperado === 11 ? "0" : dvEsperado === 10 ? "K" : String(dvEsperado);
  return dv === dvCalculado;
}

// Formatear RUT: 12345678 → 12.345.678-9
export function formatRUT(rut: string): string {
  const rutLimpio = rut.replace(/[\.\-]/g, "");
  const cuerpo = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1);
  const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${cuerpoFormateado}-${dv}`;
}
