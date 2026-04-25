import { Redirect } from "expo-router";

/**
 * Root index — Expo Router necesita una ruta explícita para `/` o muestra
 * "Unmatched Route" en builds release antes de que el route guard de
 * `_layout.tsx` resuelva el redirect en JS.
 *
 * Redirect a `/(auth)/login` (archivo concreto: `app/(auth)/login.tsx`).
 * Si el usuario ya tiene token, el `useProtectedRoute` del root layout
 * lo bouncea inmediato a `/(tabs)`. Si no, se queda en login.
 *
 * Apuntamos a archivo concreto en vez de grupo `/(tabs)` porque el grupo
 * sin index.tsx puede no resolverse correctamente en cold-boot release.
 */
export default function Index() {
  return <Redirect href="/(auth)/login" />;
}
