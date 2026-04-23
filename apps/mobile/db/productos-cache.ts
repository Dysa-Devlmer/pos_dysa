import { eq } from "drizzle-orm";
import {
  ProductosListSchema,
  type Producto,
} from "@repo/api-client";

import { apiClient } from "@/stores/authStore";
import { getDb } from "./client";
import { productosCache } from "./schema";

/**
 * Cache local de productos para modo offline del scanner — M6.
 *
 * Estrategia:
 *   - Full refresh paginado cada vez que `syncProductosCache()` corre.
 *     Dataset típico POS Chile <2.000 productos; un refresh completo
 *     tarda <3s sobre 4G decente y simplifica invalidación.
 *   - Se llama en:
 *       a) bootstrap del syncStore tras login (si online),
 *       b) AppState active (foreground) cuando hay conexión,
 *       c) opcionalmente tras flushSyncQueue exitoso (siguientes ventas
 *          ya ven el stock decrementado por ventas online paralelas).
 *   - `buscarEnCache(codigoBarras)` devuelve null si no hay match → la
 *     UI muestra "Producto no disponible offline" y no permite agregar.
 *
 * Trade-off: el stock del cache puede estar desactualizado (otro cajero
 * web vendió justo antes). Aceptable para M6 — el server es fuente de
 * verdad y rechaza con 409 cuando se intenta vender stock insuficiente.
 */

const PAGE_SIZE = 100;

export type ProductoCacheRow = {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  codigoBarras: string;
  alertaStock: number;
  activo: boolean;
  categoriaId: number;
};

/**
 * Busca un producto en la caché local por código de barras. Usado por el
 * scanner de caja cuando `isOnline === false` o cuando la llamada HTTP
 * falla. Devuelve un shape compatible con `Producto` parcial (faltan
 * campos como createdAt/categoria pero basta para addToCart).
 */
export async function buscarEnCache(
  codigoBarras: string,
): Promise<ProductoCacheRow | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(productosCache)
    .where(eq(productosCache.codigoBarras, codigoBarras))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    nombre: row.nombre,
    precio: row.precio,
    stock: row.stock,
    codigoBarras: row.codigoBarras,
    alertaStock: row.alertaStock,
    activo: Boolean(row.activo),
    categoriaId: row.categoriaId,
  };
}

/**
 * Adapta una ProductoCacheRow a un shape Producto minimal compatible con
 * `CartItem.producto`. No incluimos descripcion/categoria embed porque el
 * carrito no los usa; si en el futuro los necesita, guardarlos aquí.
 */
export function toProducto(row: ProductoCacheRow): Producto {
  const now = new Date().toISOString();
  return {
    id: row.id,
    codigoBarras: row.codigoBarras,
    nombre: row.nombre,
    descripcion: null,
    precio: row.precio,
    stock: row.stock,
    alertaStock: row.alertaStock,
    activo: row.activo,
    categoriaId: row.categoriaId,
    ventas: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Trae todos los productos activos desde el server y los upsertea en
 * SQLite. Idempotente — `INSERT OR REPLACE` por id. No borra productos
 * que ya no vienen del server (podrían haberse desactivado); el filtro
 * `activo` en el cache los sigue excluyendo del scanner.
 *
 * Para simplificar y asegurar consistencia, TRUNCATE + reinsert. Las
 * filas son pequeñas (<200 bytes c/u), el cost es aceptable.
 */
export async function syncProductosCache(): Promise<{
  total: number;
  ok: boolean;
  error?: string;
}> {
  const db = await getDb();
  try {
    let page = 1;
    const all: Producto[] = [];
    while (true) {
      const resp = await apiClient.get(
        "/api/v1/productos",
        ProductosListSchema,
        { page, limit: PAGE_SIZE },
      );
      all.push(...resp.data);
      const totalPages = resp.meta?.totalPages ?? 1;
      if (page >= totalPages) break;
      page += 1;
      // Circuit breaker defensivo — nadie debería tener >100 pags (10k items)
      if (page > 100) break;
    }

    await db.delete(productosCache);
    if (all.length > 0) {
      // Batch inserts — expo-sqlite aguanta hasta SQLITE_MAX_COMPOUND_SELECT
      // (500 por default). Chunk de 200 es conservador.
      const CHUNK = 200;
      for (let i = 0; i < all.length; i += CHUNK) {
        const slice = all.slice(i, i + CHUNK).map((p) => ({
          id: p.id,
          nombre: p.nombre,
          precio: p.precio,
          stock: p.stock,
          codigoBarras: p.codigoBarras,
          alertaStock: p.alertaStock,
          activo: p.activo,
          categoriaId: p.categoriaId,
        }));
        await db.insert(productosCache).values(slice);
      }
    }
    return { total: all.length, ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { total: 0, ok: false, error: msg };
  }
}

export async function countCache(): Promise<number> {
  const db = await getDb();
  const rows = await db.select().from(productosCache);
  return rows.length;
}
