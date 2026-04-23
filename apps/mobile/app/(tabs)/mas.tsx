import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/hooks/useAuth";

/**
 * Más — menú de módulos secundarios + sesión del usuario.
 *
 * Mobile replica la navegación "avanzada" del sidebar web en esta pantalla:
 * productos, clientes, categorías, alertas, reportes, etc. Cada entry es
 * un placeholder hasta que la fase correspondiente entregue la vista.
 *
 * El bloque de sesión (avatar + logout) vive acá porque no hay "user menu"
 * persistente en un tab bar — este es el punto natural.
 */

type ItemProps = {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  hint?: string;
  disabled?: boolean;
  onPress?: () => void;
};

function Item({ icon, label, hint, disabled, onPress }: ItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      className="border-border bg-card flex-row items-center gap-3 border-b px-4 py-4"
    >
      <View className="bg-muted h-10 w-10 items-center justify-center rounded-full">
        <MaterialIcons
          name={icon}
          size={22}
          color={disabled ? "#a3a3a3" : "#f97316"}
        />
      </View>
      <View className="flex-1">
        <Text
          className={`text-base font-medium ${
            disabled ? "text-muted-foreground" : "text-foreground"
          }`}
        >
          {label}
        </Text>
        {hint ? (
          <Text className="text-muted-foreground mt-0.5 text-xs">{hint}</Text>
        ) : null}
      </View>
      <MaterialIcons name="chevron-right" size={22} color="#a3a3a3" />
    </TouchableOpacity>
  );
}

export default function MasScreen() {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView className="bg-background flex-1" edges={["top"]}>
      <ScrollView contentContainerClassName="pb-8">
        {/* Header con usuario */}
        <View className="bg-card border-border border-b px-4 py-6">
          <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            Sesión
          </Text>
          <Text className="text-foreground mt-2 text-lg font-semibold">
            {user?.nombre ?? "—"}
          </Text>
          <Text className="text-muted-foreground text-sm">
            {user?.email ?? ""}
          </Text>
          <View className="bg-primary/10 mt-2 self-start rounded-full px-2 py-0.5">
            <Text className="text-primary text-[11px] font-semibold uppercase tracking-wider">
              {user?.rol ?? ""}
            </Text>
          </View>
        </View>

        <Text className="text-muted-foreground px-4 pb-2 pt-6 text-xs font-semibold uppercase tracking-wider">
          Catálogo
        </Text>
        <Item icon="inventory-2" label="Productos" hint="M4" disabled />
        <Item icon="category" label="Categorías" hint="M4" disabled />
        <Item icon="people" label="Clientes" hint="M5" disabled />

        <Text className="text-muted-foreground px-4 pb-2 pt-6 text-xs font-semibold uppercase tracking-wider">
          Operación
        </Text>
        <Item icon="warning" label="Alertas de stock" hint="M6" disabled />
        <Item icon="local-offer" label="Descuentos" hint="M6" disabled />
        <Item icon="assignment-return" label="Devoluciones" hint="M6" disabled />

        <Text className="text-muted-foreground px-4 pb-2 pt-6 text-xs font-semibold uppercase tracking-wider">
          Cuenta
        </Text>
        <Item icon="person" label="Mi perfil" hint="M6" disabled />
        <Item
          icon="logout"
          label="Cerrar sesión"
          onPress={() => {
            void logout();
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
