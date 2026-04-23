import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Link } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/hooks/useAuth";

/**
 * Menú del tab "Más" — M6.
 *
 * Estructura alineada con la sidebar del /web:
 *   - Catálogo: productos, categorías, clientes
 *   - Operación: alertas, descuentos, devoluciones
 *   - Cuenta: perfil, logout
 *
 * `disabled` se usa sólo para entries que requieren rol ADMIN (usuarios)
 * cuando el user no es admin, para que la navegación no explote en el
 * server con 403.
 */

type ItemProps = {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  hint?: string;
  disabled?: boolean;
  href?: string;
  onPress?: () => void;
};

function Item({ icon, label, hint, disabled, href, onPress }: ItemProps) {
  const body = (
    <View
      className={`border-border bg-card flex-row items-center gap-3 border-b px-4 py-4 ${
        disabled ? "opacity-60" : ""
      }`}
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
          className={`text-base font-medium ${disabled ? "text-muted-foreground" : "text-foreground"}`}
        >
          {label}
        </Text>
        {hint ? (
          <Text className="text-muted-foreground mt-0.5 text-xs">{hint}</Text>
        ) : null}
      </View>
      <MaterialIcons name="chevron-right" size={22} color="#a3a3a3" />
    </View>
  );

  if (href && !disabled) {
    return (
      <Link href={href as never} asChild>
        <TouchableOpacity activeOpacity={0.7}>{body}</TouchableOpacity>
      </Link>
    );
  }
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled}
      onPress={onPress}
    >
      {body}
    </TouchableOpacity>
  );
}

export default function MasMenu() {
  const { user, logout } = useAuth();
  const isAdmin = user?.rol === "ADMIN";

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
        <Item
          icon="inventory-2"
          label="Productos"
          href="/(tabs)/mas/productos"
        />
        <Item
          icon="category"
          label="Categorías"
          href="/(tabs)/mas/categorias"
        />
        <Item icon="people" label="Clientes" href="/(tabs)/mas/clientes" />

        <Text className="text-muted-foreground px-4 pb-2 pt-6 text-xs font-semibold uppercase tracking-wider">
          Operación
        </Text>
        <Item
          icon="warning"
          label="Alertas de stock"
          href="/(tabs)/mas/alertas"
        />
        <Item
          icon="local-offer"
          label="Descuentos"
          href="/(tabs)/mas/descuentos"
          hint="Solo lectura"
        />
        <Item
          icon="assignment-return"
          label="Devoluciones"
          href="/(tabs)/mas/devoluciones"
        />

        <Text className="text-muted-foreground px-4 pb-2 pt-6 text-xs font-semibold uppercase tracking-wider">
          Cuenta
        </Text>
        <Item icon="person" label="Mi perfil" href="/(tabs)/mas/perfil" />
        {isAdmin ? (
          <Item
            icon="admin-panel-settings"
            label="Usuarios"
            hint="Solo ADMIN"
            href="/(tabs)/mas/usuarios"
          />
        ) : null}
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
