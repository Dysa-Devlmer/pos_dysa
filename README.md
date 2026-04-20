# POS Chile — Sistema de Punto de Venta

![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss)
![Tests](https://img.shields.io/badge/tests-57%2F57-22c55e)

Sistema de punto de venta profesional para negocios chilenos. Gestiona inventario, ventas, caja, clientes, reportes, devoluciones y descuentos con soporte para IVA 19%, RUT, boletas y múltiples métodos de pago.

## Características

1. **POS Caja** — carrito en tiempo real, IVA automático, múltiples métodos de pago, boleta generada con `nanoid` (`B-YYYYMMDD-XXXXXXXX`).
2. **Gestión de ventas** — crear, editar, eliminar con transacciones atómicas (`$transaction`) que mantienen stock y contadores consistentes.
3. **Inventario** — productos con stock, categorías, alertas de stock bajo (badge sidebar + banner dashboard + panel dedicado).
4. **Clientes** — CRUD con RUT validado (módulo 11), historial de compras, contador `ultimaCompra` recalculado al eliminar ventas.
5. **Dashboard** — KPIs en CLP, gráficos Recharts (ventas 7 días), top productos, últimas ventas, comparativa mes vs anterior.
6. **Reportes** — exportación PDF (`@react-pdf/renderer`) y Excel (`exceljs`) con filtros por rango de fechas.
7. **Autenticación y RBAC** — NextAuth v5 con roles ADMIN/CAJERO/VENDEDOR, middleware edge-compatible.
8. **Descuentos y devoluciones** — por porcentaje o monto fijo; devoluciones parciales/totales con reversión de stock y lock pesimista (`FOR UPDATE NOWAIT`).
9. **Perfil de usuario** — avatar (sharp → 200×200 JPEG base64), cambio de password con strength meter, actividad reciente.
10. **Observability + dark mode** — Sentry para events de auth, rate-limiting con Upstash, dark mode con `next-themes`, animaciones con framer-motion.

## Stack técnico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Runtime | Node.js | 22.x (alpine en Docker) |
| Package manager | pnpm | 10.6.0 |
| Monorepo | Turborepo | 2.5.x (usa `"tasks"`, no `"pipeline"`) |
| Framework | Next.js | 15.3 — App Router + Turbopack |
| CSS | Tailwind CSS | v4.2 — CSS-native (sin `tailwind.config.js`) |
| Componentes | shadcn/ui | new-york style + Radix UI |
| ORM | Prisma | 6.19 |
| BD | PostgreSQL | 16-alpine |
| Auth | NextAuth | v5.0.0-beta.31 (JWT strategy) |
| Lenguaje | TypeScript | 5.8 strict |
| Testing | Vitest | 4.1 — **57/57 tests** |
| Observability | Sentry | 10.49 |
| Rate limiting | Upstash Redis | 1.37 + ratelimit 2.0 |
| Infra | Docker Compose | v2 (sin `version:` key) |

## Inicio rápido

### Prerequisitos

- Node.js 22+
- pnpm 10.6+
- Docker Desktop / Orbstack
- PostgreSQL 16 (o usar el contenedor incluido)

### Instalación

```bash
# 1. Clonar e instalar
git clone <repo-url> system_pos && cd system_pos
pnpm install

# 2. Levantar BD + pgAdmin
docker compose up -d pos-postgres pos-pgadmin

# 3. Configurar env vars (crear apps/web/.env.local)
cp apps/web/.env.example apps/web/.env.local
# Edita POS_DATABASE_URL y NEXTAUTH_SECRET

# 4. Aplicar schema + seed
pnpm db:push
pnpm db:seed

# 5. Arrancar dev server
pnpm dev
# → http://localhost:3000
# → Login: admin@pos-chile.cl / admin123  (ADMIN)
#          cajero@pos-chile.cl / cajero123 (CAJERO)
```

### Deploy producción (Docker)

```bash
docker compose up -d --build
pnpm health   # verifica que la app responde
```

## Arquitectura

```
system_pos/
├── apps/
│   └── web/                         ← Next.js 15 App Router (puerto 3000)
│       ├── app/
│       │   ├── (dashboard)/         ← rutas protegidas
│       │   │   ├── caja/            ← POS real-time
│       │   │   ├── ventas/          ← CRUD con $transaction
│       │   │   ├── productos/       ← CRUD + stock
│       │   │   ├── clientes/        ← CRUD + RUT
│       │   │   ├── categorias/
│       │   │   ├── usuarios/        ← solo ADMIN
│       │   │   ├── alertas/         ← stock bajo
│       │   │   ├── devoluciones/    ← parciales/totales
│       │   │   ├── reportes/        ← PDF + Excel
│       │   │   └── perfil/
│       │   ├── login/
│       │   ├── api/
│       │   │   ├── auth/            ← NextAuth handlers
│       │   │   ├── health/          ← liveness probe
│       │   │   └── v1/              ← REST API
│       │   ├── manifest.ts          ← PWA manifest
│       │   └── layout.tsx           ← root + metadata
│       ├── auth.ts                  ← NextAuth Node
│       ├── auth.config.ts           ← NextAuth edge-safe
│       ├── auth-types.d.ts
│       └── middleware.ts            ← RBAC edge
├── packages/
│   ├── db/                          ← @repo/db — Prisma client + schema
│   ├── ui/                          ← @repo/ui — componentes compartidos
│   └── typescript-config/           ← configs TS base
├── memory/                          ← segundo cerebro del proyecto
│   ├── projects/pos-chile-monorepo.md
│   └── context/                     ← auth-patterns, security-owasp,
│                                       business-logic, infra-docker,
│                                       stack-tech, agents-workflow
├── docker-compose.yml               ← pos-postgres + pos-pgadmin + pos-web
├── turbo.json                       ← monorepo tasks
├── CLAUDE.md                        ← reglas absolutas del proyecto
└── README.md
```

## Agentes de desarrollo

El proyecto se construyó con un sistema multi-agente:

- **Claude Cowork** — coordinador, memoria, verificación independiente.
- **Claude Code CLI** — setup, infra, auth, API, deploy, hotfixes.
- **Claude Code Worktree** — features grandes en worktree aislado (CRUD, POS, Ventas, Dashboard, Reportes, Perfil, Alertas, Descuentos, Devoluciones, UX Pro).
- **Gemini** — security audits, tests, code review (5 audits ejecutados: OWASP, G1-G5, GAP-1/2, GAP-PROD-1/2, UX).
- **Pierre** — operador humano que enlaza los agentes.

Detalle completo del protocolo en `memory/context/agents-workflow.md`.

## Variables de entorno

| Variable | Obligatoria | Descripción | Ejemplo |
|----------|-------------|-------------|---------|
| `POS_DATABASE_URL` | Sí | Conexión PostgreSQL (no uses `DATABASE_URL` — colisiona con shell env) | `postgresql://pos_admin:pos_secret_2025@localhost:5432/pos_chile_db` |
| `NEXTAUTH_SECRET` | Sí (prod) | Secret para firmar JWT. Mínimo 32 chars, validado por `checkEnv` | `$(openssl rand -base64 32)` |
| `NEXTAUTH_URL` | Sí | URL pública de la app. **HTTPS en prod** o cookies `__Secure-` rompen | `https://pos.ejemplo.cl` |
| `NEXT_PUBLIC_URL` | No | URL base para `metadataBase` (OpenGraph) | `https://pos.ejemplo.cl` |
| `UPSTASH_REDIS_REST_URL` | Recomendada | Rate-limit distribuido. Sin esto: warning en logs de prod | `https://xxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Si hay URL | Token de Upstash | `AaA...` |
| `SENTRY_DSN` | Recomendada | Observability. No-op si falta | `https://xxx@sentry.io/xxx` |
| `TZ` / `PGTZ` | Sí en Docker | Zona horaria | `America/Santiago` |

## Scripts disponibles

```bash
# Desarrollo
pnpm dev              # Turbopack en localhost:3000
pnpm build            # Build producción
pnpm typecheck        # TypeScript sin errores (alias de type-check)
pnpm test             # Vitest — 57/57 tests
pnpm health           # curl health endpoint + jq
pnpm lint             # ESLint

# Base de datos
pnpm db:push          # sync schema → BD (dev)
pnpm db:migrate       # crear/aplicar migraciones (prod)
pnpm db:studio        # Prisma Studio
pnpm db:seed          # cargar usuarios + data demo
pnpm db:generate      # regenerar Prisma client

# Docker
docker compose up -d              # levantar BD + pgAdmin
docker compose up -d --build      # prod stack completo
docker compose ps                 # estado (buscar "healthy")
```

## Seguridad

El proyecto pasó 5 auditorías de seguridad, todas con fixes aplicados.

- **OWASP Top 10**: 5 security headers (`X-Frame-Options: DENY`, `HSTS` 2 años, `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options`).
- **Autenticación**: bcrypt cost 12, JWT con `NEXTAUTH_SECRET` 32+ chars (validado por `checkEnv`, rechaza placeholders como `"cambiar"`, `"demo_secret"`, etc.).
- **Rate limiting**: Upstash Redis — 5 intentos login / 15 min, 100 req/min por IP en API REST. Warning visible en prod si Upstash no está configurado.
- **RBAC**: middleware edge con `authorized` callback + `session` callback compartido entre runtimes Node y edge (fix commit `81933a5`).
- **Observability**: Sentry captura `login_failure`, `login_rate_limited`, errores no manejados.
- **Race conditions**: devoluciones usan `SELECT ... FOR UPDATE NOWAIT` como primera operación del `$transaction`.
- **Input validation**: Zod en todos los server actions; Prisma parametriza automáticamente (`$queryRaw` con template literals seguros).
- **Supply chain**: migración `xlsx` → `exceljs` por CVEs Prototype Pollution; `@scalar/nextjs-api-reference` en vez de `swagger-ui-react` por React 19 peer dep.
- **File uploads**: avatar con Content-Length pre-check (rechazo 413 antes de leer body) + `sharp` 200×200 JPEG + base64 en DB (sin filesystem externo).

Detalle completo en `memory/context/security-owasp.md`.

## Testing

```bash
pnpm test
# 57/57 tests passing
#   utils.test.ts         → 20 tests (validarRUT, formatRUT, calcularIVA, formatCLP)
#   reportes-fecha.test.ts → 18 tests (rangos fecha, TZ Chile)
#   calcular-desglose.test.ts → 9 tests (descuentos)
#   check-env.test.ts     → 10 tests (placeholders, longitud, NEXT_PHASE)
```

## Licencia y contribuciones

Proyecto privado. Para colaborar: leer `CLAUDE.md` (reglas absolutas) y `memory/` (segundo cerebro) antes de cualquier PR.

---

**Stack en una línea**: Next.js 15 + Tailwind v4 + Prisma 6 + PostgreSQL 16 + NextAuth v5 + Vitest 4 + Docker v2, todo en monorepo Turborepo 2.5 con pnpm 10.6.
