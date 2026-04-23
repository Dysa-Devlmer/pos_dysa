import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Link } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  ClientesListResponseSchema,
  type Cliente,
} from "@repo/api-client";

import { ScreenHeader } from "@/components/screen-header";
import { apiClient } from "@/stores/authStore";

/**
 * Listado de clientes con búsqueda por nombre o RUT — M6.
 * Tap → detalle (/mas/clientes/[id]). Botón "Nuevo" → formulario de alta.
 *
 * Search se debounce por 250ms para no generar una request por tecla.
 */

async function fetchClientes(search: string): Promise<Cliente[]> {
  const resp = await apiClient.get(
    "/api/v1/clientes",
    ClientesListResponseSchema,
    { search: search || undefined, limit: 30 },
  );
  return resp.data;
}

export default function ClientesScreen() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  // Debounce manual con useEffect+setTimeout para evitar dep de lodash.
  // 250ms es lo mínimo para que no se sienta lag en iOS Simulator con
  // teclado virtual; en device real probablemente se puede bajar a 150.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const query = useQuery({
    queryKey: ["clientes", "list", debounced],
    queryFn: () => fetchClientes(debounced),
  });

  return (
    <SafeAreaView className="bg-background flex-1" edges={["top"]}>
      <ScreenHeader
        title="Clientes"
        right={
          <Link href="/(tabs)/mas/clientes/nuevo" asChild>
            <TouchableOpacity className="p-2">
              <MaterialIcons name="person-add" size={22} color="#f97316" />
            </TouchableOpacity>
          </Link>
        }
      />

      <View className="px-4 py-3">
        <View className="bg-card border-border flex-row items-center gap-2 rounded-xl border px-3 py-2">
          <MaterialIcons name="search" size={20} color="#a3a3a3" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nombre o RUT"
            placeholderTextColor="#a3a3a3"
            className="text-foreground flex-1 text-base"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      {query.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : (
        <FlatList
          data={query.data ?? []}
          keyExtractor={(c) => String(c.id)}
          contentContainerClassName="px-4 pb-8 gap-2"
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => query.refetch()}
              tintColor="#f97316"
            />
          }
          ListEmptyComponent={
            <View className="items-center py-12">
              <MaterialIcons name="people" size={40} color="#a3a3a3" />
              <Text className="text-muted-foreground mt-2">
                Sin clientes registrados
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Link href={`/(tabs)/mas/clientes/${item.id}`} asChild>
              <TouchableOpacity
                activeOpacity={0.7}
                className="bg-card border-border rounded-xl border p-4"
              >
                <Text className="text-foreground font-semibold">
                  {item.nombre}
                </Text>
                <Text className="text-muted-foreground mt-1 text-xs">
                  {item.rut} · {item.compras} compra
                  {item.compras === 1 ? "" : "s"}
                </Text>
              </TouchableOpacity>
            </Link>
          )}
        />
      )}
    </SafeAreaView>
  );
}

