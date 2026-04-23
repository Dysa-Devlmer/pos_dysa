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
import { z } from "zod";

import { CategoriaSchema, type Categoria } from "@repo/api-client";

import { ScreenHeader } from "@/components/screen-header";
import { apiClient } from "@/stores/authStore";

/**
 * Categorías — pantalla read-only M6.
 *
 * CRUD vive en web (form con validación de nombre único + verificación
 * de productos asociados antes de eliminar). Mobile sólo muestra el
 * listado para que el cajero entienda el catálogo al vender o al buscar
 * productos por categoría (M6+ feature).
 */

const Resp = z.object({ data: z.array(CategoriaSchema) });

async function fetchCategorias(): Promise<Categoria[]> {
  const { data } = await apiClient.get("/api/v1/categorias", Resp);
  return data;
}

export default function CategoriasScreen() {
  const query = useQuery({
    queryKey: ["categorias"],
    queryFn: fetchCategorias,
  });

  return (
    <SafeAreaView className="bg-background flex-1" edges={["top"]}>
      <ScreenHeader title="Categorías" />
      {query.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : (
        <FlatList
          data={query.data ?? []}
          keyExtractor={(c) => String(c.id)}
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
              <MaterialIcons name="category" size={40} color="#a3a3a3" />
              <Text className="text-muted-foreground mt-2">
                Sin categorías
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View className="bg-card border-border flex-row items-center gap-3 rounded-xl border p-4">
              <View className="bg-primary/10 h-10 w-10 items-center justify-center rounded-full">
                <MaterialIcons name="folder" size={22} color="#f97316" />
              </View>
              <View className="flex-1">
                <Text className="text-foreground font-semibold">
                  {item.nombre}
                </Text>
                {item.descripcion ? (
                  <Text
                    className="text-muted-foreground text-xs"
                    numberOfLines={1}
                  >
                    {item.descripcion}
                  </Text>
                ) : null}
                <Text className="text-muted-foreground mt-0.5 text-[11px]">
                  {item._count?.productos ?? 0} producto
                  {(item._count?.productos ?? 0) === 1 ? "" : "s"}
                  {item.activa ? "" : " · inactiva"}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
