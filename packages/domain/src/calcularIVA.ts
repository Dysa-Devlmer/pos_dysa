/**
 * Calcula IVA chileno (19% fijo) sobre un subtotal.
 * Todos los montos en CLP Int. Math.round para consistencia
 * con el resto del sistema (NO Math.floor ni Math.ceil).
 *
 * @param subtotal Base imponible en CLP
 * @returns { impuesto, total } ambos en CLP Int
 *
 * @example
 *   calcularIVA(1000) // { impuesto: 190, total: 1190 }
 *   calcularIVA(0)    // { impuesto: 0, total: 0 }
 */
export function calcularIVA(subtotal: number): {
  impuesto: number;
  total: number;
} {
  const impuesto = Math.round(subtotal * 0.19);
  return { impuesto, total: subtotal + impuesto };
}
