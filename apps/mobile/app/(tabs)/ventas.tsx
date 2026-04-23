import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View } from "react-native";

/**
 * Ventas (historial) — placeholder M3. Implementación full en M5
 * (listado con filtros, detalle de boleta, anulación).
 */
export default function VentasScreen() {
  return (
    <SafeAreaView className="bg-background flex-1" edges={["top"]}>
      <View className="flex-1 items-center justify-center p-6">
        <View className="bg-primary/10 mb-5 h-20 w-20 items-center justify-center rounded-full">
          <MaterialIcons name="receipt-long" size={40} color="#f97316" />
        </View>
        <Text className="text-foreground mb-2 text-center text-xl font-semibold">
          Historial de ventas
        </Text>
        <Text className="text-muted-foreground text-center">
          Listado de boletas, filtros y detalle.{"\n"}Próximamente en M5.
        </Text>
      </View>
    </SafeAreaView>
  );
}
