import { drizzle, type ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import * as SQLite from "expo-sqlite";

import * as schema from "./schema";

/**
 * SQLite client — offline-first (M5).
 *
 * Arquitectura:
 *   - `openDatabaseAsync` (NO `openDatabaseSync`) — G-M09. La versión
 *     sync es sincrónica pero corre en el JS thread y bloquea; la async
 *     usa el worker nativo y no bloquea UI.
 *   - Drizzle wrappea la conexión para queries tipadas.
 *   - Migraciones: en M5 no usamos drizzle-kit todavía. En cambio,
 *     `bootstrapDb()` hace `CREATE TABLE IF NOT EXISTS ...` manual al
 *     primer boot. Es el patrón de M5 ("llegar a offline funcional").
 *     Cuando toquemos schema en M6+ migramos a drizzle-kit + migrator.
 *
 * Singleton:
 *   - `getDb()` lazy-inicializa. Una sola conexión por proceso
 *     (Expo/React Native es single-JS-VM, no necesitamos pool).
 *
 * Nombre de BD:
 *   - "pos_chile_offline.db" namespaced. expo-sqlite lo guarda en
 *     FileSystem.documentDirectory por default, sobrevive updates OTA.
 */

const DB_NAME = "pos_chile_offline.db";

let _db: ExpoSQLiteDatabase<typeof schema> | null = null;
let _bootstrapPromise: Promise<ExpoSQLiteDatabase<typeof schema>> | null =
  null;

async function openAndBootstrap(): Promise<
  ExpoSQLiteDatabase<typeof schema>
> {
  const expoDb = await SQLite.openDatabaseAsync(DB_NAME);

  // Foreign keys off (no tenemos FKs todavía), WAL journal para
  // resistir crashes durante writes (ventas offline son sagradas).
  await expoDb.execAsync("PRAGMA journal_mode = WAL;");

  // CREATE TABLE IF NOT EXISTS — crudo. Drizzle genera las mismas
  // columnas si hiciéramos migraciones; acá las escribimos a mano para
  // evitar la toolchain de drizzle-kit en esta fase.
  await expoDb.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      intentos INTEGER NOT NULL DEFAULT 0,
      error TEXT,
      creada_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      last_attempt_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS sync_queue_status_idx
      ON sync_queue (status);

    CREATE TABLE IF NOT EXISTS sync_meta (
      id INTEGER PRIMARY KEY,
      last_sync INTEGER
    );

    CREATE TABLE IF NOT EXISTS productos_cache (
      id INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL,
      precio INTEGER NOT NULL,
      stock INTEGER NOT NULL,
      codigo_barras TEXT NOT NULL UNIQUE,
      alerta_stock INTEGER NOT NULL DEFAULT 5,
      activo INTEGER NOT NULL DEFAULT 1,
      categoria_id INTEGER NOT NULL,
      cached_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE INDEX IF NOT EXISTS productos_cache_codigo_idx
      ON productos_cache (codigo_barras);

    -- Seed row de sync_meta (id=1 siempre). INSERT OR IGNORE evita
    -- error si ya existe de un boot anterior.
    INSERT OR IGNORE INTO sync_meta (id, last_sync) VALUES (1, NULL);
  `);

  return drizzle(expoDb, { schema });
}

/**
 * Obtiene la conexión Drizzle. Primera llamada bootstrappea.
 * Llamadas concurrentes esperan al mismo promise (evita race en boot).
 */
export async function getDb(): Promise<ExpoSQLiteDatabase<typeof schema>> {
  if (_db) return _db;
  if (_bootstrapPromise) return _bootstrapPromise;

  _bootstrapPromise = openAndBootstrap().then((db) => {
    _db = db;
    return db;
  });
  return _bootstrapPromise;
}

/**
 * Helper para llamar al bootstrap explícitamente en app start
 * (evita que el primer query pague el costo del PRAGMA+CREATE).
 */
export async function initDb(): Promise<void> {
  await getDb();
}

export { schema };
