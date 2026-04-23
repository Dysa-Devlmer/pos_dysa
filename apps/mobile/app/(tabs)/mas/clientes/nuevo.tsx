import React, { useState } from "react";
import { useRouter } from "expo-router";
import {
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
  ClienteSchema,
  CrearClienteRequestSchema,
} from "@repo/api-client";
import { validarRUT, formatRUT } from "@repo/domain";

import { ScreenHeader } from "@/components/screen-header";
import { apiClient } from "@/stores/authStore";

/**
 * Formulario de alta de cliente — M6.
 *
 * Validación local con validarRUT() antes de enviar al server — evita
 * 400 desperdiciado. El server también valida unicidad con 409 (RUT
 * duplicado) que mapeamos a un Alert visible.
 */

const CrearResp = z.object({ data: ClienteSchema });

type FieldErrors = Partial<
  Record<"rut" | "nombre" | "email" | "telefono" | "direccion", string>
>;

export default function NuevoClienteScreen() {
  const router = useRouter();
  const [rut, setRut] = useState("");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const next: FieldErrors = {};
    const rutTrim = rut.trim();
    const nombreTrim = nombre.trim();
    if (!validarRUT(rutTrim)) next.rut = "RUT inválido";
    if (nombreTrim.length < 1) next.nombre = "Nombre requerido";
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      next.email = "Email inválido";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const body = CrearClienteRequestSchema.parse({
      rut: formatRUT(rutTrim),
      nombre: nombreTrim,
      email: email.trim() || "",
      telefono: telefono.trim() || undefined,
      direccion: direccion.trim() || undefined,
    });

    setSubmitting(true);
    try {
      await apiClient.post("/api/v1/clientes", body, CrearResp);
      router.back();
    } catch (err) {
      const msg =
        err instanceof ApiClientError ? err.message : "Error inesperado";
      Alert.alert("No se pudo crear", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="bg-background flex-1" edges={["top"]}>
      <ScreenHeader title="Nuevo cliente" />
      <ScrollView contentContainerClassName="p-4 gap-4 pb-8">
        <Field
          label="RUT"
          placeholder="12.345.678-9"
          value={rut}
          onChangeText={setRut}
          autoCapitalize="none"
          error={errors.rut}
        />
        <Field
          label="Nombre"
          placeholder="Juan Pérez"
          value={nombre}
          onChangeText={setNombre}
          error={errors.nombre}
        />
        <Field
          label="Email (opcional)"
          placeholder="juan@ejemplo.cl"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          error={errors.email}
        />
        <Field
          label="Teléfono (opcional)"
          placeholder="+56 9 ..."
          value={telefono}
          onChangeText={setTelefono}
          keyboardType="phone-pad"
        />
        <Field
          label="Dirección (opcional)"
          placeholder="Av. ..."
          value={direccion}
          onChangeText={setDireccion}
        />

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
          className={`${submitting ? "opacity-60" : ""} bg-primary mt-2 items-center rounded-xl px-4 py-3`}
        >
          <Text className="font-semibold text-white">
            {submitting ? "Guardando…" : "Guardar cliente"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  error?: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address" | "phone-pad";
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  autoCapitalize,
  keyboardType,
}: FieldProps) {
  return (
    <View>
      <Text className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wider">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#a3a3a3"
        autoCapitalize={autoCapitalize ?? "sentences"}
        keyboardType={keyboardType ?? "default"}
        className={`bg-card text-foreground rounded-xl border px-3 py-3 text-base ${
          error ? "border-destructive" : "border-border"
        }`}
      />
      {error ? (
        <Text className="text-destructive mt-1 text-xs">{error}</Text>
      ) : null}
    </View>
  );
}
