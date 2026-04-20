import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Ruta no implementada deliberadamente.
 *
 * Las devoluciones se visualizan inline en `/devoluciones` (lista) y dentro
 * del detalle de venta `/ventas/[id]` (sección "Devoluciones"). No existe una
 * vista standalone por devolución.
 *
 * Este page existe para que cualquier acceso directo a `/devoluciones/<id>`
 * (ej. links pegados, bookmarks viejos) devuelva un 404 limpio en lugar de
 * un error 500 por ruta inexistente.
 */
export default function DevolucionDetallePage() {
  notFound();
}
