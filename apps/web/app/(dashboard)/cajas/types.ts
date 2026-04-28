/**
 * Tipos compartidos del módulo Cajas — extraídos de `cajas-table.tsx`
 * para resolver una dependencia circular (M9p, 2026-04-28).
 *
 * Antes:
 *   cajas-table.tsx exportaba CajaRow + importaba <CajaForm> de caja-form
 *   caja-form.tsx importaba `type CajaRow` de cajas-table
 *   → ciclo cajas-table ↔ caja-form
 *
 * Ahora ambos archivos + `page.tsx` importan `CajaRow` desde aquí.
 * `caja-form.tsx` ya no necesita conocer `cajas-table.tsx` para tipar
 * sus props, eliminando la arista del grafo que cerraba el ciclo.
 */

export interface CajaRow {
  id: number;
  nombre: string;
  ubicacion: string | null;
  activa: boolean;
  aperturas: number;
}
