/**
 * Valida un RUT chileno con algoritmo módulo 11.
 * Acepta input con o sin puntos/guión, K mayúscula o minúscula.
 *
 * Casos edge documentados en test: "0-0" retorna true (matemáticamente válido),
 * string vacío retorna false, "-" retorna false.
 *
 * @example
 *   validarRUT("11.111.111-1") // true
 *   validarRUT("111111111")    // true
 *   validarRUT("8.765.432-K")  // true (K mayúscula)
 *   validarRUT("8765432k")     // true (k minúscula)
 *   validarRUT("12.345.678-9") // false (DV incorrecto)
 *   validarRUT("")             // false
 */
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
