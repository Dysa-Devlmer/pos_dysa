import * as Haptics from "expo-haptics";

/**
 * useHaptics — wrapper centralizado sobre expo-haptics.
 *
 * Por qué un hook en vez de llamar Haptics.* directo:
 * - Catch silencioso del error: en Android < 8 / dispositivos sin
 *   actuador háptico, expo-haptics rechaza la promesa. No queremos que
 *   un fallo háptico rompa el flow de UX (cobrar, agregar item, etc.).
 * - Naming semántico (light/medium/heavy/success/warning) en lugar de
 *   importar Haptics.NotificationFeedbackType.* en cada call site.
 * - Punto único para mock en tests (jest.mock("@/hooks/useHaptics")).
 *
 * Uso:
 *   const haptics = useHaptics();
 *   haptics.light();   // tap suave (qty +/-)
 *   haptics.medium();  // acción destructiva no final (eliminar item)
 *   haptics.success(); // venta cobrada
 *   haptics.warning(); // confirmación destructiva final (vaciar carrito)
 */
export const useHaptics = () => ({
  light: () =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  medium: () =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  heavy: () =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}),
  success: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    ),
  warning: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
      () => {},
    ),
  error: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
      () => {},
    ),
});
