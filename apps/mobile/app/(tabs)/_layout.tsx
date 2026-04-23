import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { useColorScheme } from "@/hooks/use-color-scheme";

/**
 * Bottom tabs del POS mobile — M3.
 *
 * Orden y naming alineados con las 4 tareas core del operador en caja:
 *   Caja (POS)  → Ventas (historial) → Dashboard (KPIs) → Más (perfil/módulos)
 *
 * Decisiones:
 * - MaterialIcons directo (mejor cobertura cross-platform que SF Symbols
 *   fallback del template; IconSymbol solo mapeaba 4 nombres).
 * - Colores tomados de la paleta SystemQR (tailwind.config.js): primary
 *   naranja #f97316 activo, neutro #737373 inactivo. En dark mode
 *   invertimos el inactivo a #a3a3a3 para contraste.
 * - headerShown:false — cada pantalla renderiza su propio header con
 *   SafeArea y acciones contextuales.
 */
export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#f97316",
        tabBarInactiveTintColor: isDark ? "#a3a3a3" : "#737373",
        tabBarStyle: {
          backgroundColor: isDark ? "#0a0a0a" : "#ffffff",
          borderTopColor: isDark ? "#262626" : "#e4decf",
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="caja"
        options={{
          title: "Caja",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="point-of-sale" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ventas"
        options={{
          title: "Ventas",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="receipt-long" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="bar-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="mas"
        options={{
          title: "Más",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="menu" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
