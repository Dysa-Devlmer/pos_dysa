import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
// SS2 (audit Claude Code CLI 2026-04-28) — usar SafeAreaView de
// react-native-safe-area-context (ya en deps mobile) en vez del de
// react-native, que está deprecated y NO respeta gesture insets dinámicos
// en Android 12+ (gestos navigation) ni Dynamic Island en iPhone 14+.
// Síntoma observable: en device real, los <TextInput> de email/password
// quedaban tapados por status bar superior o teclado, impidiendo que el
// usuario tipee → "no entra al login".
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";

/**
 * Pantalla de login — DyPos CL mobile.
 *
 * UX mobile-first (ver skill mobile-design):
 * - Touch targets ≥ 44pt (Pressable con min-h-12)
 * - Primary CTA en thumb zone (abajo)
 * - KeyboardAvoidingView para que el form suba al aparecer el teclado
 * - Email con autocomplete/autoCorrect off (UX retail)
 *
 * Post-login: M2 no redirige explícitamente — el guard del layout root
 * detecta el token y navega automáticamente a (tabs).
 */
export default function LoginScreen() {
  const { login, isLoading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) return;
    setSubmitting(true);
    await login(email.trim(), password);
    setSubmitting(false);
  };

  const busy = isLoading || submitting;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-1 justify-between px-6 py-8">
          {/* Header / Brand */}
          <View className="mt-16">
            <Text className="text-foreground text-4xl font-bold tracking-tight">
              DyPos CL
            </Text>
            <Text className="text-muted-foreground mt-2 text-base">
              Ingresa a tu cuenta
            </Text>
          </View>

          {/* Form */}
          <View className="gap-4">
            <View>
              <Text className="text-foreground mb-2 text-sm font-medium">
                Email
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="admin@dypos-cl.cl"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!busy}
                className="border-input bg-card text-foreground min-h-12 rounded-lg border px-4 text-base"
              />
            </View>

            <View>
              <Text className="text-foreground mb-2 text-sm font-medium">
                Contraseña
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                textContentType="password"
                editable={!busy}
                className="border-input bg-card text-foreground min-h-12 rounded-lg border px-4 text-base"
              />
            </View>

            {error ? (
              <View className="bg-destructive/10 rounded-lg px-4 py-3">
                <Text className="text-destructive text-sm">{error}</Text>
              </View>
            ) : null}
          </View>

          {/* CTA — thumb zone */}
          <Pressable
            onPress={handleSubmit}
            disabled={busy || !email || !password}
            className={`min-h-12 items-center justify-center rounded-lg ${
              busy || !email || !password
                ? "bg-primary/50"
                : "bg-primary active:bg-primary/90"
            }`}
          >
            {busy ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-primary-foreground text-base font-semibold">
                Ingresar
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
