"use server";

import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { encode } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { prisma } from "@repo/db";
import * as Sentry from "@sentry/nextjs";
import { getClientIP, warnIfDisabledInProd } from "@/lib/rate-limit";

// NextAuth v5 cookie names en producción (con X-Forwarded-Proto: https → Secure prefix)
// El salt DEBE coincidir con el nombre del cookie que NextAuth v5 usa internamente.
const SESSION_COOKIE = "__Secure-authjs.session-token";
const CSRF_COOKIE = "__Host-authjs.csrf-token";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 días en segundos

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
    // ── Verificar credenciales directamente ──────────────────────────────────
    // Se evita la llamada HTTP interna de signIn() que en NextAuth v5 beta.31
    // falla con MissingCSRF al no poder incluir la cookie del navegador en el
    // fetch server-to-server a /api/auth/callback/credentials.
    if (!email || !password) {
      return { error: "Email o contraseña incorrectos" };
    }

    const usuario = await prisma.usuario.findUnique({ where: { email } });

    if (!usuario || !usuario.activo) {
      return { error: "Email o contraseña incorrectos" };
    }

    const ok = await bcrypt.compare(password, usuario.password);
    if (!ok) {
      Sentry.captureMessage("login_failure", {
        level: "warning",
        extra: { email, ip, reason: "CredentialsSignin" },
      });
      return { error: "Email o contraseña incorrectos" };
    }

    // ── Crear JWT compatible con NextAuth v5 ─────────────────────────────────
    // Los campos id y rol deben estar presentes para que los callbacks
    // session() y jwt() en auth.ts los propaguen correctamente.
    const now = Math.floor(Date.now() / 1000);
    const jwtToken = await encode({
      token: {
        sub: String(usuario.id),
        id: String(usuario.id),
        email: usuario.email,
        name: usuario.nombre,
        rol: usuario.rol,
        iat: now,
        exp: now + SESSION_MAX_AGE,
        jti: crypto.randomUUID(),
      },
      secret: process.env.NEXTAUTH_SECRET!,
      salt: SESSION_COOKIE, // NextAuth v5 usa el nombre del cookie como salt
    });

    // ── Establecer cookie de sesión ──────────────────────────────────────────
    const cookieStore = await cookies();
    cookieStore.set({
      name: SESSION_COOKIE,
      value: jwtToken,
      httpOnly: true,
      secure: true,      // HTTPS vía Cloudflare → Nginx (X-Forwarded-Proto: https)
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    // Limpiar CSRF cookie para forzar regeneración en el próximo request
    cookieStore.delete(CSRF_COOKIE);

  } catch (error) {
    // NEXT_REDIRECT no es un error — es el mecanismo de redirect. Siempre propagarlo.
    if ((error as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    // Error inesperado — loguear sin crashear el cliente
    console.error(
      "[loginAction] unexpected error:",
      (error as Error)?.message,
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
