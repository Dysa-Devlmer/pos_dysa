import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { create } from "zustand";

import {
  countFailed,
  countPending,
  flushSyncQueue,
  getLastSync,
  type FlushResult,
} from "@/db/sync";
import { syncProductosCache } from "@/db/productos-cache";

/**
 * Sync store — estado global de conectividad y queue offline (M5).
 *
 * Expuesto al resto de la app:
 *   - `isOnline`       → usar en caja.tsx para rama offline vs POST directo
 *   - `pendingCount`   → badge del banner
 *   - `failedCount`    → UI de alertas (productos sin stock al sincronizar)
 *   - `lastSync`       → timestamp del último flush exitoso
 *   - `isSyncing`      → evita spinners duplicados
 *   - `bootstrap()`    → llamar en app start (suscribe NetInfo +
 *     cuenta pending iniciales)
 *   - `refreshCounts()` → tras enqueue/delete en otras pantallas
 *   - `syncNow()`      → trigger manual (pull-to-refresh)
 *
 * Conectividad:
 *   - NetInfo.isConnected puede ser null al boot; lo consideramos
 *     online hasta demostrar lo contrario (evita modo offline falso
 *     que bloquearía UX sin razón).
 *   - `isInternetReachable` también se consulta; algunos WiFi tienen
 *     conexión L2 sin salida a internet (captive portal, etc.).
 *   - Al pasar de offline→online, auto-trigger `syncNow()`.
 */

type SyncState = {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  lastSync: Date | null;
  // SS3 (audit Claude Code CLI 2026-04-28) — flag para evitar race condition
  // entre `AppState change → "active"` y `bootstrap()`. El listener de
  // _layout.tsx llamaba `syncNow()` al cambiar a foreground, pero si eso
  // ocurría antes de que `initDb()` creara la tabla `sync_queue`, syncNow
  // crasheaba con "table does not exist". Ahora bootstrap() setea isReady
  // al final y el listener consulta este flag antes de drenar la queue.
  isReady: boolean;

  bootstrap: () => Promise<void>;
  refreshCounts: () => Promise<void>;
  syncNow: () => Promise<FlushResult | "skipped" | "offline">;
  refreshProductosCache: () => Promise<void>;
};

function isOnlineFromState(state: NetInfoState): boolean {
  // `isConnected === false` → sin red L2. `isInternetReachable === false`
  // → red L2 sin internet (ej. captive portal). Ambos cuentan como offline.
  // `null` en cualquiera de los dos → asumimos online (NetInfo todavía
  // no tiene info o la plataforma no la reporta).
  if (state.isConnected === false) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

let unsubscribeNetInfo: (() => void) | null = null;

export const useSyncStore = create<SyncState>((set, get) => ({
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  failedCount: 0,
  lastSync: null,
  isReady: false,

  bootstrap: async () => {
    // Estado inicial de NetInfo (awaited — evita un frame con isOnline
    // optimista que cambia a offline 100ms después).
    try {
      const initial = await NetInfo.fetch();
      set({ isOnline: isOnlineFromState(initial) });
    } catch {
      // fetch() puede fallar en edge cases (emulador, etc.); mantener true.
    }

    // Suscripción continua. Si ya había una (bootstrap doble), limpiamos
    // la anterior — evita memory leak en hot reload.
    if (unsubscribeNetInfo) unsubscribeNetInfo();
    unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      const nextOnline = isOnlineFromState(state);
      const prevOnline = get().isOnline;
      set({ isOnline: nextOnline });

      // offline → online: flush automático.
      if (!prevOnline && nextOnline) {
        void get().syncNow();
      }
    });

    // Contar pendientes iniciales + lastSync del meta.
    await get().refreshCounts();

    // M6: refrescar caché de productos si hay red. Fire-and-forget —
    // errores se loggean y no bloquean el arranque (modo degradado:
    // scanner online funciona aunque el cache esté vacío).
    if (get().isOnline) {
      void get().refreshProductosCache();
    }

    // SS3: marcar el store como listo. Después de este punto, syncNow()
    // es safe — initDb() ya completó (lo asegura RootLayoutNav que awaitea
    // initDb() ANTES de syncBootstrap()), y los counts iniciales ya están
    // computados.
    set({ isReady: true });
  },

  refreshProductosCache: async () => {
    try {
      const result = await syncProductosCache();
      if (!result.ok) {
        console.warn(
          "[syncStore] productos-cache refresh failed:",
          result.error,
        );
      }
    } catch (e) {
      console.warn("[syncStore] refreshProductosCache error:", e);
    }
  },

  refreshCounts: async () => {
    try {
      const [pending, failed, last] = await Promise.all([
        countPending(),
        countFailed(),
        getLastSync(),
      ]);
      set({ pendingCount: pending, failedCount: failed, lastSync: last });
    } catch (e) {
      console.warn("[syncStore] refreshCounts error:", e);
    }
  },

  syncNow: async () => {
    const { isOnline, isSyncing } = get();
    if (!isOnline) return "offline";
    if (isSyncing) return "skipped";

    set({ isSyncing: true });
    try {
      const result = await flushSyncQueue();
      await get().refreshCounts();
      return result;
    } catch (e) {
      console.warn("[syncStore] syncNow error:", e);
      throw e;
    } finally {
      set({ isSyncing: false });
    }
  },
}));
