import { useQuery } from "@tanstack/react-query";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
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

import { VentaSchema, type Venta } from "@repo/api-client";
import { formatCLP } from "@repo/domain";

import { apiClient } from "@/stores/authStore";
import { shareReceipt } from "@/lib/publicReceipt";

/**
 * Detalle de una venta — M6.
 *
 * Muestra: header con boleta + cliente, lista de ítems con precio
 * unitario/subtotal, totales (subtotal, IVA, total), método de pago,
 * cajero. CTA primario: crear devolución (navega a /devoluciones/nueva
 * con ventaId precargado).
 *
 * Server no tiene endpoint de "anular venta" vía mobile (se hace desde
 * web con flujo completo de stock revert); mobile sólo ofrece devolución.
 */

const VentaDetalleResponse = z.object({ data: VentaSchema });

async function fetchVenta(id: number): Promise<Venta> {
  const { data } = await apiClient.get(
    `/api/v1/ventas/${id}`,
    VentaDetalleResponse,
  );
  return data;
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text
        className={`${bold ? "text-foreground" : "text-muted-foreground"} ${
          bold ? "font-semibold" : ""
        } text-sm`}
      >
        {label}
      </Text>
      <Text
        className={`${bold ? "text-foreground text-base font-bold" : "text-foreground text-sm"}`}
      >
        {value}
      </Text>
    </View>
  );
}

export default function VentaDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const ventaId = Number(id);

  const query = useQuery({
    queryKey: ["ventas", "detalle", ventaId],
    queryFn: () => fetchVenta(ventaId),
    enabled: Number.isFinite(ventaId) && ventaId > 0,
  });

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
          {query.error instanceof Error
            ? query.error.message
            : "Venta no encontrada"}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-primary mt-4 rounded-lg px-4 py-2"
        >
          <Text className="font-semibold text-white">Volver</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const venta = query.data;
  const fecha = new Date(venta.fecha);

  return (
    <SafeAreaView className="bg-background flex-1" edges={["top"]}>
      <View className="border-border flex-row items-center gap-2 border-b px-2 pb-3 pt-1">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <MaterialIcons name="arrow-back" size={24} color="#f97316" />
        </TouchableOpacity>
        <Text className="text-foreground flex-1 text-lg font-semibold">
          {venta.numeroBoleta}
        </Text>
      </View>

      <ScrollView contentContainerClassName="p-4 pb-8 gap-4">
        {/* Header de la boleta */}
        <View className="bg-card border-border rounded-xl border p-4">
          <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            Información
          </Text>
          <Row
            label="Fecha"
            value={`${fecha.toLocaleDateString("es-CL")} ${fecha.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}`}
          />
          <Row label="Método de pago" value={venta.metodoPago} />
          <Row
            label="Cliente"
            value={
              venta.cliente
                ? `${venta.cliente.nombre} (${venta.cliente.rut})`
                : "Sin cliente"
            }
          />
          {venta.usuario ? (
            <Row label="Cajero" value={venta.usuario.nombre} />
          ) : null}
        </View>

        {/* Ítems */}
        <View className="bg-card border-border rounded-xl border p-4">
          <Text className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">
            Productos ({venta.detalles.length})
          </Text>
          {venta.detalles.map((d, i) => (
            <View
              key={d.id ?? `${d.productoId}-${i}`}
              className={`${i > 0 ? "border-border border-t" : ""} py-2`}
            >
              <Text className="text-foreground font-medium">
                {d.producto?.nombre ?? `Producto #${d.productoId}`}
              </Text>
              <View className="mt-1 flex-row items-center justify-between">
                <Text className="text-muted-foreground text-xs">
                  {d.cantidad} × {formatCLP(d.precioUnitario)}
                </Text>
                <Text className="text-foreground font-semibold">
                  {formatCLP(d.subtotal)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Totales */}
        <View className="bg-card border-border rounded-xl border p-4">
          <Row label="Subtotal" value={formatCLP(venta.subtotal)} />
          <Row label="IVA (19%)" value={formatCLP(venta.impuesto)} />
          <View className="border-border mt-2 border-t pt-2">
            <Row label="Total" value={formatCLP(venta.total)} bold />
          </View>
        </View>

        {venta.publicToken ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              shareReceipt({
                token: venta.publicToken!,
                numeroBoleta: venta.numeroBoleta,
              }).catch((e) => {
                Alert.alert(
                  "No se pudo compartir",
                  e instanceof Error ? e.message : "Intenta de nuevo",
                );
              })
            }
            className="border-primary flex-row items-center justify-center gap-2 rounded-xl border px-4 py-3"
          >
            <MaterialIcons name="ios-share" size={20} color="#f97316" />
            <Text className="text-primary font-semibold">
              Compartir comprobante
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Acción: crear devolución */}
        <Link
          href={{
            pathname: "/(tabs)/mas/devoluciones/nueva",
            params: { ventaId: String(venta.id) },
          }}
          asChild
        >
          <TouchableOpacity
            activeOpacity={0.8}
            className="bg-destructive flex-row items-center justify-center gap-2 rounded-xl px-4 py-3"
          >
            <MaterialIcons
              name="assignment-return"
              size={20}
              color="#fff"
            />
            <Text className="font-semibold text-white">
              Crear devolución
            </Text>
          </TouchableOpacity>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}
