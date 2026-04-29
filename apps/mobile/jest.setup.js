/**
 * Jest setup — POS Chile mobile.
 *
 * Mocks que tienen que estar registrados ANTES de que cualquier import
 * los toque. `jest.config.js` lo carga vía `setupFiles` (pre-test, no
 * `setupFilesAfterEach`).
 */

// react-native-reanimated 4.x — sin este mock, cualquier componente que
// importe Animated.* desde reanimated explota con "Reanimated 2 failed
// to create a worklet". El mock viene incluido en la lib, solo hay que
// invocarlo en setup.
jest.mock("react-native-reanimated", () =>
  require("react-native-reanimated/mock"),
);

// expo-haptics — usa native module nativo. Mock minimal para que tests
// que lo invocan no rompan.
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: "light",
    Medium: "medium",
    Heavy: "heavy",
  },
  NotificationFeedbackType: {
    Success: "success",
    Warning: "warning",
    Error: "error",
  },
}));

// expo-secure-store — los tests de authStore necesitan poder simular
// tokens guardados/borrados sin tocar Keychain real.
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// @react-native-community/netinfo — mock estado online por default.
// Tests específicos de offline pueden override con `NetInfo.fetch.mockResolvedValue(...)`.
jest.mock("@react-native-community/netinfo", () => ({
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
    type: "wifi",
  }),
  addEventListener: jest.fn().mockReturnValue(() => {}),
}));

// Silenciar warning de NativeAnimatedHelper (RN 0.81). No afecta tests.
jest.mock("react-native/src/private/animated/NativeAnimatedHelper", () => ({}), {
  virtual: true,
});
