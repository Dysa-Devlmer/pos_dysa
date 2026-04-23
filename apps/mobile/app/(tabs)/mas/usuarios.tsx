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

import { UsuarioSchema, type Usuario } from "@repo/api-client";

import { ScreenHeader } from "@/components/screen-header";
import { apiClient } from "@/stores/authStore";
import { useAuth } from "@/hooks/useAuth";

/**
 * Usuarios — M6 read-only ADMIN-only.
 *
 * Endpoint: GET /api/v1/usuarios devuelve 403 si el caller no es ADMIN.
 * Acá bloqueamos en cliente también para evitar la request inútil y
 * dar feedback inmediato ("requiere rol ADMIN").
 *
 * CRUD (crear/editar/eliminar) queda en web — políticas sensibles como
 * reset de password + asignación de rol no ganan nada por hacerse en
 * mobile y multiplicarían el riesgo de errores.
 */

const Resp = z.object({
  data: z.array(UsuarioSchema),
  meta: z
    .object({
      page: z.number(),
      limit: z.number(),
      total: z.number().optional(),
    })
    .optional(),
});

async function fetchUsuarios(): Promise<Usuario[]> {
  const { data } = await apiClient.get("/api/v1/usuarios", Resp);
  return data;
}

export default function UsuariosScreen() {
  const { user } = useAuth();
  const isAdmin = user?.rol === "ADMIN";

  const query = useQuery({
    queryKey: ["usuarios", "list"],
    queryFn: fetchUsuarios,
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <SafeAreaView className="bg-background flex-1" edges={["top"]}>
        <ScreenHeader title="Usuarios" />
        <View className="flex-1 items-center justify-center p-6">
          <MaterialIcons name="lock" size={40} color="#a3a3a3" />
          <Text className="text-muted-foreground mt-2 text-center">
            Esta sección requiere rol ADMIN
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-background flex-1" edges={["top"]}>
      <ScreenHeader title="Usuarios" />
      {query.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : (
        <FlatList
          data={query.data ?? []}
          keyExtractor={(u) => String(u.id)}
          contentContainerClassName="p-4 gap-2"
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => query.refetch()}
              tintColor="#f97316"
            />
          }
          renderItem={({ item }) => (
            <View className="bg-card border-border flex-row items-center gap-3 rounded-xl border p-4">
              <View className="bg-primary/10 h-10 w-10 items-center justify-center rounded-full">
                <Text className="text-primary font-bold">
                  {item.nombre.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-foreground font-semibold">
                  {item.nombre}
                </Text>
                <Text className="text-muted-foreground text-xs">
                  {item.email}
                </Text>
              </View>
              <View className="bg-primary/10 rounded-full px-2 py-0.5">
                <Text className="text-primary text-[10px] font-semibold uppercase">
                  {item.rol}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
