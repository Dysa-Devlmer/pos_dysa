import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import {
  ApiClientError,
  ProductoSchema,
  ProductosListSchema,
  type Producto,
} from "@repo/api-client";
import { formatCLP } from "@repo/domain";

import { ScreenHeader } from "@/components/screen-header";
import { apiClient } from "@/stores/authStore";

/**
 * Productos — M6. Listado + búsqueda + edición rápida de stock.
 *
 * Decisión de alcance: el mobile NO crea/elimina productos (ese CRUD
 * vive en web con formulario rico, categoría selector, validaciones
 * extra). Lo que sí ofrecemos es ajustar stock rápido desde el campo —
 * caso real: cajero corrige una merma después de contar.
 *
 * Badge "Stock bajo" cuando stock <= alertaStock (mismo criterio que
 * /api/v1/dashboard usa para stockCritico).
 */

async function fetchProductos(search: string): Promise<Producto[]> {
  const resp = await apiClient.get(
    "/api/v1/productos",
    ProductosListSchema,
    { search: search || undefined, limit: 50 },
  );
  return resp.data;
}

const UpdateResp = z.object({ data: ProductoSchema });

export default function ProductosScreen() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [editing, setEditing] = useState<Producto | null>(null);
  const [nuevoStock, setNuevoStock] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const query = useQuery({
    queryKey: ["productos", "list", debounced],
    queryFn: () => fetchProductos(debounced),
  });

  const updateStock = useMutation({
    mutationFn: async ({ id, stock }: { id: number; stock: number }) => {
      return apiClient.put(
        `/api/v1/productos/${id}`,
        { stock },
        UpdateResp,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["productos"] });
      setEditing(null);
      setNuevoStock("");
    },
    onError: (err) => {
      const msg =
        err instanceof ApiClientError ? err.message : "Error inesperado";
      Alert.alert("No se pudo actualizar", msg);
    },
  });

  const openEdit = (p: Producto) => {
    setEditing(p);
    setNuevoStock(String(p.stock));
  };

  const confirmEdit = () => {
    if (!editing) return;
    const n = Number(nuevoStock);
    if (!Number.isFinite(n) || n < 0) {
      Alert.alert("Stock inválido", "Ingresa un número mayor o igual a 0");
      return;
    }
    updateStock.mutate({ id: editing.id, stock: n });
  };

  return (
    <SafeAreaView className="bg-background flex-1" edges={["top"]}>
      <ScreenHeader title="Productos" />

      <View className="px-4 py-3">
        <View className="bg-card border-border flex-row items-center gap-2 rounded-xl border px-3 py-2">
          <MaterialIcons name="search" size={20} color="#a3a3a3" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar producto"
            placeholderTextColor="#a3a3a3"
            className="text-foreground flex-1 text-base"
            autoCapitalize="none"
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
          keyExtractor={(p) => String(p.id)}
          contentContainerClassName="px-4 pb-8 gap-2"
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => query.refetch()}
              tintColor="#f97316"
            />
          }
          renderItem={({ item }) => {
            const stockBajo = item.stock <= item.alertaStock;
            return (
              <TouchableOpacity
                onPress={() => openEdit(item)}
                activeOpacity={0.7}
                className="bg-card border-border rounded-xl border p-4"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-foreground font-semibold">
                      {item.nombre}
                    </Text>
                    <Text className="text-muted-foreground mt-0.5 text-xs">
                      {item.codigoBarras}
                    </Text>
                  </View>
                  <Text className="text-foreground font-bold">
                    {formatCLP(item.precio)}
                  </Text>
                </View>
                <View className="mt-2 flex-row items-center justify-between">
                  <View
                    className={`${stockBajo ? "bg-destructive/10" : "bg-muted"} flex-row items-center gap-1 rounded-full px-2 py-0.5`}
                  >
                    {stockBajo ? (
                      <MaterialIcons
                        name="warning"
                        size={12}
                        color="#dc2626"
                      />
                    ) : null}
                    <Text
                      className={`${stockBajo ? "text-destructive" : "text-muted-foreground"} text-[11px] font-semibold`}
                    >
                      Stock: {item.stock}
                    </Text>
                  </View>
                  <Text className="text-muted-foreground text-xs">
                    Tocar para ajustar
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <Modal
        visible={!!editing}
        transparent
        animationType="fade"
        onRequestClose={() => setEditing(null)}
      >
        <View className="flex-1 items-center justify-center bg-black/50 p-6">
          <View className="bg-card w-full max-w-sm rounded-2xl p-5">
            <Text className="text-foreground text-lg font-semibold">
              Ajustar stock
            </Text>
            {editing ? (
              <Text className="text-muted-foreground mt-1 text-sm">
                {editing.nombre} · actual: {editing.stock}
              </Text>
            ) : null}
            <TextInput
              value={nuevoStock}
              onChangeText={setNuevoStock}
              keyboardType="number-pad"
              placeholder="Nuevo stock"
              placeholderTextColor="#a3a3a3"
              className="bg-background border-border text-foreground mt-4 rounded-xl border px-3 py-3 text-lg"
              autoFocus
            />
            <View className="mt-4 flex-row gap-2">
              <TouchableOpacity
                onPress={() => setEditing(null)}
                className="border-border flex-1 items-center rounded-xl border px-4 py-3"
              >
                <Text className="text-foreground font-semibold">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmEdit}
                disabled={updateStock.isPending}
                className="bg-primary flex-1 items-center rounded-xl px-4 py-3"
              >
                <Text className="font-semibold text-white">
                  {updateStock.isPending ? "Guardando…" : "Guardar"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
