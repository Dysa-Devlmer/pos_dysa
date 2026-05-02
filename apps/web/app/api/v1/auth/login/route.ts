import { NextResponse, type NextRequest } from "next/server";
import { encode } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { prisma } from "@repo/db";
import { captureMessageSafe, captureExceptionSafe } from "@/lib/sentry-helpers";
import {
  LoginRequestSchema,
  LoginResponseSchema,
} from "@repo/api-client/types";
import {
  getClientIP,
  warnIfDisabledInProd,
  checkMemoryRateLimit,
} from "@/lib/rate-limit";

/**
 * POST /api/v1/auth/login — login stateless para mobile (M2).
 *
 * Gotcha G-M01: NextAuth v5 usa cookies HttpOnly en web → incompatible con
 * mobile. Este endpoint devuelve JWT en BODY (no cookie). El mobile lo
 * guarda en expo-secure-store y lo envía como Authorization: Bearer en
 * requests subsecuentes.
 *
 * El JWT es 100% compatible con el que emite el Server Action `loginAction`
 * del web — mismo encode() de next-auth/jwt, mismo secret, mismo salt.
 * Esto permite que un token generado acá sea decodable por el middleware
 * edge del web si eventualmente queremos validación cross-surface.
 *
 * Rate limiting: mismo flujo que loginAction (Upstash si está, fallback
 * memoria). Devuelve 429 con Retry-After header.
 */

const USE_SECURE_COOKIES = (process.env.NEXTAUTH_URL ?? "").startsWith(
  "https://",
);
const SESSION_COOKIE = USE_SECURE_COOKIES
  ? "__Secure-authjs.session-token"
  : "authjs.session-token";
// Mobile: 7 días (más corto que web 30d — dispositivos son más fáciles de
// perder/robar que un laptop, y mobile puede re-loguear más fácil con
// Face ID / Touch ID en futuro). Cowork review M2 pidió este ajuste.
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 días en segundos

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ip = getClientIP(request.headers);

  // ── 1. Validar body con Zod ─────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body inválido, se esperaba JSON" },
      { status: 400 },
    );
  }

  const parsed = LoginRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Email o contraseña con formato inválido" },
      { status: 400 },
    );
  }
  const { email, password } = parsed.data;

  // ── 2. Rate limiting ────────────────────────────────────────────────────
  if (process.env.UPSTASH_REDIS_REST_URL) {
    const { loginRatelimit, limitWithTimeout } = await import(
      "@/lib/rate-limit"
    );
    const { success, reset } = await limitWithTimeout(
      loginRatelimit,
      ip,
      "api/v1/auth/login",
    );
    if (!success) {
      const minutos = Math.ceil((reset - Date.now()) / 60000);
      captureMessageSafe("login_rate_limited", {
        level: "warning",
        extra: { email, ip, minutos, endpoint: "api/v1/auth/login" },
      });
      return NextResponse.json(
        { error: `Demasiados intentos. Intenta en ${minutos} minutos.` },
        {
          status: 429,
          headers: { "Retry-After": String(minutos * 60) },
        },
      );
    }
  } else {
    warnIfDisabledInProd("api/v1/auth/login");
    const { success, reset } = checkMemoryRateLimit(`login:${ip}`);
    if (!success) {
      const minutos = Math.ceil((reset - Date.now()) / 60000);
      return NextResponse.json(
        { error: `Demasiados intentos. Intenta en ${minutos} minutos.` },
        {
          status: 429,
          headers: { "Retry-After": String(minutos * 60) },
        },
      );
    }
  }

  // ── 3. Verificar credenciales ──────────────────────────────────────────
  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario || !usuario.activo) {
      return NextResponse.json(
        { error: "Email o contraseña incorrectos" },
        { status: 401 },
      );
    }

    const ok = await bcrypt.compare(password, usuario.password);
    if (!ok) {
      captureMessageSafe("login_failure", {
        level: "warning",
        extra: {
          email,
          ip,
          reason: "CredentialsSignin",
          endpoint: "api/v1/auth/login",
        },
      });
      return NextResponse.json(
        { error: "Email o contraseña incorrectos" },
        { status: 401 },
      );
    }

    if (usuario.mustChangePassword) {
      return NextResponse.json(
        {
          error:
            "Debes cambiar tu contraseña temporal en el panel web antes de usar la app móvil.",
        },
        { status: 403 },
      );
    }

    // ── 4. Emitir JWT con encode() compat v5 ─────────────────────────────
    const now = Math.floor(Date.now() / 1000);
    const token = await encode({
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
      salt: SESSION_COOKIE, // salt debe coincidir con el nombre del cookie (v5 beta 31)
    });

    // ── 5. Validar response shape con Zod (defensive) y responder ────────
    const responseBody = {
      token,
      user: {
        id: String(usuario.id),
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
      },
    };
    const validated = LoginResponseSchema.parse(responseBody);
    return NextResponse.json(validated);
  } catch (error) {
    // No loguear `error` raw — ver lib/privacy.ts y comentario en login/actions.ts.
    // Prisma errors pueden incluir parámetros con PII. Sentry lo recibe filtrado
    // por `beforeSend` (pseudonymize email + truncar IP).
    console.error(
      "[api/v1/auth/login] unexpected:",
      (error as Error)?.name ?? "Unknown",
      (error as Error)?.message ?? "(no message)",
    );
    captureExceptionSafe(error, {
      extra: { email, ip, endpoint: "api/v1/auth/login" },
    });
    return NextResponse.json(
      { error: "Error inesperado. Por favor intenta de nuevo." },
      { status: 500 },
    );
  }
}
