import { Stack } from "expo-router";

/**
 * Stack del tab "Más" — M6.
 *
 * Convierte el antiguo mas.tsx (lista estática con placeholders) en un
 * navegador real que permite drill-down a las secciones secundarias del
 * POS: clientes, productos, alertas, devoluciones, categorías, usuarios
 * y perfil. Paridad funcional con la sidebar del /web.
 *
 * Cada pantalla maneja su propia SafeArea + header — por eso
 * headerShown:false en toda la stack. Mantenemos consistencia con el
 * resto del app (_layout raíz y tabs).
 */
export default function MasLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
