import { useAuthStore } from "@/stores/authStore";

/**
 * Hook de conveniencia para consumir el estado auth sin importar el store
 * directamente. Facilita swap de implementación (Redux, Jotai, etc.) si
 * en el futuro se decide cambiar.
 *
 * Uso:
 *   const { user, token, login, logout, isAuthenticated } = useAuth();
 */
export function useAuth() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const bootstrap = useAuthStore((s) => s.bootstrap);

  return {
    token,
    user,
    isLoading,
    error,
    isAuthenticated: Boolean(token),
    login,
    logout,
    bootstrap,
  };
}
