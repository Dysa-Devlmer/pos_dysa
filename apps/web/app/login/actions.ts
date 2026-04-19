"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import * as Sentry from "@sentry/nextjs";
import { signIn } from "@/auth";
import { getClientIP } from "@/lib/rate-limit";

export async function loginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const hdrs = await headers();
  const ip = getClientIP(hdrs);

  // Rate limiting (si Upstash está configurado)
  if (process.env.UPSTASH_REDIS_REST_URL) {
    const { loginRatelimit } = await import("@/lib/rate-limit");
    const { success, reset } = await loginRatelimit.limit(ip);
    if (!success) {
      const minutos = Math.ceil((reset - Date.now()) / 60000);
      Sentry.captureMessage("login_rate_limited", {
        level: "warning",
        extra: { email, ip, minutos },
      });
      return { error: `Demasiados intentos. Intenta en ${minutos} minutos.` };
    }
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      Sentry.captureMessage("login_failure", {
        level: "warning",
        extra: { email, ip, reason: error.type ?? "CredentialsSignin" },
      });
      return { error: "Email o contraseña incorrectos" };
    }
    throw error;
  }

  redirect("/");
}
