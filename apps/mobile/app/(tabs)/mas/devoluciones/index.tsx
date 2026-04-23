import React from "react";
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
import { z } from "zod";

import { DevolucionSchema, type Devolucion } from "@repo/api-client";
import { formatCLP } from "@repo/domain";

import { ScreenHeader } from "@/components/screen-header";
import { apiClient } from "@/stores/authStore";

/**
 * Listado de devoluciones — M6.
 *
 * CTA "+ Nueva" abre el form sin venta precargada. Desde el detalle de
 * una venta el usuario también puede entrar con `?ventaId=X` ya seteado.
 */

const Resp = z.object({
  data: z.array(DevolucionSchema),
  meta: z
    .object({
      page: z.number(),
      limit: z.number(),
      total: z.number().optional(),
    })
    .optional(),
});

async function fetchDevoluciones(): Promise<Devolucion[]> {
  const { data } = await apiClient.get(
    "/api/v1/devoluciones",
    Resp,
    { limit: 30 },
  );
  return data;
}

export default function DevolucionesListScreen() {
  const query = useQuery({
    queryKey: ["devoluciones", "list"],
    queryFn: fetchDevoluciones,
  });

  return (
    <SafeAreaView className="bg-background flex-1" edges={["top"]}>
      <ScreenHeader
        title="Devoluciones"
        right={
          <Link href="/(tabs)/mas/devoluciones/nueva" asChild>
            <TouchableOpacity className="p-2">
              <MaterialIcons name="add" size={24} color="#f97316" />
            </TouchableOpacity>
          </Link>
        }
      />
      {query.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : (
        <FlatList
          data={query.data ?? []}
          keyExtractor={(d) => String(d.id)}
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
              <MaterialIcons
                name="assignment-return"
                size={40}
                color="#a3a3a3"
              />
              <Text className="text-muted-foreground mt-2">
                Sin devoluciones registradas
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View className="bg-card border-border rounded-xl border p-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-foreground font-semibold">
                  {item.venta?.numeroBoleta ?? `Venta #${item.ventaId}`}
                </Text>
                {item.esTotal ? (
                  <View className="bg-destructive/10 rounded-full px-2 py-0.5">
                    <Text className="text-destructive text-[10px] font-semibold uppercase">
                      Total
                    </Text>
                  </View>
                ) : (
                  <View className="bg-warning/10 rounded-full px-2 py-0.5">
                    <Text className="text-warning text-[10px] font-semibold uppercase">
                      Parcial
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-muted-foreground mt-1 text-xs">
                {new Date(item.fecha).toLocaleDateString("es-CL")} ·{" "}
                {item._count?.items ?? item.items?.length ?? 0} ítem(s)
              </Text>
              <Text className="text-foreground mt-2 text-sm" numberOfLines={2}>
                {item.motivo}
              </Text>
              <Text className="text-foreground mt-2 font-bold">
                {formatCLP(item.montoDevuelto)}
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
