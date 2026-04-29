/**
 * Unit tests — authStore (zustand) — POS mobile.
 *
 * Cubre las invariantes del path crítico de auth (M2 + SS4 audit):
 *   - bootstrap() lee SecureStore, hidrata token si existe
 *   - bootstrap() respeta timeout 3s si SecureStore se cuelga (SS4)
 *   - bootstrap() error path → isLoading:false, sin token
 *   - login(email, pwd) happy: POST /auth/login, guarda token, set user
 *   - login() 401: ApiClientError → error message visible, no token guardado
 *   - logout() limpia SecureStore + apiClient.setToken(null) + reset state
 *   - logout() error en SecureStore: igual resetea state (no leak)
 *
 * Día 5 (audit Claude Code CLI 2026-04-28): segundo de los 3 tests
 * prioritarios definidos en reporte.md §B. Cobertura del path crítico
 * de auth — sin estos tests, una regresión en login/logout/bootstrap
 * deja al usuario sin poder operar y sin manera de detectarlo
 * pre-merge.
 */

// MOCKS antes del import del store (Jest hoistea jest.mock al top).
jest.mock("@repo/api-client", () => {
  const actual = jest.requireActual("@repo/api-client");
  return {
    ...actual,
    createApiClient: jest.fn(() => ({
      post: jest.fn(),
      get: jest.fn(),
      setToken: jest.fn(),
    })),
  };
});

import * as SecureStore from "expo-secure-store";
import { ApiClientError } from "@repo/api-client";

import { apiClient, useAuthStore } from "../stores/authStore";

const mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockedApiPost = apiClient.post as jest.MockedFunction<
  typeof apiClient.post
>;
const mockedApiSetToken = apiClient.setToken as jest.MockedFunction<
  typeof apiClient.setToken
>;

const userMock = {
  id: "1",
  email: "admin@pos-chile.cl",
  nombre: "Admin",
  rol: "ADMIN" as const,
};

describe("authStore", () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: null,
      user: null,
      isLoading: true,
      error: null,
    });
    jest.clearAllMocks();

    mockedSecureStore.getItemAsync.mockResolvedValue(null);
    mockedSecureStore.setItemAsync.mockResolvedValue(undefined);
    mockedSecureStore.deleteItemAsync.mockResolvedValue(undefined);
  });

  // ─── bootstrap ───────────────────────────────────────────────────

  test("bootstrap sin token guardado: isLoading=false, sin set token", async () => {
    mockedSecureStore.getItemAsync.mockResolvedValue(null);

    await useAuthStore.getState().bootstrap();

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(mockedApiSetToken).not.toHaveBeenCalled();
  });

  test("bootstrap con token guardado: hidrata + setea apiClient", async () => {
    mockedSecureStore.getItemAsync.mockResolvedValue("jwt-abc-123");

    await useAuthStore.getState().bootstrap();

    const state = useAuthStore.getState();
    expect(state.token).toBe("jwt-abc-123");
    expect(state.isLoading).toBe(false);
    expect(mockedApiSetToken).toHaveBeenCalledWith("jwt-abc-123");
  });

  test("bootstrap SecureStore error: resetea isLoading sin colgarse", async () => {
    mockedSecureStore.getItemAsync.mockRejectedValue(
      new Error("Keystore corrupto"),
    );

    await useAuthStore.getState().bootstrap();

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  test("bootstrap SS4 timeout: si SecureStore se cuelga > 3s asume null token", async () => {
    // Simular hang: la promesa nunca resuelve. El timeout interno del
    // store debería resolver con null antes de los 3.5s.
    mockedSecureStore.getItemAsync.mockImplementation(
      () => new Promise(() => {}), // never resolves
    );

    jest.useFakeTimers();
    const bootstrapPromise = useAuthStore.getState().bootstrap();
    // Avanza el reloj 3.1s para disparar el setTimeout interno
    jest.advanceTimersByTime(3100);
    await bootstrapPromise;
    jest.useRealTimers();

    const state = useAuthStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.token).toBeNull();
  });

  // ─── login ───────────────────────────────────────────────────────

  test("login happy: POST OK, guarda token en SecureStore, setea user", async () => {
    mockedApiPost.mockResolvedValue({
      token: "new-jwt",
      user: userMock,
    } as never);

    const ok = await useAuthStore
      .getState()
      .login("admin@pos-chile.cl", "admin123");

    expect(ok).toBe(true);
    const state = useAuthStore.getState();
    expect(state.token).toBe("new-jwt");
    expect(state.user).toEqual(userMock);
    expect(state.error).toBeNull();
    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
      "pos_chile_jwt",
      "new-jwt",
    );
    expect(mockedApiSetToken).toHaveBeenCalledWith("new-jwt");
  });

  test("login 401 (ApiClientError): error message visible, sin token persistido", async () => {
    mockedApiPost.mockRejectedValue(
      new ApiClientError("Credenciales inválidas", 401),
    );

    const ok = await useAuthStore
      .getState()
      .login("admin@pos-chile.cl", "wrong");

    expect(ok).toBe(false);
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.error).toBe("Credenciales inválidas");
    expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  test("login error genérico (network): mensaje fallback español", async () => {
    mockedApiPost.mockRejectedValue(new Error("Network down"));

    const ok = await useAuthStore.getState().login("a@b.cl", "x");

    expect(ok).toBe(false);
    expect(useAuthStore.getState().error).toBe(
      "Error inesperado al iniciar sesión",
    );
  });

  test("login resetea error previo en cada intento", async () => {
    useAuthStore.setState({ error: "error viejo" });
    mockedApiPost.mockResolvedValue({
      token: "jwt",
      user: userMock,
    } as never);

    await useAuthStore.getState().login("a@b.cl", "x");

    expect(useAuthStore.getState().error).toBeNull();
  });

  // ─── logout ──────────────────────────────────────────────────────

  test("logout limpia SecureStore + apiClient + state", async () => {
    useAuthStore.setState({
      token: "jwt-abc",
      user: userMock,
    });

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.error).toBeNull();
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith(
      "pos_chile_jwt",
    );
    expect(mockedApiSetToken).toHaveBeenCalledWith(null);
  });

  test("logout error en SecureStore: igual resetea state (no leak sesión)", async () => {
    useAuthStore.setState({ token: "jwt-abc", user: userMock });
    mockedSecureStore.deleteItemAsync.mockRejectedValue(
      new Error("Keystore locked"),
    );

    await useAuthStore.getState().logout();

    // Crítico: aunque SecureStore falle, el state local debe quedar sin
    // token. Si quedara, el siguiente render mostraría tabs en lugar de
    // login y el usuario seguiría "logueado" sin token válido.
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(mockedApiSetToken).toHaveBeenCalledWith(null);
  });
});
