import { Stack } from "expo-router";

/**
 * Stack navigator para rutas de autenticación (login, register si hubiera).
 * Sin header — la pantalla gestiona su propia UI.
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
      }}
    >
      <Stack.Screen name="login" />
    </Stack>
  );
}
