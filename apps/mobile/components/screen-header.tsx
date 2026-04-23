import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

/**
 * Header reutilizable para las sub-pantallas del tab "Más" (M6).
 *
 * Estandariza: back button + título + slot opcional para acción a la
 * derecha (botón "Nuevo", "Guardar", etc.). Mantener consistencia visual
 * en todas las sub-vistas sin arrastrar un montón de boilerplate.
 */
export function ScreenHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <View className="border-border flex-row items-center gap-1 border-b px-2 pb-3 pt-1">
      <TouchableOpacity onPress={() => router.back()} className="p-2">
        <MaterialIcons name="arrow-back" size={24} color="#f97316" />
      </TouchableOpacity>
      <Text className="text-foreground flex-1 text-lg font-semibold">
        {title}
      </Text>
      {right}
    </View>
  );
}
