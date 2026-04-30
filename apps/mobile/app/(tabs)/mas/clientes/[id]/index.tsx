import React from "react";
import { useQuery } from "@tanstack/react-query";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import {
  ClienteDetalleSchema,
  type ClienteDetalle,
} from "@repo/api-client";
import { formatCLP } from "@repo/domain";

import { ScreenHeader } from "@/components/screen-header";
import { apiClient } from "@/stores/authStore";
import { ApiClientError } from "@repo/api-client";

/**
 * Detalle de cliente — M6.
 * Muestra datos + últimas 10 compras. Acciones: eliminar (si no tiene
 * ventas; 409 del server si las tiene). Edición queda para post-M6 —
 * el update vía Server Actions web es suficiente por ahora.
 */

const Resp = z.object({ data: ClienteDetalleSchema });

async function fetchCliente(id: number): Promise<ClienteDetalle> {
  const { data } = await apiClient.get(`/api/v1/clientes/${id}`, Resp);
  return data;
}

async function deleteCliente(id: number): Promise<void> {
  await apiClient.delete(
    `/api/v1/clientes/${id}`,
    z.object({ data: z.any() }),
  );
}

export default function ClienteDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const clienteId = Number(id);

  const query = useQuery({
    queryKey: ["clientes", "detalle", clienteId],
    queryFn: () => fetchCliente(clienteId),
    enabled: Number.isFinite(clienteId) && clienteId > 0,
  });

  const handleDelete = () => {
    Alert.alert(
      "Eliminar cliente",
      "¿Seguro que deseas eliminar este cliente? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCliente(clienteId);
              router.back();
            } catch (err) {
              const msg =
                err instanceof ApiClientError
                  ? err.message
                  : "Error inesperado";
              Alert.alert("No se pudo eliminar", msg);
            }
          },
        },
      ],
    );
  };

  if (query.isLoading) {
    return (
      <SafeAreaView
        className="bg-background flex-1 items-center justify-center"
        edges={["top"]}
      >
        <ActivityIndicator size="large" color="#f97316" />
      </SafeAreaView>
    );
  }

  if (query.isError || !query.data) {
    return (
      <SafeAreaView
        className="bg-background flex-1 items-center justify-center p-6"
        edges={["top"]}
      >
        <Text className="text-destructive text-center">
          Cliente no encontrado
        </Text>
      </SafeAreaView>
    );
  }

  const c = query.data;

  return (
    <SafeAreaView className="bg-background flex-1" edges={["top"]}>
      <ScreenHeader title={c.nombre} />
      <ScrollView contentContainerClassName="p-4 gap-4 pb-8">
        <View className="bg-card border-border rounded-xl border p-4">
          <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            Datos
          </Text>
          <Text className="text-foreground mt-2 text-base font-medium">
            {c.nombre}
          </Text>
          <Text className="text-muted-foreground text-sm">RUT: {c.rut}</Text>
          {c.email ? (
            <Text className="text-muted-foreground text-sm">
              {c.email}
            </Text>
          ) : null}
          {c.telefono ? (
            <Text className="text-muted-foreground text-sm">
              Tel: {c.telefono}
            </Text>
          ) : null}
          {c.direccion ? (
            <Text className="text-muted-foreground text-sm">
              {c.direccion}
            </Text>
          ) : null}
        </View>

        <View className="bg-card border-border rounded-xl border p-4">
          <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            Actividad
          </Text>
          <Text className="text-foreground mt-2">
            {c.compras} compra{c.compras === 1 ? "" : "s"}
            {c.ultimaCompra
              ? ` · última el ${new Date(c.ultimaCompra).toLocaleDateString("es-CL")}`
              : ""}
          </Text>
        </View>

        {c.ventas && c.ventas.length > 0 ? (
          <View className="bg-card border-border rounded-xl border p-4">
            <Text className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">
              Últimas compras
            </Text>
            {c.ventas.map((v, i) => (
              <View
                key={v.id}
                className={`${i > 0 ? "border-border border-t" : ""} py-2`}
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-foreground font-medium">
                    {v.numeroBoleta}
                  </Text>
                  <Text className="text-foreground font-semibold">
                    {formatCLP(v.total)}
                  </Text>
                </View>
                <Text className="text-muted-foreground text-xs">
                  {new Date(v.fecha).toLocaleDateString("es-CL")} ·{" "}
                  {v.metodoPago}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Bloque 6 (2026-04-30) — botón Editar agregado para cerrar gap
            "no se puede editar cliente desde mobile" reportado por owner. */}
        <TouchableOpacity
          onPress={() => router.push(`/(tabs)/mas/clientes/${clienteId}/editar` as never)}
          activeOpacity={0.8}
          className="bg-primary mb-2 flex-row items-center justify-center gap-2 rounded-xl px-4 py-3"
        >
          <MaterialIcons name="edit" size={20} color="#ffffff" />
          <Text className="text-primary-foreground font-semibold">
            Editar cliente
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDelete}
          activeOpacity={0.8}
          className="border-destructive flex-row items-center justify-center gap-2 rounded-xl border px-4 py-3"
        >
          <MaterialIcons name="delete-outline" size={20} color="#dc2626" />
          <Text className="text-destructive font-semibold">
            Eliminar cliente
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
