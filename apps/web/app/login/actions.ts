"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { signIn } from "@/auth";

export async function loginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  // Rate limiting (si Upstash está configurado)
  if (process.env.UPSTASH_REDIS_REST_URL) {
    const { loginRatelimit, getClientIP } = await import("@/lib/rate-limit");
    const ip = getClientIP(await headers());
    const { success, reset } = await loginRatelimit.limit(ip);
    if (!success) {
      const minutos = Math.ceil((reset - Date.now()) / 60000);
      return { error: `Demasiados intentos. Intenta en ${minutos} minutos.` };
    }
  }

  try {
    await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email o contraseña incorrectos" };
    }
    throw error;
  }

  redirect("/");
}
