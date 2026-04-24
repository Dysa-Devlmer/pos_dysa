import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { isUpdateAvailable, isForceUpdate } from "@/lib/version";

/**
 * Hook que chequea si hay una nueva versión del APK disponible.
 *
 * Flujo:
 *   1. Lee la versión instalada desde `expo-constants` (inyectada en build time
 *      desde `app.json`.expo.version).
 *   2. Fetchea `GET /api/mobile/manifest?platform=ANDROID` al backend.
 *   3. Compara semver. Devuelve estado structurado para el UpdateBanner.
 *
 * Cache strategy:
 *   - staleTime 5 min → no spam al backend si el user cambia de tab
 *   - refetch on app focus (useQuery default + focusManager configurado
 *     en `_layout.tsx`) — así si el user deja la app abierta toda la noche
 *     y al día siguiente hay release nueva, la detecta sin reiniciar app.
 *
 * Failure mode:
 *   - Si el fetch falla (red, 500, etc) → devuelve `{ updateAvailable: false }`.
 *     No queremos que un backend caído bloquee al usuario ni muestre banners
 *     engañosos. El update check es best-effort, no crítico.
 *   - Si el backend devuelve 404 (sin releases publicadas) → también
 *     `updateAvailable: false`. Pasa en la primera instalación del sistema
 *     antes del primer publish.
 */

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://dy-pos.zgamersa.com";

type ManifestResponse = {
  version: string;
  versionCode: number;
  apkUrl: string;
  notes: string | null;
  minVersion: string | null;
  publishedAt: string;
  platform: "ANDROID" | "IOS";
};

export type UpdateCheckResult = {
  /** Hay versión más nueva disponible. */
  updateAvailable: boolean;
  /** La versión actual es menor al minVersion → update obligatorio. */
  forceUpdate: boolean;
  /** Versión instalada (from app.json). */
  installedVersion: string;
  /** Datos del release remoto, si existen. */
  remote: ManifestResponse | null;
};

export function useUpdateCheck(): {
  data: UpdateCheckResult | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const installedVersion =
    (Constants.expoConfig?.version as string | undefined) ?? "0.0.0";

  // Solo chequeamos en Android por ahora. iOS usa App Store (si algún día
  // se publica ahí) o su propio flow distinto de distribución.
  const platform = Platform.OS === "android" ? "ANDROID" : null;

  const query = useQuery<UpdateCheckResult>({
    queryKey: ["mobile-manifest", platform, installedVersion],
    enabled: platform === "ANDROID",
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 30 * 60 * 1000,
    retry: 1,
    queryFn: async (): Promise<UpdateCheckResult> => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/mobile/manifest?platform=${platform}`,
          { headers: { Accept: "application/json" } },
        );

        // 404 = no hay releases publicadas → tratar como "no update".
        if (res.status === 404) {
          return {
            updateAvailable: false,
            forceUpdate: false,
            installedVersion,
            remote: null,
          };
        }

        if (!res.ok) {
          // Otro error (429, 500, etc) → fail-safe: no mostramos banner.
          console.warn(`[useUpdateCheck] manifest fetch failed: ${res.status}`);
          return {
            updateAvailable: false,
            forceUpdate: false,
            installedVersion,
            remote: null,
          };
        }

        const remote = (await res.json()) as ManifestResponse;
        return {
          updateAvailable: isUpdateAvailable(installedVersion, remote.version),
          forceUpdate: isForceUpdate(installedVersion, remote.minVersion),
          installedVersion,
          remote,
        };
      } catch (err) {
        // Red caída, timeout, DNS, etc. Swallow silently — no es crítico.
        console.warn("[useUpdateCheck] network error:", err);
        return {
          updateAvailable: false,
          forceUpdate: false,
          installedVersion,
          remote: null,
        };
      }
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
