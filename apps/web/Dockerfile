FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.6.0 --activate
WORKDIR /app

# ─── Dependencies ────────────────────────────────────────────
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY packages/db/package.json packages/db/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile

# ─── Builder ─────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages ./packages
COPY . .

# Generate Prisma client
RUN pnpm --filter @repo/db db:generate

# Build Next.js (standalone)
# POS_DATABASE_URL dummy durante build — Prisma necesita la var para generar
# el cliente, no para conectarse. La conexión real ocurre en runtime.
ENV NEXT_TELEMETRY_DISABLED=1
ARG POS_DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV POS_DATABASE_URL=${POS_DATABASE_URL}
RUN pnpm --filter @repo/web build

# ─── Runner ──────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# M9m 2026-04-28 — HEALTHCHECK directive a nivel imagen, complemento al
# healthcheck de docker-compose.yml. Sirve cuando alguien corre la imagen
# directo con `docker run` (sin compose) — en ese contexto compose no
# inyecta su healthcheck y queda sin probe. Usa wget porque alpine no
# trae curl (gotcha repetido en compose). 127.0.0.1 explícito porque
# alpine resuelve "localhost" como ::1 IPv6 y Next.js escucha solo
# IPv4 0.0.0.0 → "Connection refused" silencioso.
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "apps/web/server.js"]
