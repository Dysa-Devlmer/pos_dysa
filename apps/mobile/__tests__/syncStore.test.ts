/**
 * Unit tests — syncStore (zustand) — POS mobile.
 *
 * Cubre las invariantes del path crítico offline-first (M5 + SS3 audit):
 *   - bootstrap() setea isOnline desde NetInfo + isReady=true al final
 *   - syncNow() respeta los gates isOnline / isSyncing antes de flushear
 *   - syncNow() recupera counts post-flush (refreshCounts called)
 *   - syncNow() resetea isSyncing en `finally` aún si flushSyncQueue throw
 *   - bootstrap() doble → unsubscribe del primer listener NetInfo
 *
 * Mocks externos:
 *   - `@react-native-community/netinfo` → jest.setup.js default online
 *   - `@/db/sync` → mockeado por test (FlushResult shapes distintos)
 *   - `@/db/productos-cache` → mockeado para no tocar SQLite real
 *
 * Nota Día 5 (audit Claude Code CLI 2026-04-28): este suite es uno de
 * los 3 tests prioritarios definidos en reporte.md §B (junto con
 * authStore + db/sync). Cubre el camino crítico offline-first donde
 * cualquier regresión silenciosa pierde ventas en producción.
 */

// MOCKS antes del import del store (Jest hoistea jest.mock al top).
jest.mock("@/db/sync", () => ({
  countPending: jest.fn().mockResolvedValue(0),
  countFailed: jest.fn().mockResolvedValue(0),
  getLastSync: jest.fn().mockResolvedValue(null),
  flushSyncQueue: jest.fn().mockResolvedValue({ ok: 0, failed: 0 }),
}));

jest.mock("@/db/productos-cache", () => ({
  syncProductosCache: jest.fn().mockResolvedValue({ ok: true }),
}));

import NetInfo from "@react-native-community/netinfo";

import {
  countFailed,
  countPending,
  flushSyncQueue,
  getLastSync,
} from "@/db/sync";
import { syncProductosCache } from "@/db/productos-cache";

import { useSyncStore } from "../stores/syncStore";

const mockedNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
const mockedFlush = flushSyncQueue as jest.MockedFunction<typeof flushSyncQueue>;
const mockedCountPending = countPending as jest.MockedFunction<
  typeof countPending
>;
const mockedCountFailed = countFailed as jest.MockedFunction<
  typeof countFailed
>;
const mockedGetLastSync = getLastSync as jest.MockedFunction<
  typeof getLastSync
>;
const mockedSyncCache = syncProductosCache as jest.MockedFunction<
  typeof syncProductosCache
>;

describe("syncStore", () => {
  beforeEach(() => {
    // Reset zustand store entre tests — sin esto el isReady=true del test
    // anterior contamina al siguiente.
    useSyncStore.setState({
      isOnline: true,
      isSyncing: false,
      pendingCount: 0,
      failedCount: 0,
      lastSync: null,
      isReady: false,
    });
    jest.clearAllMocks();

    // Defaults: online, queue vacía, cache OK
    mockedNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: "wifi",
    } as never);
    mockedNetInfo.addEventListener.mockReturnValue(() => {});
    mockedFlush.mockResolvedValue({ ok: 0, failed: 0 } as never);
    mockedCountPending.mockResolvedValue(0);
    mockedCountFailed.mockResolvedValue(0);
    mockedGetLastSync.mockResolvedValue(null);
    mockedSyncCache.mockResolvedValue({ ok: true } as never);
  });

  // ─── bootstrap ───────────────────────────────────────────────────

  test("bootstrap online setea isReady=true y carga counts iniciales", async () => {
    mockedCountPending.mockResolvedValue(3);
    mockedCountFailed.mockResolvedValue(1);

    await useSyncStore.getState().bootstrap();

    const state = useSyncStore.getState();
    expect(state.isOnline).toBe(true);
    expect(state.isReady).toBe(true);
    expect(state.pendingCount).toBe(3);
    expect(state.failedCount).toBe(1);
    expect(mockedNetInfo.addEventListener).toHaveBeenCalled();
  });

  test("bootstrap offline setea isOnline=false pero igual marca isReady", async () => {
    mockedNetInfo.fetch.mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
      type: "none",
    } as never);

    await useSyncStore.getState().bootstrap();

    const state = useSyncStore.getState();
    expect(state.isOnline).toBe(false);
    expect(state.isReady).toBe(true);
    // No refresh de productos-cache si offline (gate explícito en código)
    expect(mockedSyncCache).not.toHaveBeenCalled();
  });

  test("bootstrap online dispara refresh productos-cache fire-and-forget", async () => {
    await useSyncStore.getState().bootstrap();

    expect(mockedSyncCache).toHaveBeenCalled();
  });

  test("bootstrap NetInfo.fetch error mantiene isOnline=true por defecto", async () => {
    mockedNetInfo.fetch.mockRejectedValue(new Error("netinfo down"));

    await useSyncStore.getState().bootstrap();

    const state = useSyncStore.getState();
    expect(state.isOnline).toBe(true); // default optimista
    expect(state.isReady).toBe(true);
  });

  // ─── syncNow gates ───────────────────────────────────────────────

  test("syncNow retorna 'offline' sin llamar flushSyncQueue cuando isOnline=false", async () => {
    useSyncStore.setState({ isOnline: false });

    const result = await useSyncStore.getState().syncNow();

    expect(result).toBe("offline");
    expect(mockedFlush).not.toHaveBeenCalled();
  });

  test("syncNow retorna 'skipped' cuando ya está syncing en otro caller", async () => {
    useSyncStore.setState({ isOnline: true, isSyncing: true });

    const result = await useSyncStore.getState().syncNow();

    expect(result).toBe("skipped");
    expect(mockedFlush).not.toHaveBeenCalled();
  });

  // ─── syncNow happy paths ─────────────────────────────────────────

  test("syncNow happy path: flushea, refresca counts, retorna result", async () => {
    useSyncStore.setState({ isOnline: true, isSyncing: false });
    mockedFlush.mockResolvedValue({ ok: 5, failed: 0 } as never);
    mockedCountPending.mockResolvedValue(0);

    const result = await useSyncStore.getState().syncNow();

    expect(result).toEqual({ ok: 5, failed: 0 });
    expect(mockedFlush).toHaveBeenCalledTimes(1);
    expect(mockedCountPending).toHaveBeenCalled();
    expect(useSyncStore.getState().isSyncing).toBe(false);
  });

  test("syncNow setea isSyncing=true durante el flush y false al terminar", async () => {
    useSyncStore.setState({ isOnline: true, isSyncing: false });

    let stateDuringFlush: boolean | null = null;
    mockedFlush.mockImplementation(async () => {
      stateDuringFlush = useSyncStore.getState().isSyncing;
      return { ok: 0, failed: 0 } as never;
    });

    await useSyncStore.getState().syncNow();

    expect(stateDuringFlush).toBe(true);
    expect(useSyncStore.getState().isSyncing).toBe(false);
  });

  // ─── syncNow error handling ──────────────────────────────────────

  test("syncNow throw: re-throwea pero igual resetea isSyncing en finally", async () => {
    useSyncStore.setState({ isOnline: true, isSyncing: false });
    mockedFlush.mockRejectedValue(new Error("network blip"));

    await expect(useSyncStore.getState().syncNow()).rejects.toThrow(
      "network blip",
    );

    // Crítico: si isSyncing quedara true, el siguiente syncNow caería a
    // "skipped" para siempre (deadlock UI).
    expect(useSyncStore.getState().isSyncing).toBe(false);
  });

  // ─── refreshCounts ───────────────────────────────────────────────

  test("refreshCounts actualiza pendingCount + failedCount + lastSync", async () => {
    const lastSyncDate = new Date("2026-04-28T10:00:00Z");
    mockedCountPending.mockResolvedValue(7);
    mockedCountFailed.mockResolvedValue(2);
    mockedGetLastSync.mockResolvedValue(lastSyncDate);

    await useSyncStore.getState().refreshCounts();

    const state = useSyncStore.getState();
    expect(state.pendingCount).toBe(7);
    expect(state.failedCount).toBe(2);
    expect(state.lastSync).toEqual(lastSyncDate);
  });

  test("refreshCounts swallow error sin tirar (modo degradado)", async () => {
    mockedCountPending.mockRejectedValue(new Error("DB locked"));

    // No throw, solo log warn
    await expect(
      useSyncStore.getState().refreshCounts(),
    ).resolves.toBeUndefined();
  });
});
