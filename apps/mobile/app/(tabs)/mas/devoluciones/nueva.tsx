import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import {
  ApiClientError,
  CrearDevolucionRequestSchema,
  VentaSchema,
  VentasListResponseSchema,
  type Venta,
} from "@repo/api-client";
import { formatCLP } from "@repo/domain";

import { ScreenHeader } from "@/components/screen-header";
import { apiClient } from "@/stores/authStore";

/**
 * Formulario de creación de devolución — M6.
 *
 * Flujo:
 *   1. Si viene `?ventaId=` en la URL → precargar esa venta.
 *   2. Si no → mostrar selector de ventas recientes (últimas 20) para
 *      que el usuario elija.
 *   3. Seleccionar ítems con cantidades (default 0, max = vendido).
 *   4. Ingresar motivo (≥5 chars).
 *   5. POST /api/v1/devoluciones → 409 si stock ya devuelto previamente
 *      u otra regla de negocio. Mostramos Alert y el usuario corrige.
 *
 * Cantidades: el server valida cantidad total vs. ya-devueltas. Acá
 * limitamos por cantidad vendida como upper bound suave — el server da
 * la palabra final (G-M04 server-wins).
 */

const VentaResp = z.object({ data: VentaSchema });

export default function NuevaDevolucionScreen() {
  const router = useRouter();
  const { ventaId: ventaIdParam } = useLocalSearchParams<{
    ventaId?: string;
  }>();

  const [ventaIdSeleccionada, setVentaIdSeleccionada] = useState<number | null>(
    ventaIdParam ? Number(ventaIdParam) : null,
  );
  const [cantidades, setCantidades] = useState<Record<number, string>>({});
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Listado de ventas recientes (solo se consulta si no hay venta precargada)
  const ventasList = useQuery({
    queryKey: ["devoluciones", "ventas-selector"],
    queryFn: async () => {
      const { data } = await apiClient.get(
        "/api/v1/ventas",
        VentasListResponseSchema,
        { limit: 20 },
      );
      return data;
    },
    enabled: ventaIdSeleccionada === null,
  });

  // Detalle de la venta seleccionada
  const ventaDetalle = useQuery({
    queryKey: ["ventas", "detalle", ventaIdSeleccionada],
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/api/v1/ventas/${ventaIdSeleccionada}`,
        VentaResp,
      );
      return data as Venta;
    },
    enabled: ventaIdSeleccionada !== null,
  });

  // Reset cantidades cuando cambia la venta
  useEffect(() => {
    setCantidades({});
  }, [ventaIdSeleccionada]);

  const items = useMemo(
    () =>
      Object.entries(cantidades)
        .map(([productoId, cantidadStr]) => ({
          productoId: Number(productoId),
          cantidadDevolver: Math.floor(Number(cantidadStr) || 0),
        }))
        .filter((i) => i.cantidadDevolver > 0),
    [cantidades],
  );

  const handleSubmit = async () => {
    if (ventaIdSeleccionada === null) {
      Alert.alert("Selecciona una venta", "Debes elegir la venta a devolver");
      return;
    }
    if (items.length === 0) {
      Alert.alert("Sin ítems", "Ingresa al menos un producto a devolver");
      return;
    }
    const parsed = CrearDevolucionRequestSchema.safeParse({
      ventaId: ventaIdSeleccionada,
      motivo: motivo.trim(),
      items,
    });
    if (!parsed.success) {
      Alert.alert(
        "Datos inválidos",
        parsed.error.issues[0]?.message ?? "Revisa el formulario",
      );
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post(
        "/api/v1/devoluciones",
        parsed.data,
        z.object({
          data: z.object({
            id: z.number(),
            esTotal: z.boolean(),
            montoDevuelto: z.number(),
          }),
        }),
      );
      Alert.alert("Devolución registrada", "Stock y contadores actualizados");
      router.back();
    } catch (err) {
      const msg =
        err instanceof ApiClientError ? err.message : "Error inesperado";
      Alert.alert("No se pudo registrar", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="bg-background flex-1" edges={["top"]}>
      <ScreenHeader title="Nueva devolución" />
      <ScrollView contentContainerClassName="p-4 gap-4 pb-8">
        {ventaIdSeleccionada === null ? (
          <View>
            <Text className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">
              Selecciona la venta
            </Text>
            {ventasList.isLoading ? (
              <ActivityIndicator size="small" color="#f97316" />
            ) : (
              <View className="gap-2">
                {(ventasList.data ?? []).map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    onPress={() => setVentaIdSeleccionada(v.id)}
                    activeOpacity={0.7}
                    className="bg-card border-border rounded-xl border p-3"
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="text-foreground font-semibold">
                        {v.numeroBoleta}
                      </Text>
                      <Text className="text-foreground font-bold">
                        {formatCLP(v.total)}
                      </Text>
                    </View>
                    <Text className="text-muted-foreground mt-0.5 text-xs">
                      {new Date(v.fecha).toLocaleDateString("es-CL")} ·{" "}
                      {v.metodoPago}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : ventaDetalle.isLoading ? (
          <ActivityIndicator size="large" color="#f97316" />
        ) : ventaDetalle.data ? (
          <>
            <View className="bg-card border-border rounded-xl border p-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-foreground font-semibold">
                  {ventaDetalle.data.numeroBoleta}
                </Text>
                <TouchableOpacity
                  onPress={() => setVentaIdSeleccionada(null)}
                  className="p-1"
                >
                  <MaterialIcons name="swap-horiz" size={18} color="#f97316" />
                </TouchableOpacity>
              </View>
              <Text className="text-muted-foreground text-xs">
                Total original: {formatCLP(ventaDetalle.data.total)}
              </Text>
            </View>

            <View>
              <Text className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">
                Productos a devolver
              </Text>
              <View className="gap-2">
                {ventaDetalle.data.detalles.map((d) => (
                  <View
                    key={d.productoId}
                    className="bg-card border-border rounded-xl border p-3"
                  >
                    <Text className="text-foreground font-medium">
                      {d.producto?.nombre ?? `Producto #${d.productoId}`}
                    </Text>
                    <Text className="text-muted-foreground text-xs">
                      Vendido: {d.cantidad} × {formatCLP(d.precioUnitario)}
                    </Text>
                    <View className="mt-2 flex-row items-center gap-2">
                      <Text className="text-muted-foreground text-xs">
                        Devolver:
                      </Text>
                      <TextInput
                        value={cantidades[d.productoId] ?? ""}
                        onChangeText={(t) =>
                          setCantidades((prev) => ({
                            ...prev,
                            [d.productoId]: t.replace(/[^0-9]/g, ""),
                          }))
                        }
                        placeholder="0"
                        placeholderTextColor="#a3a3a3"
                        keyboardType="number-pad"
                        maxLength={4}
                        className="bg-background border-border text-foreground w-20 rounded-lg border px-2 py-1.5 text-center"
                      />
                      <Text className="text-muted-foreground text-xs">
                        / {d.cantidad}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View>
              <Text className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wider">
                Motivo
              </Text>
              <TextInput
                value={motivo}
                onChangeText={setMotivo}
                placeholder="Producto defectuoso, cliente insatisfecho, etc."
                placeholderTextColor="#a3a3a3"
                multiline
                numberOfLines={3}
                className="bg-card border-border text-foreground rounded-xl border px-3 py-3 text-base"
                style={{ minHeight: 80, textAlignVertical: "top" }}
              />
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
              className={`${submitting ? "opacity-60" : ""} bg-destructive items-center rounded-xl px-4 py-3`}
            >
              <Text className="font-semibold text-white">
                {submitting ? "Registrando…" : "Registrar devolución"}
              </Text>
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
