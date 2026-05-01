import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
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
  ActualizarUsuarioMeRequestSchema,
  ApiClientError,
  CambiarPasswordRequestSchema,
  UsuarioSchema,
} from "@repo/api-client";

import { ScreenHeader } from "@/components/screen-header";
import { apiClient } from "@/stores/authStore";
import { useAuth } from "@/hooks/useAuth";

/**
 * Mi perfil — M6.
 *
 * Shows: nombre/email/rol (read-only desde GET /usuarios/me).
 * Accion crítica: cambiar contraseña (PUT /usuarios/me/password).
 * Logout queda también acá como shortcut rápido.
 *
 * El cambio de nombre/email no se expone por ahora — el caso de uso real
 * en mobile es bajo (los usuarios editan perfil desde la web) y simplifica
 * la UI. Si se pide, el backend PUT /me ya está listo.
 */

const PerfilResp = z.object({ data: UsuarioSchema });

async function fetchPerfil() {
  const { data } = await apiClient.get("/api/v1/usuarios/me", PerfilResp);
  return data;
}

export default function PerfilScreen() {
  const { logout } = useAuth();
  const query = useQuery({ queryKey: ["perfil", "me"], queryFn: fetchPerfil });

  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Bloque 6 (2026-04-30) — edición del nombre propio.
  // Avatar queda como follow-up: requiere expo-image-picker (no instalado),
  // base64 encoding cliente-side, y validación de tamaño (target <100 KB
  // para que el data URL no infle el JWT ni la BD).
  const [editingName, setEditingName] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [savingName, setSavingName] = useState(false);

  const handleStartEditName = () => {
    if (!query.data) return;
    setNuevoNombre(query.data.nombre);
    setEditingName(true);
  };

  const handleSaveNombre = async () => {
    const parsed = ActualizarUsuarioMeRequestSchema.safeParse({
      nombre: nuevoNombre,
    });
    if (!parsed.success) {
      Alert.alert(
        "Nombre inválido",
        parsed.error.issues[0]?.message ?? "Mínimo 1 caracter, máximo 200",
      );
      return;
    }
    setSavingName(true);
    try {
      await apiClient.put(
        "/api/v1/usuarios/me",
        parsed.data,
        z.object({ data: UsuarioSchema }),
      );
      Alert.alert("Perfil actualizado", "Tu nombre se cambió con éxito");
      setEditingName(false);
      query.refetch();
    } catch (err) {
      const msg =
        err instanceof ApiClientError ? err.message : "Error inesperado";
      Alert.alert("No se pudo guardar", msg);
    } finally {
      setSavingName(false);
    }
  };

  const handleCambiarPassword = async () => {
    if (nueva !== confirmar) {
      Alert.alert("No coinciden", "La nueva contraseña y su confirmación no coinciden");
      return;
    }
    const parsed = CambiarPasswordRequestSchema.safeParse({ actual, nueva });
    if (!parsed.success) {
      Alert.alert("Datos inválidos", parsed.error.issues[0]?.message ?? "");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.put(
        "/api/v1/usuarios/me/password",
        parsed.data,
        z.object({ data: z.object({ updated: z.boolean() }) }),
      );
      Alert.alert("Contraseña actualizada", "El cambio se aplicó con éxito");
      setActual("");
      setNueva("");
      setConfirmar("");
    } catch (err) {
      const msg =
        err instanceof ApiClientError ? err.message : "Error inesperado";
      Alert.alert("No se pudo cambiar", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="bg-background flex-1" edges={["top"]}>
      <ScreenHeader title="Mi perfil" />
      <ScrollView contentContainerClassName="p-4 gap-4 pb-8">
        {query.isLoading ? (
          <ActivityIndicator size="large" color="#f97316" />
        ) : query.data ? (
          <View className="bg-card border-border rounded-xl border p-4">
            {editingName ? (
              <>
                <Text className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wider">
                  Editar nombre
                </Text>
                <TextInput
                  value={nuevoNombre}
                  onChangeText={setNuevoNombre}
                  placeholder="Tu nombre completo"
                  placeholderTextColor="#a3a3a3"
                  editable={!savingName}
                  className="bg-background border-border text-foreground mb-3 rounded-xl border px-3 py-3 text-base"
                />
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={handleSaveNombre}
                    disabled={savingName || !nuevoNombre.trim()}
                    className={`flex-1 items-center justify-center rounded-lg py-3 ${
                      savingName || !nuevoNombre.trim()
                        ? "bg-primary/50"
                        : "bg-primary active:bg-primary/90"
                    }`}
                  >
                    {savingName ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text className="text-primary-foreground font-semibold">
                        Guardar
                      </Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setEditingName(false)}
                    disabled={savingName}
                    className="border-border flex-1 items-center justify-center rounded-lg border py-3"
                  >
                    <Text className="text-muted-foreground font-semibold">
                      Cancelar
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text className="text-foreground text-lg font-semibold">
                    {query.data.nombre}
                  </Text>
                  <Text className="text-muted-foreground text-sm">
                    {query.data.email}
                  </Text>
                  <View className="bg-primary/10 mt-2 self-start rounded-full px-2 py-0.5">
                    <Text className="text-primary text-[11px] font-semibold uppercase tracking-wider">
                      {query.data.rol}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={handleStartEditName}
                  className="bg-muted/60 rounded-full p-2"
                  accessibilityLabel="Editar nombre"
                  hitSlop={8}
                >
                  <MaterialIcons name="edit" size={18} color="#525252" />
                </TouchableOpacity>
              </View>
            )}
            <Text className="text-muted-foreground mt-3 text-xs">
              El email no se puede editar (es tu identificador de login). Si
              necesitás cambiarlo, contactá al administrador.
            </Text>
          </View>
        ) : null}

        <View className="bg-card border-border rounded-xl border p-4">
          <Text className="text-foreground text-base font-semibold">
            Cambiar contraseña
          </Text>

          <Text className="text-muted-foreground mt-3 mb-1 text-xs font-semibold uppercase tracking-wider">
            Actual
          </Text>
          <TextInput
            value={actual}
            onChangeText={setActual}
            placeholder="••••••"
            placeholderTextColor="#a3a3a3"
            secureTextEntry
            className="bg-background border-border text-foreground rounded-xl border px-3 py-3 text-base"
          />

          <Text className="text-muted-foreground mt-3 mb-1 text-xs font-semibold uppercase tracking-wider">
            Nueva
          </Text>
          <TextInput
            value={nueva}
            onChangeText={setNueva}
            placeholder="Mínimo 6 caracteres"
            placeholderTextColor="#a3a3a3"
            secureTextEntry
            className="bg-background border-border text-foreground rounded-xl border px-3 py-3 text-base"
          />

          <Text className="text-muted-foreground mt-3 mb-1 text-xs font-semibold uppercase tracking-wider">
            Confirmar
          </Text>
          <TextInput
            value={confirmar}
            onChangeText={setConfirmar}
            placeholder="Repetir nueva"
            placeholderTextColor="#a3a3a3"
            secureTextEntry
            className="bg-background border-border text-foreground rounded-xl border px-3 py-3 text-base"
          />

          <TouchableOpacity
            onPress={handleCambiarPassword}
            disabled={submitting}
            activeOpacity={0.8}
            className={`${submitting ? "opacity-60" : ""} bg-primary mt-4 items-center rounded-xl px-4 py-3`}
          >
            <Text className="font-semibold text-white">
              {submitting ? "Guardando…" : "Cambiar contraseña"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => {
            void logout();
          }}
          activeOpacity={0.8}
          className="border-destructive flex-row items-center justify-center gap-2 rounded-xl border px-4 py-3"
        >
          <MaterialIcons name="logout" size={20} color="#dc2626" />
          <Text className="text-destructive font-semibold">Cerrar sesión</Text>
        </TouchableOpacity>

        {/* Sentry crash-test (Fase 2D) — gated por __DEV__: NO se renderiza
            en release builds (Hermes inlinea __DEV__ a false en release y
            tree-shakea el bloque). Permite verificar que Sentry captura un
            crash controlado durante smoke local. */}
        {__DEV__ ? (
          <TouchableOpacity
            onPress={() => {
              throw new Error("sentry-mobile-test (intentional)");
            }}
            activeOpacity={0.8}
            className="border-border bg-muted/30 mt-2 flex-row items-center justify-center gap-2 rounded-xl border px-4 py-3"
          >
            <MaterialIcons name="bug-report" size={20} color="#737373" />
            <Text className="text-muted-foreground font-semibold">
              [DEV] Disparar crash test Sentry
            </Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
