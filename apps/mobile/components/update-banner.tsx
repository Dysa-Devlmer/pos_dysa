import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useUpdateCheck } from "@/hooks/useUpdateCheck";

/**
 * Banner + modal de update disponible — Fase 2 M7.
 *
 * Estados:
 *   - Oculto: no hay update disponible O el usuario lo dismisseó en esta sesión.
 *   - Banner: azul inline arriba, dismissable — "Nueva versión 1.0.1 disponible".
 *   - Modal forceUpdate: fullscreen bloqueante cuando installed < minVersion.
 *     No se puede cerrar; solo "Actualizar ahora" que abre la URL del APK.
 *
 * Flujo "Actualizar":
 *   1. Usuario toca botón → Linking.openURL(apkUrl)
 *   2. Android abre el browser/installer con el APK
 *   3. Usuario confirma instalación (Android obliga a este tap, no es skippable)
 *   4. App se reinicia automáticamente tras instalación → runtime versión nueva
 *
 * Placement: va en _layout.tsx root, después del SyncBanner. El check en sí
 * corre silencioso en segundo plano via React Query; este componente solo
 * renderea UI si hay algo que mostrar.
 */
export function UpdateBanner() {
  const { data } = useUpdateCheck();
  const [dismissed, setDismissed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Early return para los casos sin update o dismissed (la mayoría del tiempo).
  if (!data || !data.updateAvailable || !data.remote) return null;
  if (dismissed && !data.forceUpdate) return null;

  const { remote, forceUpdate, installedVersion } = data;

  const handleUpdate = async () => {
    try {
      const supported = await Linking.canOpenURL(remote.apkUrl);
      if (!supported) {
        Alert.alert(
          "Error al abrir enlace",
          "No se pudo abrir el enlace de descarga. Intenta copiarlo manualmente.",
          [{ text: "OK" }],
        );
        return;
      }
      await Linking.openURL(remote.apkUrl);
    } catch (err) {
      console.error("[UpdateBanner] openURL failed:", err);
      Alert.alert(
        "Error",
        "No se pudo iniciar la descarga. Verifica tu conexión.",
        [{ text: "OK" }],
      );
    }
  };

  // ─── Modal forceUpdate (bloqueante) ────────────────────────────────────
  if (forceUpdate) {
    return (
      <Modal visible transparent={false} animationType="fade">
        <View className="bg-background flex-1 items-center justify-center px-6">
          <MaterialIcons name="system-update" size={80} color="#f97316" />
          <Text className="text-foreground mt-6 text-2xl font-bold">
            Actualización requerida
          </Text>
          <Text className="text-muted-foreground mt-3 text-center text-base">
            Tu versión {installedVersion} ya no es compatible. Actualiza a la
            versión {remote.version} para continuar usando POS Chile.
          </Text>
          {remote.notes ? (
            <ScrollView
              className="mt-4 max-h-40 w-full rounded-md bg-muted p-3"
              showsVerticalScrollIndicator
            >
              <Text className="text-muted-foreground text-sm">
                {remote.notes}
              </Text>
            </ScrollView>
          ) : null}
          <TouchableOpacity
            onPress={handleUpdate}
            className="bg-primary mt-8 w-full items-center rounded-lg py-4"
            activeOpacity={0.8}
          >
            <Text className="text-base font-bold text-white">
              Actualizar ahora
            </Text>
          </TouchableOpacity>
          <Text className="text-muted-foreground mt-4 text-xs">
            Al continuar, se descargará el APK. Android te pedirá confirmación
            antes de instalar.
          </Text>
        </View>
      </Modal>
    );
  }

  // ─── Banner inline (opcional) ──────────────────────────────────────────
  return (
    <>
      <TouchableOpacity
        onPress={() => setModalOpen(true)}
        activeOpacity={0.8}
      >
        <View className="flex-row items-center justify-center gap-2 bg-blue-600 px-4 py-1.5">
          <MaterialIcons name="system-update" size={14} color="#fff" />
          <Text className="text-xs font-semibold text-white" numberOfLines={1}>
            Nueva versión {remote.version} disponible · tocar para ver
          </Text>
        </View>
      </TouchableOpacity>

      {/* Modal de detalle — changelog + acción actualizar/después */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setModalOpen(false)}
      >
        <View className="flex-1 items-center justify-end bg-black/50">
          <View className="bg-background w-full rounded-t-2xl px-6 pb-10 pt-6">
            <View className="items-center">
              <View className="bg-muted mb-4 h-1 w-12 rounded-full" />
              <MaterialIcons name="system-update" size={48} color="#f97316" />
              <Text className="text-foreground mt-3 text-xl font-bold">
                Actualización disponible
              </Text>
              <Text className="text-muted-foreground mt-1 text-sm">
                {installedVersion} → {remote.version}
              </Text>
            </View>

            {remote.notes ? (
              <ScrollView
                className="mt-5 max-h-52 rounded-md bg-muted p-3"
                showsVerticalScrollIndicator
              >
                <Text className="text-foreground text-sm leading-5">
                  {remote.notes}
                </Text>
              </ScrollView>
            ) : (
              <Text className="text-muted-foreground mt-5 text-center text-sm">
                Sin notas de release.
              </Text>
            )}

            <View className="mt-6 gap-2">
              <TouchableOpacity
                onPress={() => {
                  setModalOpen(false);
                  void handleUpdate();
                }}
                className="bg-primary items-center rounded-lg py-3"
                activeOpacity={0.8}
              >
                <Text className="text-base font-bold text-white">
                  Actualizar ahora
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setModalOpen(false);
                  setDismissed(true);
                }}
                className="items-center rounded-lg py-3"
                activeOpacity={0.8}
              >
                <Text className="text-muted-foreground text-sm">
                  Más tarde
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

/**
 * Variante "loading" no exportada — no la uso porque un spinner en el
 * arranque por un update check es UX ruidoso. Si el fetch falla
 * silenciosamente, no pasa nada. Si tiene éxito, aparece el banner.
 * Si quieres debuggear, exportá este helper temporalmente.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _DebugLoadingBanner() {
  const { isLoading } = useUpdateCheck();
  if (!isLoading) return null;
  return (
    <View className="flex-row items-center justify-center gap-2 bg-muted px-4 py-1">
      <ActivityIndicator size="small" color="#666" />
      <Text className="text-muted-foreground text-xs">
        Verificando actualizaciones…
      </Text>
    </View>
  );
}
