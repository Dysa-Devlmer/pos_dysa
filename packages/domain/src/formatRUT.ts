/**
 * Formatea un RUT chileno en formato canónico "XX.XXX.XXX-Y".
 * Acepta input con o sin puntos/guión.
 * NO valida el DV — usar validarRUT() para eso.
 *
 * @example
 *   formatRUT("123456789")    // "12.345.678-9"
 *   formatRUT("12.345.678-9") // "12.345.678-9" (idempotente)
 *   formatRUT("7654321K")     // "7.654.321-K"
 */
export function formatRUT(rut: string): string {
  const rutLimpio = rut.replace(/[\.\-]/g, "");
  const cuerpo = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1);
  const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${cuerpoFormateado}-${dv}`;
}
