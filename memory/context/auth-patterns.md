---
title: NextAuth v5 — Patterns, Bugs y Workarounds
tags:
  - auth
  - nextauth-v5
  - patterns
  - contexto
aliases:
  - Auth Patterns
  - NextAuth Gotchas
---

# NextAuth v5 — Patterns, Bugs y Workarounds

Referencia técnica de la implementación de autenticación en [[pos-chile-monorepo]]. Versión instalada: **`next-auth@5.0.0-beta.31`** con **`@auth/prisma-adapter@2.11.2`**.

Relacionado: [[stack-tech]] · [[security-owasp]] · [[business-logic]]

> [!warning] Beta — tener un ojo abierto
> NextAuth v5 sigue en beta. Algunas APIs cambian entre versiones minor. Los workarounds documentados aquí fueron probados contra `5.0.0-beta.31`.

## Arquitectura de archivos

```
apps/web/
├── auth.ts              ← Node runtime (usa Prisma)
├── auth.config.ts       ← Edge runtime (sin Prisma)
├── auth-types.d.ts      ← Module augmentation (NO next-auth.d.ts)
├── middleware.ts        ← usa auth.config.ts vía NextAuth(authConfig)
└── app/
    ├── api/auth/[...nextauth]/route.ts  ← const { GET, POST } = handlers
    └── login/
        ├── page.tsx
        └── actions.ts   ← loginAction con redirect: false + redirect manual
```

## Pattern 1 — Split config Node/Edge

Regla sagrada: **el middleware corre en edge runtime y NO puede importar Prisma**.

```ts
// auth.config.ts (edge-safe)
export default {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    session: async ({ session, token }) => { ... },
    authorized: ({ auth, request }) => { ... },
  },
} satisfies NextAuthConfig;

// auth.ts (Node only)
import authConfig from "./auth.config";
export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,              // ← OBLIGATORIO si hay proxy (Cloudflare/Nginx) — fix ef9ef79
  ...authConfig,
  providers: [Credentials({ ... })],
  callbacks: {
    ...authConfig.callbacks,
    jwt: async ({ token, user }) => { ... },
    // session sobrescrito de authConfig si hace falta lógica Node
  },
});

// middleware.ts
import authConfig from "./auth.config";
export const { auth: middleware } = NextAuth(authConfig);
```

> [!danger] Bug silencioso en prod con Cloudflare (resuelto en `ef9ef79`)
> Sin `trustHost: true`, NextAuth v5 rechaza requests cuyo `Host:` header **no coincide literalmente** con `NEXTAUTH_URL`. El proxy de Cloudflare (o Nginx/Caddy) reescribe el header → origin ve IP+puerto internos, no `dy-pos.zgamersa.com`. Resultado: `UntrustedHost` → login rompe en prod aunque el resto esté perfecto (Cookie correcta, SSL OK, DB conectada).
>
> **Regla**: cualquier deploy que pase por CDN / reverse proxy necesita `trustHost: true`. En dev local sin proxy se puede omitir, pero mejor dejarlo seteado siempre para evitar sorpresas al migrar ambientes.

## Pattern 2 — Middleware edge con RBAC (fix commit 81933a5)

> [!danger] Bug descubierto en audit
> Originalmente el `session` callback SÓLO estaba en `auth.ts`. El middleware edge no lo ejecutaba → `auth.user.rol` llegaba `undefined` al callback `authorized` → `/usuarios` redirigía incorrectamente a `/` incluso para ADMIN.
>
> **Diagnóstico real** (vs hipótesis inicial que decía que `auth` era JWT raw):
> ```json
> // auth shape en edge middleware:
> { "user": { "name": "Administrador", "email": "admin@pos-chile.cl" }, "expires": "..." }
> ```
> `auth` **ES Session** en edge también, pero sin el callback `session` definido en `auth.config.ts`, NextAuth construye una Session default (solo `name`+`email`) y **pierde `rol` aunque el JWT lo tenga**.

**Solución canónica**: definir el callback `session` en `auth.config.ts` — es puro (no usa Prisma), edge-safe, y corre en ambos runtimes:

```ts
// auth.config.ts
callbacks: {
  async session({ session, token }) {
    if (token && session.user) {
      session.user.id = token.id as string;
      session.user.rol = token.rol as Session["user"]["rol"];
    }
    return session;
  },
  authorized({ auth, request: { nextUrl } }) {
    const isLoggedIn = !!auth?.user;
    if (adminRoutes.some((r) => nextUrl.pathname.startsWith(r))) {
      if (auth?.user?.rol !== "ADMIN") {
        return Response.redirect(new URL("/", nextUrl));
      }
    }
    return true;
  },
}
```

Validado E2E con Playwright (4/4):
- ADMIN → `/usuarios` accede ✅
- CAJERO → `/usuarios` redirige a `/` ✅
- CAJERO → `/ventas` accede ✅
- Sin login → `/usuarios` redirige a `/login?callbackUrl=...` ✅

## Pattern 3 — JWT/session type augmentation

`auth-types.d.ts` en `apps/web/` raíz (NO `next-auth.d.ts` — colisiona con el paquete):

```ts
// apps/web/auth-types.d.ts
import type { Rol } from "@repo/db";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      rol: Rol;
    } & DefaultSession["user"];
  }
  interface User { rol: Rol; }
}

declare module "next-auth/jwt" {
  interface JWT { id: string; rol: Rol; }
}
```

> [!warning] Bug v5 beta — JWT augmentation no siempre aplica
> Aunque declares `interface JWT { rol: Rol }`, TypeScript a veces infiere `token.rol` como `unknown`. **Workaround**: cast explícito en el callback:
> ```ts
> session.user.rol = token.rol as Session["user"]["rol"];
> ```
> Pattern repetido en: `auth.ts` · `auth.config.ts` · cualquier Server Action que lea `token.rol`.

## Pattern 4 — Login action (Server Action v5) — catch block canónico

> [!danger] SUPERSEDED en prod por Pattern 4bis (commit `947cfc0`)
> El pattern con `signIn("credentials")` funciona en dev pero **FALLA en prod con NextAuth v5 beta.31** con error `MissingCSRF`. Razón: `signIn()` hace fetch server-to-server a `/api/auth/callback/credentials`, que no puede incluir la cookie CSRF del navegador. Ver **Pattern 4bis** abajo para el approach canónico actual.

Evolucionó en `d25add8` → `2b90ed8` (Sentry) → **`53c99e6`** (fix A6: NEXT_REDIRECT propagation + unexpected error handling).

```ts
// app/login/actions.ts
"use server";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import * as Sentry from "@sentry/nextjs";

export async function loginAction(_prev, formData) {
  try {
    await signIn("credentials", {
      email, password,
      redirect: false,           // ← CRÍTICO (ver bug abajo)
    });
  } catch (error) {
    // 1. NEXT_REDIRECT NO es error — es el mecanismo de redirect. Siempre propagar.
    if ((error as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    // 2. Fallo de credenciales explícito
    if (error instanceof AuthError) {
      Sentry.captureMessage("login_failure", { level: "warning", extra: { email, ip } });
      return { error: "Email o contraseña incorrectos" };
    }
    // 3. Error inesperado — log + Sentry, NUNCA re-throw (rompe cliente)
    console.error("[loginAction] unexpected:", (error as any)?.constructor?.name, error);
    Sentry.captureException(error, { extra: { email, ip, context: "login_unexpected" } });
    return { error: "Error inesperado al iniciar sesión. Por favor intenta de nuevo." };
  }
  redirect("/");                  // ← redirect MANUAL tras success
}
```

> [!danger] Bug A6 (QA report, resuelto en `53c99e6`)
> El catch anterior hacía `throw error` para cualquier cosa que NO fuera `AuthError`. En NextAuth v5 beta.31 hay casos donde el error lanzado **no pasa correctamente** el `instanceof AuthError` → se propaga al cliente de Next como error no manejado → **crash visible del login**. Síntoma específico: login de cajero crasheaba con response malformada.
>
> **Regla canónica del catch**: 3 ramas en orden estricto:
> 1. `digest?.startsWith("NEXT_REDIRECT")` → `throw` (es el redirect, no error)
> 2. `instanceof AuthError` → `return {error: "..."}` (credenciales mal)
> 3. Cualquier otra cosa → `console.error` + `Sentry.captureException` + `return {error: "..."}` **NUNCA `throw`**
>
> El cliente **jamás** debe recibir un error re-lanzado.

> [!danger] Bug v5 beta — signIn con `redirectTo`
> Si usas `redirectTo: "/"` dentro de `signIn`, tanto ÉXITO como FALLO lanzan `NEXT_REDIRECT` (Next.js internal). El catch ve un "error" que no es `AuthError` → no puedes distinguir fallo de credenciales.
>
> **Solución**: `redirect: false` + `redirect("/")` manual fuera del try/catch.

## Pattern 4bis — Login manual con JWT directo (fix MissingCSRF, commit `947cfc0`)

**Usar en prod con NextAuth v5 beta.31**. Bypass completo de `signIn()`:

```ts
// apps/web/app/login/actions.ts
"use server";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { encode } from "next-auth/jwt";     // ← NO @auth/core/jwt (no existe en v5 beta.31)
import bcrypt from "bcryptjs";
import { prisma } from "@repo/db";
import * as Sentry from "@sentry/nextjs";

const SESSION_COOKIE = "__Secure-authjs.session-token";  // prod con HTTPS
const CSRF_COOKIE = "__Host-authjs.csrf-token";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60;  // 30 días

export async function loginAction(_prev, formData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario || !usuario.activo) return { error: "Email o contraseña incorrectos" };

    const ok = await bcrypt.compare(password, usuario.password);
    if (!ok) return { error: "Email o contraseña incorrectos" };

    // Emitir JWT manualmente — salt MUST = cookie name
    const now = Math.floor(Date.now() / 1000);
    const jwtToken = await encode({
      token: {
        sub: String(usuario.id),
        id: String(usuario.id),
        email: usuario.email,
        name: usuario.nombre,
        rol: usuario.rol,                    // ← obligatorio para middleware RBAC
        iat: now,
        exp: now + SESSION_MAX_AGE,
        jti: crypto.randomUUID(),
      },
      secret: process.env.NEXTAUTH_SECRET!,
      salt: SESSION_COOKIE,                  // ← NextAuth v5 usa el nombre del cookie como salt
    });

    const cookieStore = await cookies();
    cookieStore.set({
      name: SESSION_COOKIE,
      value: jwtToken,
      httpOnly: true,
      secure: true,                          // HTTPS vía Cloudflare → Nginx
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    cookieStore.delete(CSRF_COOKIE);         // fuerza regeneración en el próximo request
  } catch (error) {
    // Catch canónico (ver Pattern 4): NEXT_REDIRECT → throw, resto → Sentry + return
    if ((error as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw error;
    Sentry.captureException(error, { extra: { email, context: "login_unexpected" } });
    return { error: "Error inesperado al iniciar sesión." };
  }
  redirect("/");
}
```

**Requisitos críticos**:
- `salt === SESSION_COOKIE` (nombre exacto del cookie — en v5 el salt se usa para derivación criptográfica)
- Import `encode` de `next-auth/jwt`, **no** de `@auth/core/jwt` (ese path no existe en v5 beta.31)
- JWT incluye `sub`, `id`, `email`, `name`, `rol`, `iat`, `exp`, `jti` — los callbacks `session()` y `jwt()` en `auth.ts` los consumen; sin `rol` rompe el middleware RBAC
- `secure: true` fijo en prod + `httpOnly: true` + `sameSite: "lax"`
- Borrar cookie CSRF para forzar regeneración

**Por qué funciona**: no hay fetch server-to-server → no se invoca el callback que exige CSRF. La verificación de credenciales es directa (bcrypt) y la sesión se establece escribiendo la cookie que NextAuth espera. El resto del sistema (middleware, `session()` callback, `auth()` en API routes) sigue funcionando normal porque lee la cookie estándar.

## Pattern 5 — API route handlers

```ts
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

> [!warning]
> NO uses `export { GET, POST } from "@/auth"` — v5 agrupa los handlers en un objeto `handlers`, no como exports planos. El pattern incorrecto rompe el JWT parsing silenciosamente (te devuelve 401 incluso con session válida).

## Pattern 6 — Cookies `__Secure-` en HTTPS only

> [!danger] Bug encontrado en audit producción (no corregido — decisión correcta)
> En `NODE_ENV=production` con `NEXTAUTH_URL=http://localhost:3000`, NextAuth emite cookie con prefijo **`__Secure-authjs.session-token`** que **Chromium rechaza sobre HTTP**. Resultado: login aparenta funcionar (Server Action redirige a `/`) pero la cookie NO se persiste → subsecuentes requests retornan 401.
>
> **Esto es comportamiento CORRECTO de seguridad en producción** — no es un bug del código. Pero hace imposible testear container Docker production sobre HTTP local.
>
> **Para validar auth real:** usar `pnpm dev` (`NODE_ENV=development`) o proxy HTTPS en container.

## Pattern 7 — Instrumentación Sentry en auth (commit 2b90ed8)

```ts
// app/login/actions.ts
import * as Sentry from "@sentry/nextjs";

// En catch de AuthError:
Sentry.captureMessage("login_failure", {
  level: "warning",
  extra: { email, ip, reason: error.type ?? "CredentialsSignin" },
});

// En rate limit excedido:
Sentry.captureMessage("login_rate_limited", {
  level: "warning",
  extra: { email, ip, minutos },
});
```

Activación: `SENTRY_DSN` en env. Si no está definida → `enabled: !!process.env.SENTRY_DSN` en `sentry.server.config.ts` hace que Sentry sea no-op (no crashea).

## Pattern 8 — Rate limiting de login con Upstash

```ts
// apps/web/lib/rate-limit.ts
export const loginRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  analytics: true,
  prefix: "pos-chile:login",
});
```

En login action (ver [[security-owasp]] para GAP-PROD-2):

```ts
if (process.env.UPSTASH_REDIS_REST_URL) {
  const { loginRatelimit } = await import("@/lib/rate-limit");
  const { success, reset } = await loginRatelimit.limit(ip);
  if (!success) return { error: `Demasiados intentos...` };
} else {
  warnIfDisabledInProd("login attempt");  // GAP-PROD-2: log warning en prod sin Upstash
}
```

## Gotchas resumidos

| # | Gotcha | Por qué | Workaround |
|---|--------|---------|------------|
| 1 | `next-auth.d.ts` hace shadow del paquete | TypeScript resuelve local antes que `node_modules` | Nombrar `auth-types.d.ts` |
| 2 | `declaration: true` rompe types NextAuth | TS2742 — tipos internos no portables | `declaration: false` en `nextjs.json` |
| 3 | `app/page.tsx` + `app/(dashboard)/page.tsx` colisionan | Ambos mapean a `/` | Borrar `app/page.tsx` |
| 4 | `token.rol` unknown aunque haya augmentation | Bug v5 beta | Cast `as Session["user"]["rol"]` |
| 5 | Middleware edge no propaga `rol` | Session callback solo en `auth.ts` | Mover session callback a `auth.config.ts` |
| 6 | `signIn` con `redirectTo` throws NEXT_REDIRECT en success y fail | API v5 beta ambigua | `redirect: false` + `redirect("/")` manual |
| 7 | Handlers NextAuth v5 | No son exports planos | `const { GET, POST } = handlers` |
| 8 | Cookie `__Secure-` en HTTP prod | Chromium la rechaza sobre HTTP | Solo testear prod sobre HTTPS |

## Archivos clave — ubicación exacta

| Archivo | Responsabilidad |
|---------|-----------------|
| `apps/web/auth.ts` | NextAuth config Node + Credentials + Prisma adapter |
| `apps/web/auth.config.ts` | Config edge-safe + `authorized` RBAC + `session` callback |
| `apps/web/auth-types.d.ts` | Module augmentation Session/User/JWT |
| `apps/web/middleware.ts` | Matcher + `NextAuth(authConfig)` |
| `apps/web/app/login/actions.ts` | loginAction con Sentry + rate limit |
| `apps/web/app/api/auth/[...nextauth]/route.ts` | GET/POST handlers |
| `apps/web/lib/rate-limit.ts` | Upstash ratelimiters + `warnIfDisabledInProd` |
| `apps/web/lib/check-env.ts` | Validación `NEXTAUTH_SECRET` en prod (GAP-PROD-1) |

## Seeds para testing

```
admin@pos-chile.cl / admin123  (rol ADMIN)
cajero@pos-chile.cl / cajero123 (rol CAJERO)
```

Creados en `packages/db/prisma/seed.ts` con `bcrypt.hash(pwd, 12)`.
