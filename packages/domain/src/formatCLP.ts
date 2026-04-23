/**
 * Formatea un monto en pesos chilenos (CLP).
 * CLP no tiene decimales: siempre Int redondeado.
 *
 * IMPORTANTE: Normaliza U+202F (NBSP estrecho, Node 20+) y U+00A0 (NBSP)
 * a espacio regular U+0020. Sin esto, Intl.NumberFormat genera output diferente
 * entre Node SSR y el browser -> "Text content did not match" en hidratacion
 * React, test fails, y output inconsistente entre plataformas.
 *
 * Regression test en `apps/web/lib/__tests__/utils.test.ts::formatCLP -- hydration safety`.
 *
 * @example
 *   formatCLP(1234567) // "$ 1.234.567"
 *   formatCLP(0)       // "$ 0"
 *   formatCLP(1000.7)  // "$ 1.001" (redondeado)
 */
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
