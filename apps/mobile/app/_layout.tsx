import "@/global.css"; // NativeWind v4 — import global ANTES de cualquier componente

import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from "@tanstack/react-query";
import { AppState, type AppStateStatus } from "react-native";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/hooks/useAuth";
import { useSyncStore } from "@/stores/syncStore";
import { initDb } from "@/db/client";
import { SyncBanner } from "@/components/sync-banner";
import { UpdateBanner } from "@/components/update-banner";

/**
 * React Query client — singleton para toda la app mobile.
 *
 * Defaults pensados para POS mobile:
 * - staleTime 30s → KPIs del dashboard no mutan tan rápido; evita refetch
 *   agresivo al cambiar de tab.
 * - retry 1 → fail-fast en red mala (usuario prefiere error claro que
 *   app colgada 3×10s).
 * - refetchOnWindowFocus → true vía focusManager wiring abajo.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

// React Query no sabe de AppState en RN → hook manual para que los queries
// se refresquen al volver a foreground (equivalente a window focus en web).
AppState.addEventListener("change", (status: AppStateStatus) => {
  focusManager.setFocused(status === "active");
  // Al volver a foreground, intentar drenar la queue offline (M5). El
  // syncStore internamente chequea isOnline + isSyncing y retorna
  // "offline"/"skipped" si no corresponde.
  if (status === "active") {
    void useSyncStore.getState().syncNow();
  }
});

/**
 * Route guard global — M2 Auth.
 *
 * - Al arrancar: bootstrap() lee SecureStore y rehidrata el store.
 * - Durante isLoading: muestra un loader centered.
 * - Sin token + user fuera de (auth) → redirect a /(auth)/login
 * - Con token + user en (auth) → redirect a /(tabs)
 *
 * Gotcha G-M01 aplicado: usamos JWT Bearer (no cookies). El flujo es
 * 100% stateless — si SecureStore está vacío, volvemos a login.
 */
function useProtectedRoute(token: string | null, isLoading: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!token && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (token && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [token, isLoading, segments, router]);
}

function RootLayoutNav() {
  const { token, isLoading, bootstrap } = useAuth();
  const syncBootstrap = useSyncStore((s) => s.bootstrap);
  const colorScheme = useColorScheme();

  useEffect(() => {
    bootstrap();
    // Offline stack bootstrap — M5. initDb() asegura que la tabla
    // sync_queue existe antes de que caja.tsx intente encolar. El
    // syncStore.bootstrap() cuenta pendientes + suscribe NetInfo.
    // Ambos son fire-and-forget; errores se loggean internamente y no
    // bloquean el arranque de la UI (modo degradado: app funciona
    // pero sin offline si SQLite explota).
    (async () => {
      try {
        await initDb();
        await syncBootstrap();
      } catch (e) {
        console.warn("[root] offline bootstrap failed:", e);
      }
    })();
  }, [bootstrap, syncBootstrap]);

  useProtectedRoute(token, isLoading);

  if (isLoading) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      {/* SyncBanner va FUERA del Stack para persistir en todas las tabs
          y la pantalla de login. Su visibilidad la decide el propio
          componente según el estado del store. */}
      <SyncBanner />
      {/* UpdateBanner — Fase 2 M7. Consulta /api/mobile/manifest al abrir la
          app y muestra banner/modal si hay update. Se auto-oculta si no hay
          update o si el usuario dismisseó. ForceUpdate bloquea el acceso. */}
      <UpdateBanner />
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutNav />
    </QueryClientProvider>
  );
}
