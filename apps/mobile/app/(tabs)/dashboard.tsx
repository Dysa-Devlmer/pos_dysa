import React from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";

import {
  DashboardResponseSchema,
  type Dashboard,
} from "@repo/api-client";

import { apiClient } from "@/stores/authStore";

/**
 * Dashboard mobile — M3.
 *
 * Consume GET /api/v1/dashboard (auth vía Bearer que ya inyecta el
 * authStore en apiClient) y renderiza:
 * - 2 KPI cards: ventas hoy + transacciones, stock crítico count
 * - Línea de ventas últimos 7 días (custom SVG, sin victory-native para
 *   evitar dependencia de Skia en Expo Go, G-M03)
 * - Lista top-5 productos con stock crítico (tap → TODO M6 alertas)
 *
 * Data fetching:
 * - React Query con staleTime 30s (configurado global en root layout)
 * - Pull-to-refresh para forzar refetch
 * - Refetch on app foreground (focusManager wiring en root)
 *
 * Formateo CLP:
 * - `formatCLP(15000)` → "$15.000"
 * - Intl.NumberFormat es-CL está disponible en Hermes (RN 0.74+ con
 *   intl enabled); el template Expo SDK 54 ya lo trae.
 */

function formatCLP(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

async function fetchDashboard(): Promise<Dashboard> {
  const { data } = await apiClient.get(
    "/api/v1/dashboard",
    DashboardResponseSchema,
  );
  return data;
}

// ─── Chart ───────────────────────────────────────────────────────────────

type ChartPoint = { etiqueta: string; total: number };

function VentasLineChart({
  data,
  width,
}: {
  data: ChartPoint[];
  width: number;
}) {
  const height = 180;
  const paddingLeft = 12;
  const paddingRight = 12;
  const paddingTop = 16;
  const paddingBottom = 28;
  const innerW = width - paddingLeft - paddingRight;
  const innerH = height - paddingTop - paddingBottom;

  const max = Math.max(1, ...data.map((d) => d.total));
  const step = data.length > 1 ? innerW / (data.length - 1) : 0;

  const points = data.map((d, i) => ({
    x: paddingLeft + step * i,
    y: paddingTop + innerH - (d.total / max) * innerH,
    etiqueta: d.etiqueta,
    total: d.total,
  }));

  // Path "M x0 y0 L x1 y1 ..." para la línea
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  // Area bajo la línea (fill sutil con color de marca)
  const areaPath =
    linePath +
    ` L ${points[points.length - 1]?.x.toFixed(2)} ${paddingTop + innerH}` +
    ` L ${points[0]?.x.toFixed(2)} ${paddingTop + innerH} Z`;

  return (
    <Svg width={width} height={height}>
      {/* Grid horizontal — 3 líneas (0%, 50%, 100%) */}
      {[0, 0.5, 1].map((ratio) => {
        const y = paddingTop + innerH * (1 - ratio);
        return (
          <Line
            key={ratio}
            x1={paddingLeft}
            x2={width - paddingRight}
            y1={y}
            y2={y}
            stroke="#e4decf"
            strokeWidth={1}
            strokeDasharray="3,3"
          />
        );
      })}

      {/* Área */}
      <Path d={areaPath} fill="#f97316" fillOpacity={0.12} />

      {/* Línea */}
      <Path
        d={linePath}
        stroke="#f97316"
        strokeWidth={2.5}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Puntos + labels X */}
      {points.map((p, i) => (
        <React.Fragment key={i}>
          <Circle cx={p.x} cy={p.y} r={3.5} fill="#f97316" />
          <SvgText
            x={p.x}
            y={height - 8}
            fontSize={10}
            fill="#737373"
            textAnchor="middle"
          >
            {p.etiqueta}
          </SvgText>
        </React.Fragment>
      ))}
    </Svg>
  );
}

// ─── Pantalla ────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  });

  if (isLoading) {
    return (
      <SafeAreaView className="bg-background flex-1" edges={["top"]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f97316" />
          <Text className="text-muted-foreground mt-3 text-sm">
            Cargando KPIs…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView className="bg-background flex-1" edges={["top"]}>
        <View className="flex-1 items-center justify-center p-6">
          <MaterialIcons name="error-outline" size={48} color="#ef4444" />
          <Text className="text-foreground mt-3 text-center text-lg font-semibold">
            No pudimos cargar el dashboard
          </Text>
          <Text className="text-muted-foreground mt-1 text-center text-sm">
            {(error as Error)?.message ?? "Error inesperado"}
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            className="bg-primary mt-5 rounded-lg px-5 py-3"
            activeOpacity={0.8}
          >
            <Text className="text-primary-foreground font-semibold">
              Reintentar
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Ancho del chart: padding 16 horizontal del container
  const chartWidth = width - 32 - 24; // menos padding del card
  return (
    <SafeAreaView className="bg-background flex-1" edges={["top"]}>
      <ScrollView
        contentContainerClassName="p-4 pb-8 gap-4"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor="#f97316"
          />
        }
      >
        {/* Header */}
        <View>
          <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            Panel · Tiempo real
          </Text>
          <Text className="text-foreground mt-1 text-2xl font-bold">
            Dashboard
          </Text>
        </View>

        {/* KPI cards grid */}
        <View className="flex-row gap-3">
          <KpiCard
            icon="attach-money"
            label="Ventas hoy"
            value={formatCLP(data.ventasHoy.total)}
            hint={`${data.ventasHoy.transacciones} ${
              data.ventasHoy.transacciones === 1
                ? "transacción"
                : "transacciones"
            }`}
            tone="primary"
          />
          <KpiCard
            icon="warning"
            label="Stock crítico"
            value={String(data.stockCritico.count)}
            hint={
              data.stockCritico.count === 0
                ? "Todo OK"
                : "productos con alerta"
            }
            tone={data.stockCritico.count > 0 ? "warning" : "success"}
          />
        </View>

        {/* Chart ventas 7d */}
        <View className="bg-card border-border rounded-xl border p-4">
          <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            Ventas últimos 7 días
          </Text>
          <Text className="text-foreground mt-1 mb-3 text-base font-semibold">
            {formatCLP(
              data.ventas7dias.reduce((acc, d) => acc + d.total, 0),
            )}
            <Text className="text-muted-foreground text-xs font-normal">
              {" "}
              · total
            </Text>
          </Text>
          <VentasLineChart data={data.ventas7dias} width={chartWidth} />
        </View>

        {/* Stock crítico list */}
        <View className="bg-card border-border overflow-hidden rounded-xl border">
          <View className="border-border border-b px-4 py-3">
            <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              Productos en alerta
            </Text>
          </View>
          {data.stockCritico.productos.length === 0 ? (
            <View className="items-center px-4 py-8">
              <MaterialIcons
                name="check-circle"
                size={32}
                color="#10b981"
              />
              <Text className="text-muted-foreground mt-2 text-sm">
                Sin productos con stock crítico
              </Text>
            </View>
          ) : (
            data.stockCritico.productos.map((p, i) => (
              <View
                key={p.id}
                className={`flex-row items-center px-4 py-3 ${
                  i > 0 ? "border-border border-t" : ""
                }`}
              >
                <View className="flex-1">
                  <Text
                    className="text-foreground text-sm font-medium"
                    numberOfLines={1}
                  >
                    {p.nombre}
                  </Text>
                  <Text className="text-muted-foreground mt-0.5 text-xs">
                    Stock {p.stock} / alerta {p.alertaStock}
                  </Text>
                </View>
                <View
                  className={`rounded-full px-2 py-0.5 ${
                    p.stock === 0 ? "bg-destructive/15" : "bg-warning/20"
                  }`}
                >
                  <Text
                    className={`text-[11px] font-semibold ${
                      p.stock === 0
                        ? "text-destructive"
                        : "text-warning-foreground"
                    }`}
                  >
                    {p.stock === 0 ? "Sin stock" : "Bajo"}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── KPI card ────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  value: string;
  hint: string;
  tone: "primary" | "warning" | "success";
}) {
  const iconColor =
    tone === "primary"
      ? "#f97316"
      : tone === "warning"
        ? "#f59e0b"
        : "#10b981";
  const bgClass =
    tone === "primary"
      ? "bg-primary/10"
      : tone === "warning"
        ? "bg-warning/15"
        : "bg-success/15";
  return (
    <View className="bg-card border-border flex-1 rounded-xl border p-4">
      <View className="flex-row items-center gap-2">
        <View
          className={`h-8 w-8 items-center justify-center rounded-full ${bgClass}`}
        >
          <MaterialIcons name={icon} size={18} color={iconColor} />
        </View>
        <Text className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
          {label}
        </Text>
      </View>
      <Text
        className="text-foreground mt-2 text-lg font-bold"
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text className="text-muted-foreground text-xs">{hint}</Text>
    </View>
  );
}
