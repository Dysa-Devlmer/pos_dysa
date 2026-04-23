import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

/**
 * Schema SQLite local — offline-first (M5).
 *
 * Alcance M5 (estricto):
 *   - `syncQueue`  → ventas creadas sin internet, pendientes de envío
 *   - `syncMeta`   → metadata single-row (última sincronización, etc.)
 *
 * Alcance M6 (definido pero NO poblado en M5, per instrucciones):
 *   - `productosCache` → mirror de productos para scan/search offline.
 *     Se crea la tabla para no re-migrar en M6, pero el código de M5
 *     ignora esta tabla completamente (ni escribe ni lee).
 *
 * Convenciones:
 *   - Snake_case en columnas SQLite, camelCase en TS (drizzle traduce).
 *   - Timestamps como `integer({ mode: "timestamp_ms" })` para facilitar
 *     sorting y comparaciones vs `new Date().getTime()`.
 *   - IDs locales: text (nanoid 21 chars). Los IDs del servidor son int
 *     autoincrement; NO los usamos como PK local para evitar colisiones
 *     cuando múltiples dispositivos crean ventas offline.
 */

/**
 * Queue de ventas pendientes de sincronizar.
 *
 * Flujo estado:
 *   pending → (POST ok)    → DELETE de la fila (no guardamos synced)
 *           → (network err) → sigue pending, intentos++
 *           → (409 stock)   → failed, requiere acción del cajero (G-M04)
 *
 * No guardamos status "synced" — una vez exitoso se borra la fila.
 * Evita bloat y simplifica queries (COUNT pending == pendingCount).
 */
export const syncQueue = sqliteTable("sync_queue", {
  // nanoid local. Se usa como idempotency key futura si el server llega
  // a soportar Idempotency-Key header (hoy no lo hace).
  id: text("id").primaryKey(),

  // Payload serializado del body de POST /api/v1/ventas.
  // Schema: CrearVentaRequest ({ items, metodoPago, clienteId? }).
  // JSON.stringify al insertar, JSON.parse al leer. No usamos columnas
  // relacionales porque el payload del contract puede evolucionar sin
  // forzar migración local.
  payload: text("payload").notNull(),

  // "pending" | "failed". "syncing" es transient in-memory (no lo
  // persistimos — si la app muere durante flush, se reinicia como pending).
  status: text("status").notNull().default("pending"),

  intentos: integer("intentos").notNull().default(0),

  // Último mensaje de error del server (para mostrar en UI al cajero
  // cuando status=failed).
  error: text("error"),

  creadaAt: integer("creada_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),

  lastAttemptAt: integer("last_attempt_at", { mode: "timestamp_ms" }),
});

/**
 * Metadata single-row. Row id siempre = 1 (upsert pattern).
 */
export const syncMeta = sqliteTable("sync_meta", {
  id: integer("id").primaryKey(), // siempre 1
  lastSync: integer("last_sync", { mode: "timestamp_ms" }),
});

/**
 * Productos cache — declarado para M6. NO usado en M5.
 * Mantener synced con `Producto` del api-client para evitar drift.
 */
export const productosCache = sqliteTable("productos_cache", {
  id: integer("id").primaryKey(),
  nombre: text("nombre").notNull(),
  precio: integer("precio").notNull(),
  stock: integer("stock").notNull(),
  codigoBarras: text("codigo_barras").notNull().unique(),
  alertaStock: integer("alerta_stock").notNull().default(5),
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
  categoriaId: integer("categoria_id").notNull(),
  // Para invalidación en M6: timestamp del fetch
  cachedAt: integer("cached_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export type SyncQueueRow = typeof syncQueue.$inferSelect;
export type NewSyncQueueRow = typeof syncQueue.$inferInsert;
export type SyncMetaRow = typeof syncMeta.$inferSelect;
