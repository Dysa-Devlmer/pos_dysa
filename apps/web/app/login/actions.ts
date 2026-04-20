"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import * as Sentry from "@sentry/nextjs";
import { signIn } from "@/auth";
import { getClientIP, warnIfDisabledInProd } from "@/lib/rate-limit";

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
    // Rate limiting distribuido con Upstash (producción ideal)
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
  } else {
    // Rate limiting en memoria (fallback — no persiste entre restarts)
    warnIfDisabledInProd("login attempt");
    const { checkMemoryRateLimit } = await import("@/lib/rate-limit");
    const { success, reset } = checkMemoryRateLimit(`login:${ip}`);
    if (!success) {
      const minutos = Math.ceil((reset - Date.now()) / 60000);
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
    // NEXT_REDIRECT no es un error — es el mecanismo de redirect. Siempre propagarlo.
    if ((error as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    if (error instanceof AuthError) {
      Sentry.captureMessage("login_failure", {
        level: "warning",
        extra: { email, ip, reason: error.type ?? "CredentialsSignin" },
      });
      return { error: "Email o contraseña incorrectos" };
    }
    // Error inesperado — loguear sin crashear el cliente
    console.error(
      "[loginAction] unexpected error type:",
      (error as { constructor?: { name?: string } })?.constructor?.name,
      error
    );
    Sentry.captureException(error, {
      extra: { email, ip, context: "login_unexpected" },
    });
    return {
      error: "Error inesperado al iniciar sesión. Por favor intenta de nuevo.",
    };
  }

  redirect("/");
}
