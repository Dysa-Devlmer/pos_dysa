# DyPos CL — POS web + mobile para comercios chilenos

![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js)
![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)
![Status](https://img.shields.io/badge/demo%20interna-GO-22c55e)

DyPos CL es un sistema de punto de venta para negocios chilenos, con panel web,
app Android, inventario, caja, ventas, devoluciones, reportes, comprobantes
internos compartibles y operación offline-first en mobile.

Este repositorio es el monorepo principal del producto. La documentación de uso
vive en [`docs/product`](docs/product/README.md) y la documentación técnica en
[`docs/architecture`](docs/architecture/README.md).

## Estado Actual

| Área | Estado |
|---|---|
| Repo remoto | `https://github.com/Dysa-Devlmer/pos_dysa.git` |
| Branch principal | `main` |
| Último estado verificado | `main` sincronizado con `origin/main` |
| Demo interna | `dy-pos.zgamersa.com` — GO para Dyon Labs |
| Cliente pagante | NO-GO temporal hasta cerrar DR-06, DR-10 y smoke manual UI |
| Producción | No asumir que contiene el último commit hasta ejecutar `scripts/deploy.sh` |

> Nota operacional: el commit de seguridad RBAC 3D.4 está en `main`, pero no debe
> asumirse desplegado en producción hasta que Pierre/Codex autoricen deploy y se
> registre el smoke post-deploy.

## Qué Hace

- **Panel web** para ADMIN y CAJERO.
- **App Android** para operación en piso con cache local, cola offline e
  idempotencia de ventas.
- **Caja/POS** con apertura/cierre de turno, carrito, múltiples métodos de pago,
  IVA 19%, vuelto y comprobante interno.
- **Ventas** con stock transaccional, historial, detalle, edición/anulación bajo
  permisos.
- **Productos y categorías** con CRUD administrativo e importación CSV.
- **Clientes** con RUT chileno, historial y datos básicos.
- **Devoluciones** con reversión de stock y comprobante interno.
- **Reportes** con exportación PDF y Excel.
- **Comprobantes públicos** por link con PII enmascarada y `noindex`.
- **Contraseña temporal**: usuarios nuevos o reseteados deben cambiar contraseña
  desde web antes de operar normalmente.
- **Observabilidad** con Sentry web/mobile.
- **Runbooks operacionales** para deploy, smoke, backup/restore y go-live.

## Lo Que No Promete Todavía

- No emite e-boleta SII.
- No integra impresora térmica Bluetooth ni cajón de dinero.
- No incluye iOS.
- No tiene multi-sucursal productivo.
- No tiene backup off-site activo hasta cerrar DR-10.
- No debe venderse con SLA hasta cerrar DR-06.

## Roles Vigentes

El código actual mantiene roles base:

| Rol | Uso actual |
|---|---|
| `ADMIN` | Dueño/socio/encargado. Administra catálogo, categorías, devoluciones, usuarios y operación general. |
| `CAJERO` | Opera caja, ventas, clientes, alertas/reportes permitidos y perfil. No administra catálogo ni devoluciones. |
| `VENDEDOR` | Reservado para matriz RBAC futura; hoy se trata como no-admin para operaciones sensibles. |

El patch 3D.4 endureció server-side RBAC para productos, categorías y
devoluciones. El RBAC profesional completo está propuesto en
[`docs/adr/003-rbac-roles-permisos.md`](docs/adr/003-rbac-roles-permisos.md) y
queda para una fase posterior.

## Stack

| Capa | Tecnología |
|---|---|
| Monorepo | Turborepo + pnpm 10.6 |
| Web | Next.js 15 App Router, React 19, Tailwind CSS v4, shadcn/Radix |
| Mobile | Expo SDK 54, React Native 0.81, Expo Router, SQLite, Secure Store |
| API | Next.js Route Handlers + Server Actions |
| Auth | NextAuth v5 beta, JWT strategy |
| DB | PostgreSQL 16 + Prisma 6 |
| Reportes | `@react-pdf/renderer`, `exceljs` |
| Observability | Sentry web + Sentry React Native |
| Testing | Vitest web, Jest mobile |
| Infra | Docker Compose, deploy script con backup + health + smoke read-only |

## Estructura

```text
system_pos/
├── apps/
│   ├── web/                 # Next.js dashboard, API REST, public receipts
│   └── mobile/              # Expo Android app
├── packages/
│   ├── api-client/          # tipos/cliente compartido
│   ├── db/                  # Prisma schema, migrations, seed
│   ├── domain/              # lógica compartida web/mobile
│   ├── ui/                  # UI compartida
│   └── typescript-config/
├── docs/
│   ├── product/             # manuales para dueño/cajero
│   ├── architecture/        # diseño técnico vivo
│   ├── operations/          # deploy, smoke, go-live, backup/restore
│   └── adr/                 # decisiones arquitectónicas
├── memory/                  # segundo cerebro del proyecto
├── scripts/                 # deploy, smoke, backup/prechecks
├── CLAUDE.md                # regla canónica para agentes
├── AGENTS.md                # entrada para Codex/OpenAI agents
└── README.md
```

## Inicio Local

### Requisitos

- Node.js 22+
- pnpm 10.6+
- Docker Desktop u OrbStack
- PostgreSQL 16 vía `docker compose`

### Setup

```bash
git clone https://github.com/Dysa-Devlmer/pos_dysa.git system_pos
cd system_pos
pnpm install

docker compose up -d pos-postgres pos-pgadmin
cp apps/web/.env.example apps/web/.env.local

pnpm --filter @repo/db db:generate
pnpm --filter @repo/db db:migrate
pnpm --filter @repo/db db:seed

pnpm dev
```

Web local:

- `http://localhost:3000`
- Admin seed: `admin@pos-chile.cl / admin123`
- Cajero seed: `cajero@pos-chile.cl / cajero123`

Mobile local:

```bash
pnpm --filter @repo/mobile start
```

## Verificación

Gates usados antes de considerar una fase lista:

```bash
pnpm --filter web type-check
pnpm --filter web lint
pnpm --filter web test
pnpm --filter web build

pnpm --filter @repo/mobile type-check
pnpm --filter @repo/mobile lint
pnpm --filter @repo/mobile exec jest --watchman=false
```

Últimos conteos reportados en memoria:

- Web: `279/279` tests.
- Mobile: `74/74` tests.

Para release readiness no basta con tests verdes. También se exige smoke browser
real y evidencia en `memory/episodes/`.

## Deploy

No usar comandos Docker sueltos para producción salvo emergencia documentada.
El flujo oficial es:

```bash
./scripts/deploy.sh
```

El script ejecuta backup local, deploy, health check y smoke read-only. Si solo
querés verificar producción sin tocar nada:

```bash
./scripts/smoke-prod.sh https://dy-pos.zgamersa.com
```

Runbooks:

- [`docs/operations/runbook-smoke-prod.md`](docs/operations/runbook-smoke-prod.md)
- [`docs/operations/runbook-backup-restore.md`](docs/operations/runbook-backup-restore.md)
- [`docs/operations/tenant-go-live-checklist.md`](docs/operations/tenant-go-live-checklist.md)
- [`docs/operations/tenant-go-live-dyonlabs-demo.md`](docs/operations/tenant-go-live-dyonlabs-demo.md)

## Documentación Principal

| Audiencia | Documento |
|---|---|
| Dueño/cajero | [`docs/product/README.md`](docs/product/README.md) |
| Manual web | [`docs/product/manual-web.md`](docs/product/manual-web.md) |
| Manual mobile | [`docs/product/manual-mobile.md`](docs/product/manual-mobile.md) |
| Onboarding cliente | [`docs/product/onboarding-cliente.md`](docs/product/onboarding-cliente.md) |
| Arquitectura | [`docs/architecture/README.md`](docs/architecture/README.md) |
| Backend/API | [`docs/architecture/backend.md`](docs/architecture/backend.md) |
| Mobile | [`docs/architecture/mobile.md`](docs/architecture/mobile.md) |
| Deploy/ops | [`docs/architecture/deploy-ops.md`](docs/architecture/deploy-ops.md) |
| Estado vivo | [`memory/projects/pos-chile-monorepo.md`](memory/projects/pos-chile-monorepo.md) |

## Reglas Para Agentes

Antes de tocar código:

1. Leer [`CLAUDE.md`](CLAUDE.md).
2. Leer [`memory/projects/pos-chile-monorepo.md`](memory/projects/pos-chile-monorepo.md).
3. Leer [`memory/context/stack-tech.md`](memory/context/stack-tech.md).
4. Empezar cada brief/reporte con:

```bash
git fetch
git log origin/main..HEAD --oneline
git status -sb
```

No confiar en reportes de texto: verificar contra código, tests, DB, browser o
producción read-only según corresponda.

## Seguridad y Privacidad

- Contraseñas con bcrypt.
- Rate-limit en auth/API cuando Upstash está configurado.
- PII sanitizada en Sentry.
- Comprobantes públicos con nombre/RUT enmascarado.
- Server Actions sensibles protegidas server-side, no solo por UI.
- AuditLog para acciones relevantes.
- `keystore.properties`, `.env` y secretos están ignorados por git.

## Licencia

Proyecto privado de Dyon Labs / Dysa. No distribuir sin autorización.
