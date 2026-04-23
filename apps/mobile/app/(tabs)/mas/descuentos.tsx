import React from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/screen-header";

/**
 * Descuentos — M6 read-only placeholder.
 *
 * El módulo de Descuentos en web es un catálogo de promociones con
 * reglas (porcentaje, monto fijo, combos). El backend NO expone todavía
 * un endpoint v1 — y el cajero mobile hoy aplica descuentos manuales
 * desde el cart (applyDiscountPct / applyDiscountMonto en cartStore).
 *
 * Esta pantalla documenta el feature y evita dejar un "coming soon"
 * agresivo. Cuando se exponga /api/v1/descuentos, acá va el listado.
 */
export default function DescuentosScreen() {
  return (
    <SafeAreaView className="bg-background flex-1" edges={["top"]}>
      <ScreenHeader title="Descuentos" />
      <ScrollView contentContainerClassName="p-4 gap-3">
        <View className="bg-card border-border rounded-xl border p-4">
          <View className="mb-2 flex-row items-center gap-2">
            <MaterialIcons name="local-offer" size={22} color="#f97316" />
            <Text className="text-foreground text-lg font-semibold">
              Descuentos en caja
            </Text>
          </View>
          <Text className="text-muted-foreground text-sm">
            Los descuentos se aplican directamente en el carrito al momento
            de cobrar. Desde la pantalla Caja puedes seleccionar:
          </Text>
          <View className="mt-3 gap-2">
            <Bullet text="Descuento por porcentaje (0–100%)" />
            <Bullet text="Descuento por monto fijo (CLP)" />
          </View>
          <Text className="text-muted-foreground mt-3 text-xs">
            El catálogo de promociones predefinidas se gestiona desde el
            panel web. Esta vista se actualizará cuando esté disponible
            vía API.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <View className="bg-primary h-1.5 w-1.5 rounded-full" />
      <Text className="text-foreground flex-1 text-sm">{text}</Text>
    </View>
  );
}
