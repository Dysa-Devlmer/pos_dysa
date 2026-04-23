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
  const colorScheme = useColorScheme();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

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
