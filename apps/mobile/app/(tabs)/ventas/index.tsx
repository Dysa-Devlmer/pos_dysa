import { useQuery } from "@tanstack/react-query";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Link } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  VentasListResponseSchema,
  type Venta,
} from "@repo/api-client";
import { formatCLP } from "@repo/domain";

import { apiClient } from "@/stores/authStore";

/**
 * Listado de ventas — primer nivel del tab Ventas (M6).
 *
 * Decisiones:
 *   - Paginación client-side simple: pedimos limit=30 y mostramos sin
 *     infinite scroll todavía. POS real rara vez requiere ver >30 ventas
 *     de un día en mobile; reportes largos se hacen desde web.
 *   - Pull-to-refresh es la única invalidación explícita — no cache TTL
 *     corto porque ventas son inmutables una vez creadas (soft-delete o
 *     devolución se reflejan en fases separadas).
 *   - Cada card linkea a /ventas/[id] donde está el detalle + CTA de
 *     "Crear devolución".
 */

async function fetchVentas(): Promise<Venta[]> {
  const resp = await apiClient.get(
    "/api/v1/ventas",
    VentasListResponseSchema,
    { limit: 30 },
  );
  return resp.data;
}

function MetodoPagoBadge({ metodo }: { metodo: Venta["metodoPago"] }) {
  const map: Record<Venta["metodoPago"], string> = {
    EFECTIVO: "bg-success/10 text-success",
    DEBITO: "bg-primary/10 text-primary",
    CREDITO: "bg-warning/10 text-warning",
    TRANSFERENCIA: "bg-muted text-foreground",
    // F-9 split tender (commit 60d5dd9): cuando una venta combina ≥2 métodos
    // de pago, Prisma persiste `metodoPago = MIXTO` y el detalle queda en
    // Pago[]. Color accent (chart-4 rosado) para distinguirlo visualmente
    // de los métodos puros — en futuro se puede iconificar con un split icon.
    MIXTO: "bg-accent text-accent-foreground",
  };
  return (
    <View className={`${map[metodo]} rounded-full px-2 py-0.5`}>
      <Text className={`${map[metodo]} text-[10px] font-semibold`}>
        {metodo}
      </Text>
    </View>
  );
}

function formatFecha(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("es-CL")} · ${d.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export default function VentasListScreen() {
  const query = useQuery({
    queryKey: ["ventas", "list"],
    queryFn: fetchVentas,
  });

  return (
    <SafeAreaView className="bg-background flex-1" edges={["top"]}>
      <View className="border-border flex-row items-center justify-between border-b px-4 pb-3 pt-1">
        <Text className="text-foreground text-xl font-semibold">
          Historial de ventas
        </Text>
        <TouchableOpacity
          onPress={() => query.refetch()}
          disabled={query.isFetching}
          className="p-2"
        >
          <MaterialIcons
            name="refresh"
            size={22}
            color={query.isFetching ? "#a3a3a3" : "#f97316"}
          />
        </TouchableOpacity>
      </View>

      {query.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : query.isError ? (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-destructive text-center">
            Error al cargar ventas: {(query.error as Error).message}
          </Text>
        </View>
      ) : (
        <FlatList
          data={query.data ?? []}
          keyExtractor={(v) => String(v.id)}
          contentContainerClassName="p-4 gap-2"
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => query.refetch()}
              tintColor="#f97316"
            />
          }
          ListEmptyComponent={
            <View className="items-center py-16">
              <MaterialIcons name="receipt-long" size={40} color="#a3a3a3" />
              <Text className="text-muted-foreground mt-2">
                Sin ventas registradas
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Link href={`/(tabs)/ventas/${item.id}`} asChild>
              <TouchableOpacity
                activeOpacity={0.7}
                className="bg-card border-border rounded-xl border p-4"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-foreground font-semibold">
                    {item.numeroBoleta}
                  </Text>
                  <MetodoPagoBadge metodo={item.metodoPago} />
                </View>
                <Text className="text-muted-foreground mt-1 text-xs">
                  {formatFecha(item.fecha)}
                </Text>
                <View className="mt-2 flex-row items-center justify-between">
                  <Text className="text-muted-foreground text-sm">
                    {item.cliente?.nombre ?? "Sin cliente"}
                  </Text>
                  <Text className="text-foreground text-base font-bold">
                    {formatCLP(item.total)}
                  </Text>
                </View>
              </TouchableOpacity>
            </Link>
          )}
        />
      )}
    </SafeAreaView>
  );
}
