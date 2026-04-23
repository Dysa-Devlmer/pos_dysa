import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import {
  createApiClient,
  ApiClientError,
  LoginResponseSchema,
  type Rol,
} from "@repo/api-client";

/**
 * Auth store — Zustand slice para estado de sesión.
 *
 * Persistencia:
 * - Token JWT en `expo-secure-store` bajo key "pos_jwt" (Keychain iOS /
 *   EncryptedSharedPreferences Android)
 * - User object en memoria solamente — se re-fetchea o se restaura del JWT
 *   decodificado al bootstrap (M3 decidirá si necesita /api/v1/auth/me)
 *
 * Flujo:
 * - bootstrap() en app/_layout.tsx al arrancar → lee SecureStore y rehidrata
 * - login(email, password) → POST /api/v1/auth/login → guarda token + user
 * - logout() → limpia SecureStore + resetea state
 */

// Namespaced para evitar collision con otras apps del device que pudieran
// usar la misma key genérica. SecureStore es per-app en iOS/Android así
// que el riesgo real es bajo, pero la convención ayuda a debug y migración.
const TOKEN_KEY = "pos_chile_jwt";

// Base URL configurable via env. En prod queda apuntando al VPS.
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://dy-pos.zgamersa.com";

// API client singleton — compartido entre el store y (futuros) hooks de data.
export const apiClient = createApiClient({ baseUrl: API_BASE_URL });

export type AuthUser = {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;

  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true, // true durante bootstrap inicial
  error: null,

  /**
   * Lee el token de SecureStore al arrancar la app. Si existe, lo inyecta
   * en el apiClient para requests protegidas. No valida la firma del token
   * — eso lo hará el server al primer request.
   *
   * TODO M3: decodificar claims del JWT para popular `user` sin hit al
   * servidor, o llamar GET /api/v1/auth/me para refrescar el user.
   */
  bootstrap: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        apiClient.setToken(token);
        set({ token, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      console.error("[authStore] bootstrap error:", err);
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post(
        "/api/v1/auth/login",
        { email, password },
        LoginResponseSchema,
      );

      await SecureStore.setItemAsync(TOKEN_KEY, response.token);
      apiClient.setToken(response.token);

      set({
        token: response.token,
        user: response.user,
        isLoading: false,
        error: null,
      });
      return true;
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : "Error inesperado al iniciar sesión";
      set({ isLoading: false, error: message });
      return false;
    }
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (err) {
      console.error("[authStore] logout SecureStore error:", err);
    }
    apiClient.setToken(null);
    set({ token: null, user: null, error: null });
  },
}));
