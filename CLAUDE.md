# CLAUDE.md — POS Chile Monorepo (Next.js 15)

> **⚠️ LEER AL INICIO DE CADA SESIÓN — reglas absolutas del proyecto**
> El stack PHP anterior fue migrado a un monorepo Next.js 15. El legacy PHP fue eliminado del repo (`zip/` borrado — estaba en `.gitignore` y nunca fue commiteado).

---

## 🧠 Segundo Cerebro — Carga automática obligatoria

**Antes de cualquier tarea, leer SIEMPRE en este orden:**

1. `memory/projects/pos-chile-monorepo.md` — estado completo del proyecto,
   fases completadas, commits importantes, gotchas acumulados
2. `memory/context/stack-tech.md` — stack exacto con versiones

**Según la tarea, leer el contexto específico:**

| Si la tarea involucra... | Leer también... |
|--------------------------|-----------------|
| Auth, login, sesiones, JWT | `memory/context/auth-patterns.md` |
| Seguridad, OWASP, headers | `memory/context/security-owasp.md` |
| Ventas, IVA, RUT, boletas | `memory/context/business-logic.md` |
| Docker, PostgreSQL, env vars | `memory/context/infra-docker.md` |
| Agentes, workflow, coordinación | `memory/context/agents-workflow.md` |

**Al cerrar sesión:** ejecutar `/session-end` para actualizar memory/
con decisiones nuevas y hacer commit.

> ⚡ El hook post-commit captura todos los commits automáticamente
> en `memory/.pending-notes`. `/session-end` los procesa y los
> convierte en conocimiento estructurado. Sin este paso final,
> los commits quedan capturados pero sin procesar.

---

## 🚢 Workflow Deploy — local → `scripts/deploy.sh` → prod (OBLIGATORIO)

**Regla**: ningún cambio toca producción sin pasar por `scripts/deploy.sh`.
Cero excepciones — ni "solo un fix rápido", ni "ssh manual al VPS".

### Flujo canónico

1. **Local** — desarrollar + testear con `pnpm dev`
2. **Verificación** — `pnpm --filter web type-check && pnpm --filter web build`
3. **Commit + push** — `git commit` (hook auto-captura) + `git push origin main`
4. **`./scripts/deploy.sh`** — script único, 6 fases con rollback automático:
   - Pre-flight (Docker, SSH, `.env.docker` válido, `NEXTAUTH_SECRET` seteado)
   - Build local opcional
   - Confirmación explícita (typear `deploy`)
   - rsync + scp separado de `.env.docker`
   - `docker compose up -d --build --force-recreate --remove-orphans` en VPS
   - Health check 12×10s; rollback auto al último backup si falla
5. **Verificación prod** — SIEMPRE en browser incógnito (ver gotcha 77 — curl NO es equivalente para Server Actions)

### Prohibido (destruye trazabilidad y atrasa sesiones futuras)

- ❌ `ssh VPS` + editar archivos directo en prod (usar `./scripts/deploy.sh`)
- ❌ `docker compose up` en prod sin `--force-recreate` (gotcha 75)
- ❌ "probar con curl y dar por OK el login" — los Server Actions necesitan browser (gotcha 77)
- ❌ Cloudflare SSL mode `Flexible` cuando el origin tiene HTTPS — loop infinito (gotcha 76)

### Prerequisitos de la deploy key

El script usa `~/.ssh/pos_deploy_ed25519` (sin passphrase, scope solo para deploy):

```bash
# Si la key no existe (onboarding nuevo agente/máquina):
ssh-keygen -t ed25519 -f ~/.ssh/pos_deploy_ed25519 -N "" -C "pos-deploy@system_pos"
ssh-copy-id -i ~/.ssh/pos_deploy_ed25519.pub root@64.176.21.229
```

---

## 🚀 Stack Actual

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Monorepo | Turborepo | 2.5.x — usa `"tasks"` (NO `"pipeline"`) |
| Package manager | pnpm | 10.6.0 |
| Framework | Next.js | 15.3.x — App Router + Turbopack |
| CSS | Tailwind CSS | v4.2.x — CSS-native, sin tailwind.config.js |
| Componentes | shadcn/ui | new-york style, `"config": ""` en components.json |
| ORM | Prisma | 6.x → resuelve 6.19.3 |
| BD | PostgreSQL | 16-alpine (Docker, localhost:5432) |
| Auth | NextAuth | v5.0.0-beta.31 — JWT strategy, PrismaAdapter |
| Lenguaje | TypeScript | 5.8.x — strict mode |
| Infra | Docker Compose | v2 (sin `version:` key) |

---

## 🔴 Reglas Obligatorias

### 1. Convenciones de código

```typescript
// ✅ Server Component por defecto (sin "use client")
// ✅ "use client" solo cuando se usan hooks
// ✅ Server Actions en app/*/actions.ts
// ✅ API routes en app/api/*/route.ts
// ✅ crearVenta/editarVenta/eliminarVenta SIEMPRE en $transaction

// CLP → Int en Prisma, formatCLP() en display
// RUT → String "12.345.678-9", validarRUT() para validación
// IVA → 19% fijo, calcularIVA(subtotal) en lib/utils.ts
// Boleta → nanoid formato B-YYYYMMDD-XXXXXXXX

// Nombres: camelCase vars, PascalCase componentes, kebab-case rutas
```

### 2. NextAuth v5 — patterns correctos

```typescript
// auth.ts (Node) → export const { auth, handlers, signIn, signOut } = NextAuth({...})
// auth.config.ts (edge) → export default { ... } satisfies NextAuthConfig
// middleware.ts → export const { auth: middleware } = NextAuth(authConfig)
// API route → const { GET, POST } = handlers  (NO: export { GET, POST } from "@/auth")
// Tipos → auth-types.d.ts (NO next-auth.d.ts — shadow)
// Cast → token.rol as Session["user"]["rol"] (bug v5 beta)
```

### 3. Prisma — Chile-específico

```prisma
precio    Int    // CLP sin decimales — NUNCA Float
rut       String // "12.345.678-9" normalizado
ventas    Int    @default(0)    // contador en Producto
compras   Int    @default(0)    // contador en Cliente
ultimaCompra DateTime?          // recalcular desde historial al eliminar venta

// db scripts: dotenv -e .env -o -- prisma ...
// -o OBLIGATORIO → override de DATABASE_URL de Supabase en shell de Pierre
```

### 4. Lógica de negocio crítica (ventas)

```
Crear:  stock -= cantidad, ventas += cantidad, compras += 1, ultimaCompra = now()  → $transaction
Eliminar: stock += cantidad, ventas -= cantidad, compras -= 1,
          ultimaCompra = MAX(fecha) del historial restante (NO asumir anterior) → $transaction
Editar: revertir vieja + aplicar nueva → $transaction
```

### 5. Gotchas — NO repetir estos errores

1. `pnpm.onlyBuiltDependencies` en root package.json — requerido para Prisma pnpm 10
2. `declaration: false` en nextjs.json — TS2742 si es true
3. `app/page.tsx` NO coexiste con `app/(dashboard)/page.tsx`
4. `rm -r` (no `rm -rf`) — protección hardcoded en CLI
5. Tailwind v4: sin `tailwind.config.js` ni `tailwindcss-animate`
6. `apps/web/.env.local` va en `apps/web/`, NO en la raíz del monorepo
7. `@prisma/client` como dep directa en `apps/web/` + `serverExternalPackages`
8. `POS_DATABASE_URL` en PrismaClient (Pierre tiene DATABASE_URL de Supabase en shell)
9. login action: `redirect: false` + `redirect("/")` manual (v5 beta bug)
10. client.ts: POS_DATABASE_URL obligatoria (ya no hay hardcoded fallback)
11. `@tailwindcss/oxide` en `onlyBuiltDependencies` — requerido en pnpm 10 con Tailwind v4
12. `sharp` en `serverExternalPackages` — necesario para procesamiento de imágenes en Node runtime
13. Avatar como base64 data URL en DB — no requiere volumen Docker ni filesystem externo

---

## 📊 Plan Maestro — Estado

| Fase | Contenido | Agente | Estado |
|------|-----------|--------|--------|
| 1 | Setup monorepo + Docker + Prisma | CLI | ✅ 253f2c4 |
| fix | dotenv-cli + docker-compose | CLI | ✅ 6e93c56 |
| 2 | NextAuth v5 + roles + layout + sidebar | CLI | ✅ 063edfb |
| fix | E2E auth + Prisma resolution | CLI | ✅ d25add8 |
| 3 | CRUD: Categorías, Productos, Clientes, Usuarios | Worktree | ✅ 23faa99 |
| 4 | Módulo Ventas: crear/editar/eliminar + stock | Worktree | ✅ 60d5dd9 |
| 5 | POS Caja: carrito real-time, IVA, métodos pago | Worktree | ✅ fe13e63 |
| 6 | Dashboard: KPIs CLP, Recharts, top productos | Worktree | ✅ bc89c09 |
| 7 | Reportes: PDF @react-pdf, Excel, filtros fecha | Worktree | ✅ 3c6f96d |
| 8 | API REST + Security + Vitest + Docker | CLI | ✅ acdcbce |
| fix | Scalar (reemplaza swagger-ui-react React 19) | CLI | ✅ a3296ec |
| 14 | Infra Pro: rate limiting Upstash + health + API docs | CLI | ✅ 80543c6 |
| 9 | Perfil usuario: avatar, datos, password strength, actividad | Worktree | ✅ 825d3e3 |
| 10 | Alertas stock bajo | Worktree | ✅ a22d15b |
| 11 | Descuentos en ventas | Worktree | ✅ 4b051e3 |
| 12 | Devoluciones | Worktree | ✅ 25c6aa7 |
| 13 | UX Pro: dark mode + animaciones globales | Worktree | ✅ 64fa064 |

---

## 🏗️ Infraestructura Docker

```yaml
pos-postgres: localhost:5432  # BD: pos_chile_db | user: pos_admin
pos-pgadmin:  localhost:5050  # admin@pos-chile.cl / pgadmin_secret_2025
```

**Usuarios disponibles:** admin@pos-chile.cl / admin123 (ADMIN) · cajero@pos-chile.cl / cajero123 (CAJERO)

---

## 👥 Agentes del proyecto

| Agente | Rol |
|--------|-----|
| Claude Cowork | Coordinador, verificador independiente, memoria |
| Claude Code CLI | Setup, infra, auth, API, deploy |
| Claude Code Worktree | CRUD, Ventas, POS, Dashboard, Reportes |
| Gemini | Por definir — candidatos: tests, security audit, docs API |
| Pierre | Copia instrucciones entre agentes |

> **Regla crítica:** No confiar ciegamente en reportes — siempre verificar leyendo archivos reales.
> **Memoria completa:** `memory/projects/pos-chile-monorepo.md` y `memory/context/stack-tech.md`

## Devlmer Ecosystem Engine v3.1

This project has been configured with the Devlmer Ecosystem Engine.
Skills, MCPs, agents and slash commands are available in `.claude/`.
Type `/` in Claude Code to see all available slash commands.
