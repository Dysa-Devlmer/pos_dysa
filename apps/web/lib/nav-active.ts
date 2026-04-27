/**
 * Determina cuál href del nav debe marcarse como activo dado un pathname.
 *
 * Reglas:
 *   1. El ítem `/` solo está activo en pathname exacto `/` (sino se marcaría
 *      en TODA ruta).
 *   2. Para los demás, un ítem `href` matchea si pathname es exacto o si es
 *      sub-ruta directa (`pathname.startsWith(href + "/")`). Ojo: solo el
 *      match más LARGO gana, así evitamos que `/caja` y `/caja/movimientos`
 *      se prendan a la vez cuando ambos son ítems del nav.
 *   3. Antes de aplicar (2), exigimos boundary `/` para no caer en falsos
 *      positivos por prefijo de string (p. ej. `/caja` matcheando `/cajas`).
 */
export function getActiveHref(
  pathname: string,
  hrefs: readonly string[],
): string | null {
  const candidates = hrefs.filter((href) => {
    if (href === "/") return pathname === "/";
    if (pathname === href) return true;
    return pathname.startsWith(`${href}/`);
  });

  if (candidates.length === 0) return null;
  // Longest-prefix-match: el href más largo es el más específico.
  return candidates.reduce((a, b) => (a.length >= b.length ? a : b));
}
