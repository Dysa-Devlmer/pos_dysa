import React from "react";
import { useQuery } from "@tanstack/react-query";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DashboardResponseSchema } from "@repo/api-client";

import { ScreenHeader } from "@/components/screen-header";
import { apiClient } from "@/stores/authStore";

/**
 * Alertas de stock — M6. Reusa GET /api/v1/dashboard que ya devuelve
 * `stockCritico.productos[]` (stock <= alertaStock). No duplicamos
 * endpoint porque el cálculo es idéntico.
 *
 * El badge rojo enfatiza urgencia — en caja un item sin stock genera
 * 409 al vender y bloquea el flujo; mejor saberlo antes.
 */

async function fetchAlertas() {
  const { data } = await apiClient.get(
    "/api/v1/dashboard",
    DashboardResponseSchema,
  );
  return data.stockCritico;
}

export default function AlertasScreen() {
  const query = useQuery({
    queryKey: ["alertas", "stock"],
    queryFn: fetchAlertas,
  });

  return (
    <SafeAreaView className="bg-background flex-1" edges={["top"]}>
      <ScreenHeader title="Alertas de stock" />
      {query.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : (
        <>
          <View className="bg-destructive/10 mx-4 mt-3 flex-row items-center gap-2 rounded-xl p-3">
            <MaterialIcons name="warning" size={20} color="#dc2626" />
            <Text className="text-destructive flex-1 font-semibold">
              {query.data?.count ?? 0} producto
              {(query.data?.count ?? 0) === 1 ? "" : "s"} con stock crítico
            </Text>
          </View>
          <FlatList
            data={query.data?.productos ?? []}
            keyExtractor={(p) => String(p.id)}
            contentContainerClassName="p-4 gap-2"
            refreshControl={
              <RefreshControl
                refreshing={query.isRefetching}
                onRefresh={() => query.refetch()}
                tintColor="#f97316"
              />
            }
            ListEmptyComponent={
              <View className="items-center py-12">
                <MaterialIcons name="check-circle" size={40} color="#16a34a" />
                <Text className="text-muted-foreground mt-2">
                  Todo el stock está al día
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View className="bg-card border-destructive/30 rounded-xl border p-4">
                <Text className="text-foreground font-semibold">
                  {item.nombre}
                </Text>
                <Text className="text-muted-foreground mt-1 text-xs">
                  Stock actual: {item.stock} · alerta en {item.alertaStock}
                </Text>
              </View>
            )}
          />
        </>
      )}
    </SafeAreaView>
  );
}
