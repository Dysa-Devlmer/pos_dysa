import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View } from "react-native";

/**
 * Caja (POS) — placeholder M3. Se implementa en M4 (módulo Caja full).
 * Mantener consistencia visual con Dashboard para que el shell se vea
 * terminado antes de tener todos los módulos.
 */
export default function CajaScreen() {
  return (
    <SafeAreaView className="bg-background flex-1" edges={["top"]}>
      <View className="flex-1 items-center justify-center p-6">
        <View className="bg-primary/10 mb-5 h-20 w-20 items-center justify-center rounded-full">
          <MaterialIcons name="point-of-sale" size={40} color="#f97316" />
        </View>
        <Text className="text-foreground mb-2 text-center text-xl font-semibold">
          Caja POS
        </Text>
        <Text className="text-muted-foreground text-center">
          Punto de venta, carrito y cobros.{"\n"}Próximamente en M4.
        </Text>
      </View>
    </SafeAreaView>
  );
}
