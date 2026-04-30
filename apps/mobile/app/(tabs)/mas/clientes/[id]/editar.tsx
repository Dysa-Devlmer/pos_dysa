import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  ActualizarClienteRequestSchema,
  ApiClientError,
  ClienteSchema,
  type ActualizarClienteRequest,
  type Cliente,
} from "@repo/api-client";

import { ScreenHeader } from "@/components/screen-header";
import { apiClient } from "@/stores/authStore";

/**
 * Editar cliente — Bloque 6 SaaS pivot 2026-04-30.
 *
 * Cubre el gap reportado por el owner: la app mobile permitía CREAR
 * cliente pero no EDITARLO (había que hacerlo desde web). Ahora el
 * cajero puede actualizar nombre/email/teléfono/dirección desde el
 * device sin pasar por web.
 *
 * Lo que NO se edita (decisión deliberada):
 *   - RUT: identificador único, cambiarlo rompe integridad histórica
 *     de ventas asociadas. Si el RUT estaba mal, eliminar y crear
 *     el cliente nuevo.
 *
 * Endpoint: PUT /api/v1/clientes/[id] (ya existente, audit-logged).
 */

const FetchResp = z.object({ data: ClienteSchema });
const UpdateResp = z.object({ data: ClienteSchema });

async function fetchCliente(id: number): Promise<Cliente> {
  const { data } = await apiClient.get(`/api/v1/clientes/${id}`, FetchResp);
  return data;
}

async function updateCliente(
  id: number,
  payload: ActualizarClienteRequest,
): Promise<Cliente> {
  const validated = ActualizarClienteRequestSchema.parse(payload);
  const { data } = await apiClient.put(
    `/api/v1/clientes/${id}`,
    validated,
    UpdateResp,
  );
  return data;
}

type FieldErrors = Partial<
  Record<"nombre" | "email" | "telefono" | "direccion", string>
>;

export default function EditarClienteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const clienteId = Number(id);

  const { data: cliente, isLoading } = useQuery({
    queryKey: ["cliente", clienteId],
    queryFn: () => fetchCliente(clienteId),
    enabled: Number.isFinite(clienteId) && clienteId > 0,
    staleTime: 30_000,
  });

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  // Pre-poblar form con datos del cliente cuando llega la query.
  useEffect(() => {
    if (cliente) {
      setNombre(cliente.nombre);
      setEmail(cliente.email ?? "");
      setTelefono(cliente.telefono ?? "");
      setDireccion(cliente.direccion ?? "");
    }
  }, [cliente]);

  const validate = (): boolean => {
    const errs: FieldErrors = {};
    if (!nombre.trim()) errs.nombre = "Obligatorio";
    if (email && !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      errs.email = "Formato inválido";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (saving) return;
    if (!validate()) return;
    setSaving(true);
    try {
      await updateCliente(clienteId, {
        nombre: nombre.trim(),
        email: email.trim(),
        telefono: telefono.trim(),
        direccion: direccion.trim(),
      });
      Alert.alert("Cliente actualizado", "Los cambios se guardaron.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e) {
      if (e instanceof ApiClientError) {
        if (e.status === 404) {
          Alert.alert("Cliente no encontrado", e.message);
        } else if (e.status === 422 || e.status === 400) {
          Alert.alert("Datos inválidos", e.message);
        } else {
          Alert.alert("Error", e.message);
        }
      } else {
        Alert.alert("Error inesperado", "Intenta nuevamente.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="bg-background flex-1" edges={["top"]}>
        <ScreenHeader title="Editar cliente" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      </SafeAreaView>
    );
  }

  if (!cliente) {
    return (
      <SafeAreaView className="bg-background flex-1" edges={["top"]}>
        <ScreenHeader title="Editar cliente" />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-muted-foreground text-center">
            Cliente no encontrado.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-background flex-1" edges={["top"]}>
      <ScreenHeader title="Editar cliente" />
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="px-4 pb-8 pt-2">
          {/* RUT (read-only) */}
          <View className="bg-muted/50 mb-4 rounded-lg px-4 py-3">
            <Text className="text-muted-foreground mb-1 text-xs">RUT</Text>
            <Text className="text-foreground font-mono text-base">
              {cliente.rut}
            </Text>
            <Text className="text-muted-foreground mt-1 text-xs">
              No editable. Si el RUT está incorrecto, elimina este cliente y
              crea uno nuevo.
            </Text>
          </View>

          {/* Nombre */}
          <View className="mb-4">
            <Text className="text-foreground mb-2 text-sm font-medium">
              Nombre
            </Text>
            <TextInput
              value={nombre}
              onChangeText={setNombre}
              placeholder="Juan Pérez"
              placeholderTextColor="#9ca3af"
              editable={!saving}
              className="border-input bg-card text-foreground min-h-12 rounded-lg border px-4 text-base"
            />
            {errors.nombre && (
              <Text className="text-destructive mt-1 text-xs">
                {errors.nombre}
              </Text>
            )}
          </View>

          {/* Email */}
          <View className="mb-4">
            <Text className="text-foreground mb-2 text-sm font-medium">
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="cliente@ejemplo.cl"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!saving}
              className="border-input bg-card text-foreground min-h-12 rounded-lg border px-4 text-base"
            />
            {errors.email && (
              <Text className="text-destructive mt-1 text-xs">
                {errors.email}
              </Text>
            )}
          </View>

          {/* Teléfono */}
          <View className="mb-4">
            <Text className="text-foreground mb-2 text-sm font-medium">
              Teléfono
            </Text>
            <TextInput
              value={telefono}
              onChangeText={setTelefono}
              placeholder="+56 9 1234 5678"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              editable={!saving}
              className="border-input bg-card text-foreground min-h-12 rounded-lg border px-4 text-base"
            />
          </View>

          {/* Dirección */}
          <View className="mb-6">
            <Text className="text-foreground mb-2 text-sm font-medium">
              Dirección
            </Text>
            <TextInput
              value={direccion}
              onChangeText={setDireccion}
              placeholder="Av. Ejemplo 123, Comuna"
              placeholderTextColor="#9ca3af"
              editable={!saving}
              multiline
              numberOfLines={2}
              className="border-input bg-card text-foreground min-h-12 rounded-lg border px-4 py-3 text-base"
            />
          </View>

          {/* Acciones */}
          <View className="gap-2">
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={saving || !nombre}
              className={`min-h-12 items-center justify-center rounded-lg ${
                saving || !nombre
                  ? "bg-primary/50"
                  : "bg-primary active:bg-primary/90"
              }`}
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-primary-foreground text-base font-semibold">
                  Guardar cambios
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.back()}
              disabled={saving}
              className="min-h-12 items-center justify-center rounded-lg"
            >
              <Text className="text-muted-foreground text-sm">Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
