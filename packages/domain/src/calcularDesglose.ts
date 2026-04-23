import { calcularIVA } from "./calcularIVA";

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
