import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

import { useSyncStore } from "@/stores/syncStore";

/**
 * Banner global de estado de sincronización — M5.
 *
 * Visible cuando:
 *   - No hay conexión (prioridad máxima, naranja)
 *   - Hay ventas pendientes de envío (amarillo)
 *   - Está sincronizando (verde con spinner)
 *   - Hay ventas failed que requieren atención (rojo)
 *
 * Oculto cuando: online + queue vacía + no syncing.
 *
 * Pensado para renderizarse FUERA del SafeAreaView de cada tab, en el
 * root layout, justo debajo del StatusBar. Por eso no incluye padding
 * top — el layout padre decide.
 *
 * Tap en el banner (cuando hay pending o failed) fuerza un syncNow().
 */
export function SyncBanner() {
  const isOnline = useSyncStore((s) => s.isOnline);
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const failedCount = useSyncStore((s) => s.failedCount);
  const syncNow = useSyncStore((s) => s.syncNow);

  // Orden de prioridad — el primero que matchee gana
  const state = !isOnline
    ? ("offline" as const)
    : isSyncing
      ? ("syncing" as const)
      : failedCount > 0
        ? ("failed" as const)
        : pendingCount > 0
          ? ("pending" as const)
          : ("hidden" as const);

  if (state === "hidden") return null;

  const config = {
    offline: {
      bg: "bg-warning",
      icon: "cloud-off" as const,
      text:
        pendingCount > 0
          ? `Sin conexión · ${pendingCount} venta${pendingCount === 1 ? "" : "s"} pendiente${pendingCount === 1 ? "" : "s"}`
          : "Sin conexión · modo offline",
      tappable: false,
    },
    syncing: {
      bg: "bg-success",
      icon: "sync" as const,
      text: "Sincronizando…",
      tappable: false,
    },
    failed: {
      bg: "bg-destructive",
      icon: "error-outline" as const,
      text: `${failedCount} venta${failedCount === 1 ? "" : "s"} fallida${failedCount === 1 ? "" : "s"} — requiere atención`,
      tappable: false,
    },
    pending: {
      bg: "bg-primary",
      icon: "cloud-upload" as const,
      text: `${pendingCount} pendiente${pendingCount === 1 ? "" : "s"} · tocar para sincronizar`,
      tappable: true,
    },
  }[state];

  const content = (
    <View
      className={`${config.bg} flex-row items-center justify-center gap-2 px-4 py-1.5`}
    >
      {isSyncing ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <MaterialIcons name={config.icon} size={14} color="#fff" />
      )}
      <Text className="text-xs font-semibold text-white" numberOfLines={1}>
        {config.text}
      </Text>
    </View>
  );

  if (!config.tappable) return content;
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={() => void syncNow()}>
      {content}
    </TouchableOpacity>
  );
}
