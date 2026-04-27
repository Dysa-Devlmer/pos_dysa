"use server";

import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { encode } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { prisma } from "@repo/db";
import { captureMessageSafe, captureExceptionSafe } from "@/lib/sentry-helpers";
import { getClientIP, warnIfDisabledInProd } from "@/lib/rate-limit";

// NextAuth v5 cookie names: __Secure- prefix requiere HTTPS.
// Detectamos por NEXTAUTH_URL (fuente de verdad del scheme real del sitio),
// no por NODE_ENV — `pnpm start` local es production pero sirve sobre HTTP.
const USE_SECURE_COOKIES = (process.env.NEXTAUTH_URL ?? "").startsWith("https://");
const SESSION_COOKIE = USE_SECURE_COOKIES
  ? "__Secure-authjs.session-token"
  : "authjs.session-token";
const CSRF_COOKIE = USE_SECURE_COOKIES
  ? "__Host-authjs.csrf-token"
  : "authjs.csrf-token";
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
    // Rate limiting distribuido con Upstash (producción ideal).
    // Usa wrapper con timeout 500ms + fail-closed en prod.
    const { loginRatelimit, limitWithTimeout } = await import(
      "@/lib/rate-limit"
    );
    const { success, reset } = await limitWithTimeout(
      loginRatelimit,
      ip,
      "login_action",
    );
    if (!success) {
      const minutos = Math.ceil((reset - Date.now()) / 60000);
      captureMessageSafe("login_rate_limited", {
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
      captureMessageSafe("login_failure", {
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
      secure: USE_SECURE_COOKIES, // HTTPS vía Cloudflare → Nginx en prod; HTTP local
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
    // Error inesperado — loguear sin crashear el cliente.
    // No loguear el objeto `error` raw: Prisma errors incluyen `meta.target`
    // y a veces parámetros de query → puede leakear email/RUT (Ley 21.719).
    // Solo el mensaje + nombre del error. El stacktrace completo va a Sentry
    // donde `beforeSend` aplica `pseudonymize()`.
    console.error(
      "[loginAction] unexpected error:",
      (error as Error)?.name ?? "Unknown",
      (error as Error)?.message ?? "(no message)"
    );
    captureExceptionSafe(error, {
      extra: { email, ip, context: "login_unexpected" },
    });
    return {
      error: "Error inesperado al iniciar sesión. Por favor intenta de nuevo.",
    };
  }

  redirect("/");
}
