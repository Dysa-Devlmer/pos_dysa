import React, { useCallback, useRef, useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  CrearVentaRequestSchema,
  ProductosListSchema,
  VentaCreadaResponseSchema,
  type MetodoPago,
  type Producto,
  type VentaCreada,
} from "@repo/api-client";
import { ApiClientError } from "@repo/api-client";
import { formatCLP } from "@repo/domain";

import { apiClient } from "@/stores/authStore";
import { useCartStore, type CartItem } from "@/stores/cartStore";
import { useSyncStore } from "@/stores/syncStore";
import { enqueueVenta } from "@/db/sync";

/**
 * Caja POS mobile — M4.
 *
 * Flujo:
 *   1. Usuario escanea código (expo-camera) o tipea en el search.
 *   2. App busca GET /api/v1/productos?codigoBarras=X o ?search=X.
 *   3. Si match → addItem al carrito (useCartStore).
 *   4. Usuario ajusta cantidades, elige método de pago.
 *   5. POST /api/v1/ventas → muestra boleta → limpia carrito.
 *
 * Permisos:
 *   - expo-camera con useCameraPermissions() (G-M05). Si el usuario
 *     niega, fallback a búsqueda manual por texto (sin bloquear caja).
 *
 * Errores:
 *   - 409 del server (stock insuficiente) → alert específico con nombre
 *     del producto, no se limpia carrito (usuario puede ajustar cantidad).
 *   - 401 → probablemente token expirado; mostrar y sugerir re-login.
 *
 * Impresión ESC/POS: no en M4. La impresora térmica requiere react-native
 * -thermal-printer + hardware real; se integra post-M5 cuando Cowork
 * pruebe con impresora física.
 */

// ─── Fetchers ────────────────────────────────────────────────────────────

async function buscarPorCodigoBarras(
  codigoBarras: string,
): Promise<Producto | null> {
  const { data } = await apiClient.get(
    "/api/v1/productos",
    ProductosListSchema,
    { codigoBarras },
  );
  return data[0] ?? null;
}

async function buscarPorNombre(search: string): Promise<Producto[]> {
  const { data } = await apiClient.get(
    "/api/v1/productos",
    ProductosListSchema,
    { search, limit: 20 },
  );
  return data;
}

async function crearVenta(
  items: CartItem[],
  metodoPago: MetodoPago,
): Promise<VentaCreada> {
  const body = CrearVentaRequestSchema.parse({
    items: items.map((i) => ({
      productoId: i.producto.id,
      cantidad: i.cantidad,
    })),
    metodoPago,
  });
  const { data } = await apiClient.post(
    "/api/v1/ventas",
    body,
    VentaCreadaResponseSchema,
  );
  return data;
}

// ─── Pantalla principal ─────────────────────────────────────────────────

const METODOS_PAGO: {
  value: MetodoPago;
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
}[] = [
  { value: "EFECTIVO", label: "Efectivo", icon: "payments" },
  { value: "DEBITO", label: "Débito", icon: "credit-card" },
  { value: "CREDITO", label: "Crédito", icon: "credit-score" },
  { value: "TRANSFERENCIA", label: "Transfer.", icon: "account-balance" },
];

export default function CajaScreen() {
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQty = useCartStore((s) => s.updateQty);
  const clearCart = useCartStore((s) => s.clearCart);
  const getTotales = useCartStore((s) => s.getTotales);

  const totales = getTotales();

  const [metodoPago, setMetodoPago] = useState<MetodoPago>("EFECTIVO");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Producto[]>([]);
  const [cobrando, setCobrando] = useState(false);
  const [ventaExitosa, setVentaExitosa] = useState<VentaCreada | null>(null);
  const [ventaOffline, setVentaOffline] = useState<{
    localId: string;
    total: number;
  } | null>(null);

  const isOnline = useSyncStore((s) => s.isOnline);
  const refreshSyncCounts = useSyncStore((s) => s.refreshCounts);

  const handleProductoEncontrado = useCallback(
    (producto: Producto) => {
      addItem(producto, 1);
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );
    },
    [addItem],
  );

  const handleBuscar = async () => {
    const q = searchText.trim();
    if (!q) return;
    setSearching(true);
    try {
      // Si se parece a código (solo dígitos, 6+ chars) intenta exacto primero
      if (/^\d{6,}$/.test(q)) {
        const prod = await buscarPorCodigoBarras(q);
        if (prod) {
          handleProductoEncontrado(prod);
          setSearchText("");
          setSearchResults([]);
          setSearching(false);
          return;
        }
      }
      const results = await buscarPorNombre(q);
      setSearchResults(results);
    } catch (e) {
      Alert.alert(
        "Error de búsqueda",
        e instanceof Error ? e.message : "No pudimos buscar",
      );
    } finally {
      setSearching(false);
    }
  };

  const handleCobrar = async () => {
    if (items.length === 0) return;
    setCobrando(true);
    const totalCobro = totales.total;

    // Rama offline (G-M04, M5): encolar local en SQLite. El sync worker
    // la enviará al reconectar. NO validamos stock acá — lo hará el
    // server cuando drene la queue (server-wins).
    if (!isOnline) {
      try {
        const payload = {
          items: items.map((i) => ({
            productoId: i.producto.id,
            cantidad: i.cantidad,
          })),
          metodoPago,
        };
        const localId = await enqueueVenta(payload);
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        clearCart();
        setVentaOffline({ localId, total: totalCobro });
        await refreshSyncCounts();
      } catch (e) {
        Alert.alert(
          "No se pudo guardar offline",
          e instanceof Error ? e.message : "Error inesperado",
        );
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error,
        );
      } finally {
        setCobrando(false);
      }
      return;
    }

    // Rama online: POST directo.
    try {
      const venta = await crearVenta(items, metodoPago);
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );
      clearCart();
      setVentaExitosa(venta);
    } catch (e) {
      if (e instanceof ApiClientError) {
        if (e.status === 409) {
          Alert.alert("Stock insuficiente", e.message, [{ text: "OK" }]);
        } else if (e.status === 401) {
          Alert.alert(
            "Sesión expirada",
            "Por favor vuelve a iniciar sesión.",
          );
        } else if (e.status === 0 || e.status >= 500) {
          // Timeout / 5xx → ofrecer encolar offline. Patrón común cuando
          // el cajero está con red inestable pero el dispositivo dice
          // "online". Evita perder la venta.
          Alert.alert(
            "Error de red",
            "No pudimos contactar el servidor. ¿Guardar la venta offline para sincronizarla después?",
            [
              { text: "Cancelar", style: "cancel" },
              {
                text: "Guardar offline",
                onPress: async () => {
                  try {
                    const payload = {
                      items: items.map((i) => ({
                        productoId: i.producto.id,
                        cantidad: i.cantidad,
                      })),
                      metodoPago,
                    };
                    const localId = await enqueueVenta(payload);
                    clearCart();
                    setVentaOffline({ localId, total: totalCobro });
                    await refreshSyncCounts();
                  } catch (enqueueErr) {
                    Alert.alert(
                      "Error al guardar",
                      enqueueErr instanceof Error
                        ? enqueueErr.message
                        : "Error inesperado",
                    );
                  }
                },
              },
            ],
          );
        } else {
          Alert.alert("No se pudo cobrar", e.message);
        }
      } else {
        Alert.alert(
          "Error inesperado",
          e instanceof Error ? e.message : "Intenta de nuevo",
        );
      }
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      );
    } finally {
      setCobrando(false);
    }
  };

  return (
    <SafeAreaView className="bg-background flex-1" edges={["top"]}>
      {/* Header */}
      <View className="border-border border-b px-4 py-3">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              Punto de venta
            </Text>
            <Text className="text-foreground text-xl font-bold">Caja</Text>
          </View>
          {items.length > 0 && (
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  "Vaciar carrito",
                  "¿Eliminar todos los ítems?",
                  [
                    { text: "Cancelar", style: "cancel" },
                    {
                      text: "Vaciar",
                      style: "destructive",
                      onPress: clearCart,
                    },
                  ],
                )
              }
              className="flex-row items-center gap-1 rounded-lg px-3 py-2"
            >
              <MaterialIcons name="delete-outline" size={18} color="#ef4444" />
              <Text className="text-destructive text-sm font-medium">
                Vaciar
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search + scanner toggle */}
      <View className="border-border gap-2 border-b px-4 py-3">
        <View className="flex-row items-center gap-2">
          <View className="bg-card border-input flex-1 flex-row items-center rounded-lg border px-3">
            <MaterialIcons name="search" size={20} color="#737373" />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleBuscar}
              placeholder="Código de barras o nombre"
              placeholderTextColor="#a3a3a3"
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              className="text-foreground flex-1 px-2 py-2.5 text-base"
            />
            {searching && (
              <ActivityIndicator size="small" color="#f97316" />
            )}
          </View>
          <TouchableOpacity
            onPress={() => setScannerOpen(true)}
            activeOpacity={0.8}
            className="bg-primary h-11 w-11 items-center justify-center rounded-lg"
          >
            <MaterialIcons name="qr-code-scanner" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {searchResults.length > 0 && (
          <View className="bg-card border-border max-h-48 rounded-lg border">
            <ScrollView keyboardShouldPersistTaps="handled">
              {searchResults.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => {
                    handleProductoEncontrado(p);
                    setSearchText("");
                    setSearchResults([]);
                  }}
                  className="border-border flex-row items-center justify-between border-b px-3 py-2.5 last:border-b-0"
                >
                  <View className="flex-1 pr-2">
                    <Text
                      className="text-foreground text-sm font-medium"
                      numberOfLines={1}
                    >
                      {p.nombre}
                    </Text>
                    <Text className="text-muted-foreground text-xs">
                      Stock {p.stock}
                    </Text>
                  </View>
                  <Text className="text-primary text-sm font-semibold">
                    {formatCLP(p.precio)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Carrito */}
      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <View className="bg-primary/10 mb-4 h-20 w-20 items-center justify-center rounded-full">
            <MaterialIcons name="shopping-cart" size={40} color="#f97316" />
          </View>
          <Text className="text-foreground text-lg font-semibold">
            Carrito vacío
          </Text>
          <Text className="text-muted-foreground mt-1 text-center text-sm">
            Escanea un código o busca un producto{"\n"}para comenzar la venta.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.producto.id)}
          contentContainerClassName="p-4 pb-2 gap-2"
          renderItem={({ item }) => (
            <CartRow
              item={item}
              onInc={() => updateQty(item.producto.id, item.cantidad + 1)}
              onDec={() => updateQty(item.producto.id, item.cantidad - 1)}
              onRemove={() => removeItem(item.producto.id)}
            />
          )}
        />
      )}

      {/* Totales + método + cobrar */}
      {items.length > 0 && (
        <View className="border-border bg-card border-t px-4 pb-2 pt-3">
          <View className="gap-1">
            <Row label="Subtotal" value={formatCLP(totales.subtotal)} />
            {totales.descuento > 0 && (
              <Row
                label="Descuento"
                value={`- ${formatCLP(totales.descuento)}`}
                emphasize
              />
            )}
            <Row
              label="IVA 19%"
              value={formatCLP(totales.impuesto)}
              muted
            />
            <View className="border-border mt-1 flex-row justify-between border-t pt-2">
              <Text className="text-foreground text-base font-semibold">
                Total
              </Text>
              <Text className="text-primary text-xl font-bold">
                {formatCLP(totales.total)}
              </Text>
            </View>
          </View>

          {/* Método de pago */}
          <View className="mt-3 flex-row gap-1.5">
            {METODOS_PAGO.map((m) => {
              const active = metodoPago === m.value;
              return (
                <Pressable
                  key={m.value}
                  onPress={() => setMetodoPago(m.value)}
                  className={`flex-1 items-center rounded-lg border px-1 py-2 ${
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card"
                  }`}
                >
                  <MaterialIcons
                    name={m.icon}
                    size={18}
                    color={active ? "#f97316" : "#737373"}
                  />
                  <Text
                    className={`mt-0.5 text-[11px] font-medium ${
                      active ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={handleCobrar}
            disabled={cobrando}
            activeOpacity={0.85}
            className={`mt-3 flex-row items-center justify-center gap-2 rounded-xl py-4 ${
              cobrando ? "bg-primary/60" : "bg-primary"
            }`}
          >
            {cobrando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <MaterialIcons name="check-circle" size={22} color="#fff" />
            )}
            <Text className="text-primary-foreground text-base font-bold">
              {cobrando
                ? "Procesando…"
                : !isOnline
                  ? `Guardar offline ${formatCLP(totales.total)}`
                  : `Cobrar ${formatCLP(totales.total)}`}
            </Text>
          </TouchableOpacity>

          {/* TODO M5+: imprimir boleta ESC/POS tras cobro exitoso.
              Requiere react-native-thermal-printer + emparejamiento
              Bluetooth con impresora 58mm/80mm. No viable en Expo Go,
              necesita dev build (EAS Build). */}
        </View>
      )}

      {/* Scanner modal */}
      <ScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={async (data) => {
          setScannerOpen(false);
          setSearching(true);
          try {
            const prod = await buscarPorCodigoBarras(data);
            if (prod) {
              handleProductoEncontrado(prod);
            } else {
              Alert.alert(
                "Producto no encontrado",
                `No existe un producto con el código ${data}.`,
              );
            }
          } catch (e) {
            Alert.alert(
              "Error",
              e instanceof Error ? e.message : "No pudimos buscar",
            );
          } finally {
            setSearching(false);
          }
        }}
      />

      {/* Confirmación de venta online */}
      <VentaExitosaModal
        venta={ventaExitosa}
        onClose={() => setVentaExitosa(null)}
      />

      {/* Confirmación de venta offline — encolada, no enviada */}
      <VentaOfflineModal
        venta={ventaOffline}
        onClose={() => setVentaOffline(null)}
      />
    </SafeAreaView>
  );
}

// ─── Componentes auxiliares ─────────────────────────────────────────────

function Row({
  label,
  value,
  muted,
  emphasize,
}: {
  label: string;
  value: string;
  muted?: boolean;
  emphasize?: boolean;
}) {
  return (
    <View className="flex-row justify-between">
      <Text
        className={`text-sm ${
          muted ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        {label}
      </Text>
      <Text
        className={`text-sm font-medium ${
          emphasize
            ? "text-success"
            : muted
              ? "text-muted-foreground"
              : "text-foreground"
        }`}
      >
        {value}
      </Text>
    </View>
  );
}

function CartRow({
  item,
  onInc,
  onDec,
  onRemove,
}: {
  item: CartItem;
  onInc: () => void;
  onDec: () => void;
  onRemove: () => void;
}) {
  const lineTotal = item.producto.precio * item.cantidad;
  return (
    <View className="bg-card border-border flex-row items-center rounded-xl border p-3">
      <View className="flex-1 pr-2">
        <Text
          className="text-foreground text-base font-medium"
          numberOfLines={1}
        >
          {item.producto.nombre}
        </Text>
        <Text className="text-muted-foreground text-xs">
          {formatCLP(item.producto.precio)} c/u · Stock {item.producto.stock}
        </Text>
        <Text className="text-primary mt-0.5 text-sm font-semibold">
          {formatCLP(lineTotal)}
        </Text>
      </View>
      <View className="flex-row items-center gap-1">
        <QtyBtn icon="remove" onPress={onDec} />
        <Text className="text-foreground w-8 text-center text-base font-semibold">
          {item.cantidad}
        </Text>
        <QtyBtn icon="add" onPress={onInc} />
        <TouchableOpacity
          onPress={onRemove}
          className="ml-1 h-8 w-8 items-center justify-center"
        >
          <MaterialIcons name="close" size={20} color="#a3a3a3" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function QtyBtn({
  icon,
  onPress,
}: {
  icon: "add" | "remove";
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="bg-muted h-8 w-8 items-center justify-center rounded-lg"
    >
      <MaterialIcons name={icon} size={18} color="#171717" />
    </TouchableOpacity>
  );
}

// ─── Scanner modal ──────────────────────────────────────────────────────

/**
 * Modal con CameraView. Se cierra al primer barcode leído o con el botón.
 * Usamos ref de "ya procesado" para evitar que onBarcodeScanned dispare
 * varias veces por el mismo frame (expo-camera lo hace ~30 fps).
 */
function ScannerModal({
  visible,
  onClose,
  onScan,
}: {
  visible: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const scanned = useRef(false);

  React.useEffect(() => {
    if (visible) scanned.current = false;
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <SafeAreaView className="flex-1 bg-black" edges={["top", "bottom"]}>
        <View className="flex-row items-center justify-between px-4 py-3">
          <TouchableOpacity onPress={onClose} className="p-2">
            <MaterialIcons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <Text className="text-base font-semibold text-white">
            Escanear código
          </Text>
          <View className="w-10" />
        </View>

        {!permission ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#f97316" />
          </View>
        ) : !permission.granted ? (
          <View className="flex-1 items-center justify-center p-6">
            <MaterialIcons name="no-photography" size={48} color="#fff" />
            <Text className="mt-3 text-center text-base font-semibold text-white">
              Necesitamos acceso a la cámara
            </Text>
            <Text className="mt-1 text-center text-sm text-neutral-300">
              Para escanear códigos de barras de productos.
            </Text>
            <TouchableOpacity
              onPress={requestPermission}
              className="bg-primary mt-5 rounded-lg px-5 py-3"
            >
              <Text className="text-primary-foreground font-semibold">
                Permitir cámara
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-1">
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: [
                  "ean13",
                  "ean8",
                  "upc_a",
                  "upc_e",
                  "code128",
                  "code39",
                  "code93",
                  "qr",
                ],
              }}
              onBarcodeScanned={(result) => {
                if (scanned.current) return;
                scanned.current = true;
                void Haptics.impactAsync(
                  Haptics.ImpactFeedbackStyle.Medium,
                );
                onScan(result.data);
              }}
            />
            {/* Viewfinder overlay */}
            <View className="pointer-events-none absolute inset-0 items-center justify-center">
              <View className="h-52 w-72 rounded-2xl border-2 border-white/80" />
              <Text className="mt-4 text-xs text-white/80">
                Apunta al código de barras
              </Text>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ─── Venta exitosa modal ────────────────────────────────────────────────

function VentaOfflineModal({
  venta,
  onClose,
}: {
  venta: { localId: string; total: number } | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={!!venta}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/50 p-6">
        <View className="bg-card w-full max-w-sm items-center rounded-2xl p-6">
          <View className="bg-warning/20 mb-3 h-16 w-16 items-center justify-center rounded-full">
            <MaterialIcons name="cloud-off" size={32} color="#f59e0b" />
          </View>
          <Text className="text-foreground text-lg font-bold">
            Guardado offline
          </Text>
          <Text className="text-muted-foreground mt-1 text-center text-sm">
            Se enviará al servidor automáticamente{"\n"}cuando recuperes conexión.
          </Text>

          <View className="bg-muted/50 mt-4 w-full rounded-lg p-3">
            <View className="flex-row justify-between">
              <Text className="text-muted-foreground text-sm">Total</Text>
              <Text className="text-foreground text-base font-bold">
                {formatCLP(venta?.total ?? 0)}
              </Text>
            </View>
            <Text className="text-muted-foreground mt-2 text-[11px]">
              ID local: {venta?.localId.slice(0, 8) ?? ""}…
            </Text>
          </View>

          <TouchableOpacity
            onPress={onClose}
            className="bg-primary mt-5 w-full items-center rounded-lg py-3"
          >
            <Text className="text-primary-foreground font-semibold">
              Nueva venta
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function VentaExitosaModal({
  venta,
  onClose,
}: {
  venta: VentaCreada | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={!!venta}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/50 p-6">
        <View className="bg-card w-full max-w-sm items-center rounded-2xl p-6">
          <View className="bg-success/20 mb-3 h-16 w-16 items-center justify-center rounded-full">
            <MaterialIcons name="check" size={36} color="#10b981" />
          </View>
          <Text className="text-foreground text-lg font-bold">
            ¡Venta registrada!
          </Text>
          <Text className="text-muted-foreground mt-1 text-xs uppercase tracking-wider">
            Boleta
          </Text>
          <Text className="text-foreground text-sm font-mono">
            {venta?.numeroBoleta ?? ""}
          </Text>

          <View className="mt-4 w-full gap-1">
            <Row
              label="Subtotal"
              value={formatCLP(venta?.subtotal ?? 0)}
              muted
            />
            <Row
              label="IVA 19%"
              value={formatCLP(venta?.impuesto ?? 0)}
              muted
            />
            <View className="border-border mt-1 flex-row justify-between border-t pt-2">
              <Text className="text-foreground font-semibold">Total</Text>
              <Text className="text-primary text-lg font-bold">
                {formatCLP(venta?.total ?? 0)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={onClose}
            className="bg-primary mt-5 w-full items-center rounded-lg py-3"
          >
            <Text className="text-primary-foreground font-semibold">
              Nueva venta
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
