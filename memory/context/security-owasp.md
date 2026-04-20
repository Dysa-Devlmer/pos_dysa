---
title: Security & OWASP — Audits, Hardening y Gaps de Producción
tags:
  - security
  - owasp
  - audit
  - hardening
  - contexto
aliases:
  - Security Audit
  - OWASP Findings
---

# Security & OWASP — Audits, Hardening y Gaps de Producción

Registro vivo de auditorías de seguridad de [[pos-chile-monorepo]]. Todas las correcciones están cerradas salvo las que explícitamente se marcan como "no aplica" o "aceptado como riesgo".

Relacionado: [[auth-patterns]] · [[infra-docker]] · [[business-logic]]

> [!info] Metodología
> Cada auditoría asigna IDs (`C*` crítico, `A*` alto, `M*` medio, `B*` bajo, `G*` Gemini, `GAP-*` gaps de producción). Cowork verifica independientemente cada fix leyendo el archivo y corriendo tests/type-check antes de marcarlo como cerrado.

## Audit 1 — Fase 8 (commit `acdcbce`)

Ejecutado por Gemini sobre el estado tras el CRUD + Ventas + POS + Dashboard + Reportes. 10 hallazgos, 9 fixes reales + 1 falso positivo.

| ID | Hallazgo | Severidad | Fix |
|----|----------|-----------|-----|
| C1 | `/api/productos` sin `auth()` | CRÍTICO | `auth()` + 401 en cada route |
| C2 | URL hardcoded en `packages/db/src/client.ts` | CRÍTICO | Throw si falta `POS_DATABASE_URL` |
| A1 | `NEXTAUTH_SECRET` débil por defecto | ALTO | `lib/check-env.ts` valida en prod |
| A2 | `authorized` callback sin RBAC | ALTO | `adminRoutes = ["/usuarios"]` + redirect |
| M1 | Listado usuarios visible a no-ADMIN | MEDIO | Cubierto por A2 |
| M2 | `buscarProductos/Cliente` sin restricción | MEDIO | `auth()` en server actions |
| M3 | `xlsx@0.18.5` CVEs Prototype Pollution | MEDIO | Migrado a `exceljs ^4.4.0` (commit `04d32f7`) |
| M4 | Login sin rate-limiting | MEDIO | Documentado + resuelto en Fase 14 con Upstash |
| B2 | bcrypt cost 10 | BAJO | Subido a 12 en crear y editar usuario |
| ~~B3~~ | ~~Sin índice en `fecha`~~ | ~~BAJO~~ | ❌ Falso positivo — `@@index([fecha])` existía desde Fase 1 |

## Audit 2 — Gemini Fases 9-12 (commit `7d36161`)

Security review enfocado en las fases de avatar, alertas, descuentos y devoluciones.

| ID | Hallazgo | Severidad | Fix |
|----|----------|-----------|-----|
| G1 | Avatar route: 2MB check post-readBody → DoS | ALTO | Content-Length pre-check + 413 |
| G2 | Devoluciones `$transaction` sin lock → race | CRÍTICO | `SELECT ... FOR UPDATE NOWAIT` primera op |
| G3 | `formatCLP` con `\u202f`/`\u00a0` → hydration mismatch | MEDIO | `.replace(/[\u202f\u00a0]/g, " ")` |
| G4 | bcrypt timing attack en `cambiarPassword` | INFO | ❌ Falso positivo — opera sobre sesión propia |
| G5 | `$queryRaw` SQL injection / BigInt overflow en alertas | INFO | ❌ No aplica — template literal parametrizado |

> [!danger] G2 — La más grave
> Sin `FOR UPDATE NOWAIT`, dos devoluciones concurrentes de la misma venta podían leer el mismo snapshot y aplicar reversión doble de stock. El `NOWAIT` hace que la segunda transacción falle rápido (en vez de colgarse) permitiendo reintentar.

## Audit 3 — OWASP Top 10 (GAP-1 + GAP-2, commit `2b90ed8`)

Audit estructurado contra el OWASP Top 10 2021. Dos gaps de alto nivel.

### GAP-1 — Security Headers faltantes

Agregados en `apps/web/next.config.ts` vía `async headers()`:

```ts
{
  key: "X-Content-Type-Options", value: "nosniff",
  key: "X-Frame-Options", value: "DENY",
  key: "Referrer-Policy", value: "strict-origin-when-cross-origin",
  key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload",
  key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()",
}
```

> [!warning] HSTS solo en producción
> El header HSTS se emite siempre pero Chromium lo ignora sobre HTTP. En `NEXTAUTH_URL=http://localhost:3000` no rompe nada; en prod sobre HTTPS queda 2 años + preload.

### GAP-2 — Sentry instrumentation en auth

`@sentry/nextjs@10.49.0` instalado con `enabled: !!process.env.SENTRY_DSN` → no-op si no hay DSN.

Events capturados en `app/login/actions.ts`:

```ts
Sentry.captureMessage("login_failure", {
  level: "warning",
  extra: { email, ip, reason: error.type ?? "CredentialsSignin" },
});

Sentry.captureMessage("login_rate_limited", {
  level: "warning",
  extra: { email, ip, minutos },
});
```

Hooks de prod (visibilidad de abuso): fallas consecutivas del mismo email, rate-limit 429, ips ofensivas.

## Audit 4 — GAP-PROD-1 + GAP-PROD-2 (commit `3bec5f5`)

Gaps de robustez para producción detectados tras OWASP audit.

### GAP-PROD-1 — `checkEnv` hardening

Antes: solo validaba presencia de `NEXTAUTH_SECRET`. Ahora rechaza placeholders y secrets cortos.

```ts
// apps/web/lib/check-env.ts
const INVALID_SECRET_PATTERNS = [
  /cambiar/i,
  /generar-con-openssl/i,
  /test[_-]?secret/i,
  /demo[_-]?secret/i,
  /placeholder/i,
  /^\s*$/,
];

export function checkEnv() {
  if (process.env.NEXT_PHASE === "phase-production-build") return; // skip en build
  if (process.env.NODE_ENV !== "production") return;

  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET no definida en producción");
  if (secret.length < 32) throw new Error("NEXTAUTH_SECRET demasiado corta (<32 chars)");
  for (const pat of INVALID_SECRET_PATTERNS) {
    if (pat.test(secret)) throw new Error(`NEXTAUTH_SECRET contiene placeholder (${pat})`);
  }
}
```

> [!info] Casos cubiertos por tests (10 tests en `check-env.test.ts`)
> - No definido → throw
> - `"cambiar"` → throw
> - `"generar-con-openssl-rand-base64-32"` → throw
> - `"test-secret"`, `"demo_secret"`, `"placeholdersecret"` → throw
> - `"a".repeat(20)` → throw (corto)
> - Secret válido 32+ chars → pasa
> - `AUTH_SECRET` como fallback → pasa
> - `NEXT_PHASE=phase-production-build` → skip
> - `NODE_ENV=development` → skip (aunque el secret sea placeholder)

### GAP-PROD-2 — `warnIfDisabledInProd` en rate-limit

Antes: si `UPSTASH_REDIS_REST_URL` faltaba, rate-limit se skippeaba silenciosamente en prod — sin advertencia. Ahora:

```ts
// apps/web/lib/rate-limit.ts
export function warnIfDisabledInProd(operation: string) {
  if (process.env.NODE_ENV === "production") {
    console.warn(
      `[rate-limit] DISABLED in production — ${operation}. ` +
      `Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN to enable.`
    );
  }
}
```

Llamado en `loginAction` y `requireRateLimit` (API helper) cuando Upstash no está configurado.

### QA C1 — Rate limit fallback EN MEMORIA (commit `53c99e6`)

Follow-up de GAP-PROD-2: el warning era visible pero no había protección real. QA marcó **C1 ALTA**: en dev y prod sin Upstash el sistema quedaba sin brute-force protection.

```ts
// apps/web/lib/rate-limit.ts
const memStore = new Map<string, { count: number; resetAt: number }>();

export function checkMemoryRateLimit(key: string): { success: boolean; reset: number } {
  const now = Date.now();
  const WINDOW_MS = 15 * 60 * 1000;
  const MAX = 5;

  // Prevenir memory leak limitando el tamaño en memoria
  if (memStore.size > 5000) {
    for (const [k, v] of memStore.entries()) if (now > v.resetAt) memStore.delete(k);
    if (memStore.size > 5000) memStore.clear();
  }

  const entry = memStore.get(key);
  if (!entry || now > entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { success: true, reset: now + WINDOW_MS };
  }
  if (entry.count >= MAX) return { success: false, reset: entry.resetAt };
  entry.count++;
  return { success: true, reset: entry.resetAt };
}
```

Uso en `loginAction`:
```ts
if (process.env.UPSTASH_REDIS_REST_URL) {
  // Upstash (ideal prod)
} else {
  warnIfDisabledInProd("login attempt");
  const { checkMemoryRateLimit } = await import("@/lib/rate-limit");
  const { success, reset } = checkMemoryRateLimit(`login:${ip}`);
  if (!success) return { error: `Demasiados intentos. Intenta en ${minutos} minutos.` };
}
```

> [!info] Limitaciones del fallback
> - **No persiste** entre restarts (Map en memoria del proceso)
> - **No distribuido** entre instancias (cada replica cuenta aparte)
> - **No sirve para producción serverless** con cold starts frecuentes
>
> Para prod real: Upstash sigue siendo la recomendación. Este fallback es para dev + prod self-hosted persistente + emergencias.

## Audit 5 — Gemini UX audit (commit `2d4f8ce`)

No es security en sentido estricto, pero incluye hardening de UI:
- Chart gradient colors (ChartConfig → Tailwind semantic colors)
- Table hover con `bg-accent/50`
- Badges soft con opacity bg-* /10
- Icon-buttons con tooltips accesibles (a11y)

## Cookies `__Secure-` — bug aceptado (NO corregible)

> [!danger] Imposible testear container Docker prod sobre HTTP
> Con `NODE_ENV=production` y `NEXTAUTH_URL=http://localhost:3000`, NextAuth emite cookie `__Secure-authjs.session-token` que Chromium **rechaza sobre HTTP**. El login aparenta funcionar (Server Action redirige) pero la cookie no se persiste → 401 en siguientes requests.
>
> **Esto es el comportamiento correcto** — no es bug del código. Para validar auth: `pnpm dev` (dev mode) o proxy HTTPS en container. Ver [[auth-patterns#Pattern 6]].

## Controles activos — Resumen

| Control | Dónde | Cómo |
|---------|-------|------|
| Password hashing | Create/edit usuario | bcryptjs cost 12 |
| Session | NextAuth | JWT strategy + `__Secure-` cookies en HTTPS |
| RBAC | `auth.config.ts::authorized` | `adminRoutes` para `/usuarios` |
| Rate limit login | `loginAction` | Upstash 5 intentos / 15 min |
| Rate limit API | `requireRateLimit` | Upstash 100 req/min por IP |
| Input validation | Server actions | Zod schemas |
| SQL injection | Prisma | Parametrización automática + `$queryRaw` con template literals |
| XSS | Next.js App Router | Escape por default en JSX |
| CSRF | NextAuth v5 | Tokens CSRF integrados |
| Security headers | `next.config.ts` | 5 headers OWASP |
| Observability | Sentry | `login_failure`, `login_rate_limited`, unhandled errors |
| Secrets | `checkEnv` | Longitud 32+ + rechazo placeholders |
| File upload | Avatar route | Content-Length pre-check + 2MB cap + sharp → 200×200 JPEG |
| Race conditions | Devoluciones | `SELECT FOR UPDATE NOWAIT` primera op |
| Number format | `formatCLP` | Normalize `\u202f`, `\u00a0` → espacio |

## Tests de seguridad

- `apps/web/lib/__tests__/check-env.test.ts` — **13 tests** (GAP-PROD-1 + boundary 31/32 + placeholder-secret, Fase 19)
- `apps/web/lib/__tests__/utils.test.ts` — **37 tests** (validarRUT, formatRUT, calcularIVA, formatCLP normalize, hydration safety Fase 19, validarRUT edge cases Fase 19)
- `apps/web/lib/__tests__/reportes-fecha.test.ts` — **18 tests**

**Total: 68/68 tests passing** (commit `7e7444c` agregó +11 en Fase 19).

### Falsos positivos verificados contra Gemini

Tres hallazgos reportados por Gemini fueron verificados y rechazados con justificación técnica explícita. Queden documentados aquí para evitar re-discutirlos en futuros audits:

| ID | Hallazgo Gemini | Por qué es falso positivo |
|----|-----------------|---------------------------|
| G4 | `cambiarPassword` timing attack | Opera sobre la sesión del propio usuario (`session.user.id`); no hay oráculo para atacante externo. Timing safe irrelevante |
| G5 | `$queryRaw` SQL injection / BigInt overflow | Es template literal parametrizado — Prisma escapa los `${}` automáticamente. Sería injection solo con concatenación de strings (no se usa) |
| B3 | Sin índice en columna `fecha` | El índice `@@index([fecha])` existe desde Fase 1 (commit `253f2c4`) en `packages/db/prisma/schema.prisma`. Gemini no lo vio |

> [!info] Protocolo: cada hallazgo Gemini rechazado requiere justificación reproducible
> No basta con "no aplica". Cowork exige ubicar la línea exacta y explicar por qué. Si no se puede reproducir el vector de ataque en código real → falso positivo. Esto evita que re-aparezcan en audits futuros.

### Hydration safety — regression guard (Fase 19)

El bug G3 (formatCLP emitiendo U+202F/U+00A0) ya está resuelto, pero ahora tiene tests dedicados que fallan si alguien refactoriza el `.replace` fuera:

```ts
// utils.test.ts
it("no emite U+202F ni U+00A0", () => {
  for (const n of [0, 1, 1_000, 1_234_567, 10_000_000]) {
    expect(formatCLP(n)).not.toMatch(/[\u202f\u00a0]/);
  }
});
```

## Checklist pre-deploy producción

- [ ] `NEXTAUTH_SECRET` generado con `openssl rand -base64 32` y NO en git
- [ ] `NEXTAUTH_URL=https://...` (HTTPS obligatorio para `__Secure-` cookies)
- [ ] `POS_DATABASE_URL` apunta a BD managed con SSL
- [ ] `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` configurados (sin esto, warning en cada request)
- [ ] `SENTRY_DSN` configurado
- [ ] `pnpm build` limpio (el `checkEnv` skip en build pero runs al arrancar runtime)
- [ ] Test de login con cuenta cajero + admin
- [ ] Test RBAC: cajero → `/usuarios` debe redirigir
- [ ] Test rate-limit: 6 logins fallidos consecutivos → `429`
- [ ] Verificar headers HTTP con `curl -I` → 5 headers de seguridad presentes
