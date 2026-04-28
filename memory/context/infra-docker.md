---
title: Infra & Docker — Compose, Dockerfile Multi-Stage, Puertos, Pitfalls
tags:
  - infra
  - docker
  - deploy
  - postgres
  - contexto
aliases:
  - Docker Setup
  - Infra Deploy
---

# Infra & Docker — Compose, Dockerfile Multi-Stage, Puertos, Pitfalls

Infraestructura local y de producción para [[pos-chile-monorepo]]. Cubre docker-compose, Dockerfile del app, puertos, volúmenes y gotchas específicas.

Relacionado: [[pos-chile-monorepo]] · [[stack-tech]] · [[security-owasp]] · [[auth-patterns]]

## docker-compose.yml — 3 servicios

> [!warning] Sin `version:` key
> Docker Compose v2 deprecó `version: "3.8"`. El archivo arranca con `services:` directo. Si incluyes `version:`, Compose emite warning y algunos hooks CI fallan.

```yaml
services:
  pos-postgres:
    image: postgres:16-alpine
    container_name: pos-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: pos_chile_db
      POSTGRES_USER: pos_admin
      POSTGRES_PASSWORD: pos_secret_2025
      TZ: America/Santiago
      PGTZ: America/Santiago
    ports:
      - "5432:5432"
    volumes:
      - pos_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "pos_admin", "-d", "pos_chile_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  pos-pgadmin:
    image: dpage/pgadmin4:latest
    container_name: pos-pgadmin
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@pos-chile.cl
      PGADMIN_DEFAULT_PASSWORD: pgadmin_secret_2025
      PGADMIN_CONFIG_SERVER_MODE: "False"
    ports:
      - "5050:80"
    depends_on:
      pos-postgres:
        condition: service_healthy

  pos-web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    container_name: pos-web
    restart: unless-stopped
    environment:
      NODE_ENV: production
      POS_DATABASE_URL: postgresql://pos_admin:pos_secret_2025@pos-postgres:5432/pos_chile_db
      NEXTAUTH_URL: http://localhost:3000
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      TZ: America/Santiago
    ports:
      - "3000:3000"
    depends_on:
      pos-postgres:
        condition: service_healthy

volumes:
  pos_postgres_data:
```

## Puertos en uso

| Puerto | Servicio | URL |
|--------|----------|-----|
| 3000 | Next.js app | http://localhost:3000 |
| 5050 | pgAdmin | http://localhost:5050 |
| 5432 | PostgreSQL | `postgres://pos_admin:pos_secret_2025@localhost:5432/pos_chile_db` |

## Dockerfile multi-stage — `apps/web/Dockerfile`

> [!info] 3 stages: `deps` → `builder` → `runner`
> Imagen final ≈ 250 MB (Node 22 alpine + Next.js standalone + public/ + .next/static + Prisma client). Sin multi-stage serían ~1.5 GB.

```dockerfile
# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@10.6.0

# ─── Stage 1: deps ───
FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
COPY packages/ui/package.json ./packages/ui/
COPY packages/typescript-config/package.json ./packages/typescript-config/
RUN pnpm install --frozen-lockfile

# ─── Stage 2: builder ───
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages ./packages
COPY . .
WORKDIR /app/packages/db
RUN pnpm prisma generate
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build --filter=web

# ─── Stage 3: runner ───
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV TZ=America/Santiago

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/packages/db/node_modules/.prisma ./packages/db/node_modules/.prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0"
CMD ["node", "apps/web/server.js"]
```

### Requisitos del Dockerfile

- `next.config.ts` debe tener `output: "standalone"` para el layout de `server.js` + `.next/standalone/`
- `serverExternalPackages: ["@prisma/client", "sharp"]` — ambos son binarios nativos, no los empaqueta Webpack
- `pnpm.onlyBuiltDependencies` en root package.json incluye `@prisma/client`, `@tailwindcss/oxide`, `sharp`, `@prisma/engines`

## Variables de entorno — dónde va cada una

| Archivo | Uso | Ejemplo DATABASE_URL |
|---------|-----|---------------------|
| `apps/web/.env.local` | Desarrollo local | `postgresql://pos_admin:...@localhost:5432/pos_chile_db` |
| `.env.docker` | Usado dentro de containers | `postgresql://pos_admin:...@pos-postgres:5432/pos_chile_db` |
| `.env.example` | Template commiteado al repo | Valores placeholder |
| `packages/db/.env` | Prisma CLI vía dotenv-cli | Copia de `.env.local` o `.env.docker` según contexto |

> [!danger] `apps/web/.env.local` NO en la raíz
> El archivo **debe** estar en `apps/web/.env.local`. Si lo pones en la raíz del monorepo, Next.js no lo lee. Error común: Pierre crea `.env.local` en `system_pos/` y pasa 20 min debuggeando por qué `POS_DATABASE_URL` es undefined.

> [!warning] POS_DATABASE_URL, no DATABASE_URL
> Pierre tiene `DATABASE_URL=<url de Supabase>` en su shell. Si usamos `DATABASE_URL` en el código, los scripts locales apuntan a Supabase inadvertidamente. Por eso el `PrismaClient` lee `POS_DATABASE_URL` exclusivamente, y los scripts Prisma usan `dotenv -e .env -o -- prisma ...` con `-o` (override shell env).

## Variables críticas en producción

| Variable | Obligatoria | Validada por | Nota |
|----------|-------------|--------------|------|
| `POS_DATABASE_URL` | Sí | `packages/db/src/client.ts` throw si falta | — |
| `NEXTAUTH_SECRET` | Sí | `apps/web/lib/check-env.ts` | 32+ chars + sin placeholders |
| `NEXTAUTH_URL` | Sí | NextAuth | HTTPS en prod o cookies `__Secure-` rompen |
| `UPSTASH_REDIS_REST_URL` | Recomendada | `warnIfDisabledInProd` | Sin esto, rate-limit skippeado + warning en logs |
| `UPSTASH_REDIS_REST_TOKEN` | Si hay URL | Pareja con URL | — |
| `SENTRY_DSN` | Recomendada | `enabled: !!SENTRY_DSN` | No-op si falta |
| `TZ` + `PGTZ` | Sí | Docker env | `America/Santiago` |

Ver [[security-owasp#Audit 4 — GAP-PROD-1]] para detalle del `checkEnv`.

## Health endpoint

`apps/web/app/api/health/route.ts` (Fase 14):

```ts
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", db: "connected" });
  } catch (err) {
    return Response.json({ status: "error", db: "disconnected" }, { status: 503 });
  }
}
```

Usado por:
- Docker healthcheck del servicio `pos-web` (si se agrega al compose)
- Monitoreo externo (UptimeRobot, BetterStack, etc.)

## Comandos de infra

```bash
# Arrancar BD + pgAdmin (dev)
docker compose up -d pos-postgres pos-pgadmin

# Ver estado
docker compose ps
# Esperar "healthy" en pos-postgres antes de correr migraciones

# Seed inicial
pnpm db:push     # aplica schema sin migración
pnpm db:seed     # crea admin + cajero

# Full prod stack
docker compose up -d --build

# Logs
docker compose logs -f pos-web

# Bajar todo (preserva volumen)
docker compose down

# Bajar TODO incluyendo data — CUIDADO
docker compose down -v
```

## Gotchas — Docker

> [!danger] Rebuild cache stale con imagen PHP vieja
> En la migración del stack PHP → Next.js, la imagen cacheada del compose anterior quedó como "system_pos-web". Cuando reconstruíamos, Compose usaba la imagen PHP vieja y ignoraba el Dockerfile nuevo. Fix: `docker compose down && docker image rm system_pos-web && docker compose up --build`. Documentado en commit `6e93c56`.

> [!warning] `rm -r` no `rm -rf`
> Claude Code CLI tiene protección hardcoded contra `rm -rf`. Usar `rm -r` (sin `-f`). Si protesta un archivo con permisos de solo lectura, investigar en vez de forzar — probablemente es un volumen Docker montado.

> [!info] Non-root user
> El container `pos-web` corre como UID 1001 (`nextjs` user). Esto impide escritura a `/app/` excepto los paths explícitamente `--chown`eados. Si añades feature que escribe archivos (logs, uploads), o los mandas a stdout, o usas un volumen, o cambias a S3/R2. El avatar se guarda base64 en DB justamente para evitar este problema (ver [[auth-patterns]] y gotcha 13 en `CLAUDE.md`).

> [!warning] pgAdmin server mode False
> `PGADMIN_CONFIG_SERVER_MODE: "False"` permite un solo usuario sin DB de metadata persistente. Ideal para dev local. En prod: usar `True` + volumen para `/var/lib/pgadmin/`.

## Prisma + Docker — flujo migraciones

```bash
# Desarrollo local (apunta a localhost:5432)
pnpm db:migrate dev --name nombre_migracion

# Deploy migraciones en prod — vive en scripts/deploy.sh (commit d823990)
./scripts/deploy.sh
# → fase 5b/6: tar + scp + container ad-hoc node:22-alpine que corre
#   `npx prisma@6.x migrate deploy` unido a pos-chile-network
#   (resuelve pos-postgres:5432 por DNS interno).
```

> [!danger] Nunca `db:push` en producción
> `prisma db:push` es para dev — aplica schema sin crear archivo de migración. En prod siempre `migrate deploy` para historial y rollback. `db:push` ignora migraciones pendientes → estado divergente.

> [!warning] Dockerfile NO copia `packages/db/prisma/`
> El multi-stage builder solo copia el cliente Prisma generado al final stage para reducir tamaño (gotcha 96). Consecuencia: **NO se puede correr `prisma migrate deploy` desde el container `pos-web`** — falta `schema.prisma` y la carpeta `migrations/`. La fase 5b/6 de `deploy.sh` resuelve esto empaquetando localmente y corriendo `migrate deploy` en un container `node:22-alpine` ad-hoc.

> [!info] Migraciones manuales DEBEN ser idempotentes
> Las migraciones escritas a mano (no generadas por `prisma migrate dev`) deben usar `CREATE TABLE IF NOT EXISTS`, `ALTER TYPE ... ADD VALUE IF NOT EXISTS`, `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` para FKs, `CREATE INDEX IF NOT EXISTS`. Razón (gotcha 91): la dev DB suele tener drift por `db:push` durante experimentación; sin idempotencia falla el primer `migrate deploy` post-baseline. Pattern aplicado en `20260426*_*/migration.sql` (F-3 + F-9).

## Arquitectura de red (local)

```
┌──────────────────────────────────────────────┐
│             host (macOS Darwin 25)           │
│                                              │
│  localhost:3000 ──► pos-web (Docker)         │
│  localhost:5432 ──► pos-postgres (Docker)    │
│  localhost:5050 ──► pos-pgadmin (Docker)     │
│                                              │
│  ┌──────── Docker network: default ────────┐ │
│  │                                         │ │
│  │  pos-web ─────► pos-postgres:5432       │ │
│  │  pos-pgadmin ─► pos-postgres:5432       │ │
│  │                                         │ │
│  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

Desde host: `pos_chile_db` en `localhost:5432`.  
Desde container: `pos_chile_db` en `pos-postgres:5432` (DNS del Compose network).

## Checklist pre-deploy Docker

- [ ] `next.config.ts` tiene `output: "standalone"`
- [ ] `packages/db/prisma/schema.prisma` incluye `binaryTargets` apropiados (alpine → `linux-musl-openssl-3.0.x`)
- [ ] `NEXTAUTH_SECRET` inyectado vía env (no hardcoded, no commiteado)
- [ ] `pnpm build` local pasa antes de `docker compose build`
- [ ] `docker compose run pos-postgres pg_isready` → healthy
- [ ] `curl http://localhost:3000/api/health` → `{"status":"ok"}`
- [ ] Test login con seed `admin@pos-chile.cl / admin123`
- [ ] Headers HTTP validados con `curl -I` (ver [[security-owasp]])

## Seeds disponibles

```bash
pnpm db:seed
# Crea:
#   admin@pos-chile.cl / admin123  (ADMIN)
#   cajero@pos-chile.cl / cajero123 (CAJERO)
#   5 categorías demo
#   ~20 productos demo
#   2-3 clientes demo
```

## Backups Postgres en prod (GAP-03 cerrado 2026-04-22)

**Schedule**: `/etc/cron.daily/pos-backup` en VPS — corre automáticamente a las **06:25 UTC** (≈ 03:25 Chile local) vía fallback en `/etc/crontab`:

```
25 6 * * * root test -x /usr/sbin/anacron || { cd / && run-parts --report /etc/cron.daily; }
```

Ubuntu 24.04 **no instala anacron por default**, así que el `test -x /usr/sbin/anacron` falla y dispara `run-parts /etc/cron.daily`, que ejecuta todos los scripts ejecutables del directorio (incluyendo `pos-backup`).

**Script** (`/etc/cron.daily/pos-backup`):

```bash
#!/bin/bash
set -euo pipefail
docker exec pos-postgres pg_dump -U pos_admin pos_chile_db \
  | gzip > /root/backups/pos-$(date +%Y%m%d).sql.gz
find /root/backups -name "*.sql.gz" -mtime +30 -delete
```

**Características**:
- **Formato**: `pos-YYYYMMDD.sql.gz` (14-20 KB actual, crece con el uso)
- **Retention**: 30 días (`find -mtime +30 -delete`)
- **Storage**: `/root/backups/`
- **Restore manual**: `gunzip -c /root/backups/pos-20260422.sql.gz | docker exec -i pos-postgres psql -U pos_admin pos_chile_db`

**Validación del backup**:
```bash
gunzip -t /root/backups/pos-$(date +%Y%m%d).sql.gz && echo "✅ OK"
zcat /root/backups/pos-$(date +%Y%m%d).sql.gz | grep -c "^CREATE TABLE"  # Debe ser 12+
```

> [!warning] Limitaciones actuales
> - Backups residen en el mismo disco del VPS → si se pierde el disco, se pierden los backups. Para prod seria: rsync a S3/R2/Backblaze semanal (TODO futuro)
> - No hay alerta si `pg_dump` falla → considerar wrapear en script que mande email o Sentry si exit != 0 (TODO futuro)

Archivo: `packages/db/prisma/seed.ts`. Idempotente (usa `upsert`).
