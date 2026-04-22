---
title: Roadmap — Gaps Post-Producción
tags:
  - roadmap
  - gaps
  - audit
  - post-deploy
aliases:
  - Gap Analysis 2026-04-21
  - Post-Prod Roadmap
---

# Roadmap — Gaps Post-Producción

**Snapshot de auditoría**: 2026-04-21 tras deploy a [[pos-chile-monorepo]] en prod (https://dy-pos.zgamersa.com).

Resultado de ejecutar 8 skills como lens sobre el estado actual:
`/senior-backend` · `/senior-security` · `/payment-validation` · `/inventory-management` · `/docker-deploy` · `/code-reviewer` · `/seo-optimizer` · `/session-end`

Relacionado: [[pos-chile-monorepo]] · [[security-owasp]] · [[infra-docker]] · [[agents-workflow]]

> [!info] Cómo usar este roadmap
> Este archivo es el **inventario de mejoras conocidas**, NO prompts listos para ejecutar. Para trabajar un ítem:
> 1. Cowork lee este archivo + contexto relevante (auth-patterns, infra-docker, etc.)
> 2. Cowork redacta un prompt estructurado con `AGENTE: <tipo>` + `## Verificación` por ítem individual
> 3. Pierre copia el prompt al agente destinatario
> 4. Al terminar, Cowork verifica independientemente + actualiza este roadmap tachando el ítem

## Clasificación

- 🔴 **Alto impacto / bajo esfuerzo** → cerrar YA (<30 min)
- 🟡 **Alto impacto / esfuerzo medio** → planificar próximas sesiones (1-3 h)
- 🟢 **Nice to have** → roadmap >4 semanas

---

## 🔴 Quick wins (< 30 min, alto valor)

### ~~GAP-01~~ · ✅ Activar `SENTRY_DSN` en prod — cerrado 2026-04-22 (commit `3f3b162`)

Proyecto Sentry creado vía MCP: **dy-company/pos-chile-prod** (ID `4511266051784704`).
DSN agregada a `.env.docker` (gitignored) + propagada via `docker-compose.yml` con `SENTRY_DSN: ${SENTRY_DSN:-}`.
Verificación end-to-end: 2 eventos de prueba (`login_failure` + `login_rate_limited`) enviados via HTTP API raw de Sentry desde el VPS → aparecieron como issues `POS-CHILE-PROD-1` y `POS-CHILE-PROD-2` en dashboard. **Bonus**: detectados 6 `login_failure` reales preexistentes (bots scanning).

---

#### Brief original (histórico)

- **Estado**: Sentry instrumentado (gotchas GAP-2, login_failure + login_rate_limited) pero env var `SENTRY_DSN` vacía en `.env.docker` → `enabled: false` → eventos se descartan silenciosamente
- **Agente recomendado**: Pierre (manual — crear proyecto en sentry.io) + CLI (agregar a `.env.docker` VPS + restart container)
- **Acciones**:
  1. Crear proyecto "pos-chile-prod" en sentry.io
  2. Copiar DSN → `SENTRY_DSN=https://xxx@...sentry.io/xxx` en `.env.docker` del VPS (`/opt/pos-chile/.env.docker`)
  3. `docker compose --env-file .env.docker up -d --force-recreate pos-web` en VPS
- **Criterio de completitud**: hacer 6 logins fallidos consecutivos en prod → evento `login_rate_limited` visible en Sentry dashboard en < 1 min
- **Bloquea**: observability pobre dificulta debugging de incidentes

### ~~GAP-02~~ · ✅ Healthcheck en container `pos-web` — cerrado 2026-04-22 (commits `c0f4687` + `49a91a2`)

Healthcheck agregado con `wget -q -O /dev/null http://127.0.0.1:3000/api/health` (interval 30s, timeout 10s, retries 3, start_period 40s). Post-deploy: `docker ps` muestra `pos-web: Up (healthy)` tras 50s.

**Descubrimientos durante la verificación** → gotchas 83 y 84 en [[pos-chile-monorepo#Gotchas]]:
- Alpine resuelve `localhost` a IPv6, Next.js escucha solo IPv4 → usar `127.0.0.1` explícito
- Alpine minimal no trae `curl`, `wget` BusyBox sí (flags distintos a curl)

---

#### Brief original (histórico)

- **Estado**: `docker-compose.yml` tiene healthcheck en `pos-postgres` (`pg_isready`) pero NO en `pos-web`. Si Next.js cuelga internamente, `docker ps` sigue marcando el container como "Up" aunque no responda
- **Agente recomendado**: CLI
- **Acciones**: agregar en `docker-compose.yml`:
  ```yaml
  pos-web:
    ...
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
  ```
- **Criterio**: post-deploy `docker ps --filter name=pos-web` muestra `(healthy)` en la columna Status
- **Cuidado**: `wget` existe en alpine; si no hay curl/wget ver si `node -e` funciona

### ~~GAP-03~~ · ✅ Backup automático Postgres — cerrado 2026-04-22

Solo config en VPS, sin commit de código. Ver [[infra-docker#Backups Postgres en prod]] para detalles completos.

**Resumen**:
- Script: `/etc/cron.daily/pos-backup` ejecuta `pg_dump | gzip > /root/backups/pos-YYYYMMDD.sql.gz`
- Schedule: 06:25 UTC diario vía fallback de `/etc/crontab` (Ubuntu 24.04 sin anacron)
- Retention: 30 días (find -mtime +30 -delete)
- Verificado: primer backup (14 KB) íntegro, 12 `CREATE TABLE`, 6 bloques `COPY` con data

---

#### Brief original (histórico)

- **Estado**: Zero backup automatizado. Si el disco del VPS falla, se pierde toda la data de ventas
- **Agente recomendado**: CLI
- **Acciones**:
  1. Crear `/opt/pos-chile/scripts/backup-db.sh` que ejecuta `pg_dump` dentro del container `pos-postgres`, comprime a `.sql.gz`, escribe a `/opt/backups/pos-chile/YYYY-MM-DD.sql.gz`
  2. Rotación: conservar últimos 7 días (`find /opt/backups/pos-chile -mtime +7 -delete`)
  3. Cron en VPS: `0 3 * * * /opt/pos-chile/scripts/backup-db.sh >> /var/log/pos-backup.log 2>&1` (3 AM local = 6 AM UTC, hora de bajo tráfico)
- **Criterio**: tras 24h ver archivo `2026-04-22.sql.gz` en `/opt/backups/pos-chile/`
- **Bonus**: mencionar en [[infra-docker]] como pattern canónico

### GAP-04 · `npm audit` / `trivy` en pre-deploy

- **Estado**: sin scan de vulnerabilidades en dependencies. Último audit de supply chain fue xlsx → exceljs (commit `04d32f7`) pero reactivo, no programático
- **Agente recomendado**: CLI
- **Acciones**: agregar al pre-flight de `scripts/deploy.sh`:
  ```bash
  pnpm --filter web audit --audit-level=high || die "pnpm audit detectó vulnerabilidades HIGH/CRITICAL"
  ```
- **Criterio**: `./scripts/deploy.sh` aborta si hay CVEs HIGH/CRITICAL sin parchear

---

## 🟡 Esfuerzo medio (1-3 h, planificar sesión)

### GAP-05 · GitHub Actions CI/CD

- **Estado**: Zero CI activo. Merge a `main` → deploy manual con `./scripts/deploy.sh`. Tests se corren manualmente
- **Agente recomendado**: Worktree (archivo nuevo + config)
- **Acciones**:
  1. `.github/workflows/ci.yml`: on PR → type-check + test + build
  2. `.github/workflows/deploy.yml`: on push main → lo mismo + SSH al VPS y ejecutar `cd /opt/pos-chile && ./scripts/deploy.sh` con env var `DEPLOY_CONFIRM=deploy` (requiere modificar deploy.sh para aceptar env var en vez de read interactivo)
  3. Secrets en GH: `DEPLOY_KEY` (contenido de `~/.ssh/pos_deploy_ed25519`), `VPS_HOST`, `VPS_USER`
- **Criterio**: push a main dispara workflow verde → ~5 min después `curl https://dy-pos.zgamersa.com/api/health` responde con commit SHA nuevo
- **Dependencia**: GAP-04 debe completarse antes (audit incorporado)
- **Cuidado**: evitar exponer `.env.docker` al log de Actions (scp separado desde runner puede ser riesgoso; mejor mantener `.env.docker` solo en VPS y que workflow SSH ejecute deploy sin tocar secrets)

### GAP-06 · Playwright E2E smoke test

- **Estado**: hay `devDependencies.playwright` instalado pero 0 tests E2E activos. Solo vitest unit (68/68). Gotcha 77 documenta explícitamente que curl ≠ browser para Server Actions
- **Agente recomendado**: Worktree
- **Acciones**:
  1. `apps/web/e2e/login.spec.ts`: login admin + cajero → dashboard visible
  2. `apps/web/e2e/venta-flow.spec.ts`: login cajero → abrir caja → agregar producto → cerrar venta → verificar stock decrementó en `/productos`
  3. Script `pnpm e2e` y hook en deploy.sh opcional (pre-push smoke)
- **Criterio**: `pnpm e2e` pasa verde local. GH Actions puede correrlo contra `pnpm dev` en CI
- **Dependencia**: Postgres local debe estar corriendo; probablemente levantarlo con Testcontainers

### GAP-07 · ABC analysis reporte

- **Estado**: datos ya existen en DB (`Producto.ventas` acumulado + `Producto.precio`). El skill inventory-management lo describe canónicamente
- **Agente recomendado**: Worktree (feature UI nueva)
- **Acciones**:
  1. Server action `reportes/abc/actions.ts` que calcula `valor = ventas × precio` por producto, ordena desc, clasifica A/B/C por pareto (80/15/5)
  2. Page en `/reportes/abc` con tabla segmentada + recomendación de política de stock por segmento (`A: reviews semanales, B: mensual, C: trimestral`)
  3. Link desde sidebar sección Reportes
- **Criterio**: el 20% top de productos por ventas aparece marcado como "A" y sus stock alerts son visibles desde /alertas
- **Dependencia**: ninguna

### GAP-08 · Integration tests con testcontainers

- **Estado**: 68 unit tests pero 0 que verifiquen transacciones contra DB real. Las transacciones `crearVenta`/`eliminarVenta`/`crearDevolucion` son críticas y actualmente no tienen cobertura E2E DB
- **Agente recomendado**: Worktree
- **Acciones**:
  1. Agregar `testcontainers/postgresql` a devDependencies
  2. `apps/web/lib/__tests__/integration/ventas.test.ts`: spawn Postgres efímero → aplicar schema via prisma → test `crearVenta` + verificar stock, ventas, compras, ultimaCompra
  3. Test `eliminarVenta` verificando que `ultimaCompra` se recalcula correctamente (gotcha: no asumir fecha anterior)
  4. Test `crearDevolucion` con concurrencia simulada para validar `FOR UPDATE NOWAIT`
- **Criterio**: `pnpm test:integration` verde. 3-5 tests mínimo cubriendo los casos no-triviales
- **Riesgo**: tests pesados — correr solo en CI, no en pre-commit

---

## 🟢 Nice to have (>3 h o roadmap largo)

### GAP-09 · Barcode scanner en caja POS

- **Estado**: campo `Producto.codigo String?` existe en schema pero no hay UI para escanear. El cajero busca por nombre
- **Agente recomendado**: Worktree
- **Acciones**:
  1. UI en `/caja`: input con autofocus + escaneo de barcode USB (HID device envía keyboard events, termina con Enter)
  2. O camera-based scanning con `html5-qrcode` para móviles
  3. Lookup instant por `codigo` + agregar al carrito
- **Dependencia**: ninguna
- **Valor**: acelera checkout en 30-50%

### GAP-10 · MFA / 2FA para rol ADMIN

- **Estado**: admin y cajero solo con password. MFA estándar para apps con data financiera
- **Agente recomendado**: Worktree (feature nueva grande)
- **Acciones**:
  1. Agregar campo `Usuario.totpSecret String?` + `Usuario.mfaEnabled Boolean @default(false)`
  2. Setup flow en `/perfil/seguridad`: generar secret con `otplib`, mostrar QR, verificar código primero
  3. Login: si `mfaEnabled` → pedir código 6 dígitos tras password
  4. Obligatorio para rol ADMIN, opcional para CAJERO
- **Dependencia**: ninguna
- **Criterio**: admin con MFA no puede entrar sin código TOTP; cajero sin MFA mantiene flow actual

### GAP-11 · Image registry (GHCR) en vez de rebuild en VPS

- **Estado**: `scripts/deploy.sh` hace `docker compose up --build` que rebuilea en el VPS (~2 min de pnpm install + build). Con GHCR el build solo pasa una vez en CI
- **Agente recomendado**: Worktree (requiere refactor de Dockerfile + docker-compose)
- **Acciones**:
  1. GitHub Actions build + push a `ghcr.io/dysa-devlmer/pos-web:latest` on merge main
  2. `docker-compose.yml` en VPS pasa de `build: { context: ., dockerfile: ... }` a `image: ghcr.io/dysa-devlmer/pos-web:latest`
  3. `scripts/deploy.sh` cambia: rsync solo para `docker-compose.yml` + `.env.docker` + pull de imagen + recreate
- **Beneficio**: deploy time baja de ~3 min a ~30 s. Rollback es `docker image pull ghcr.io/.../pos-web:<old-sha>` (instantáneo)
- **Dependencia**: GAP-05 (GH Actions) primero

---

## Resumen para Cowork/Worktree

| # | Gap | Agente | Esfuerzo | Dependencias | Estado |
|---|-----|--------|----------|--------------|--------|
| 01 | Sentry DSN prod | Pierre + CLI | 5 min | — | ✅ `3f3b162` |
| 02 | Healthcheck pos-web | CLI | 5 min | — | ✅ `49a91a2` (+ gotchas 83/84) |
| 03 | Backup Postgres | CLI | 10 min | — | ✅ 2026-04-22 (VPS config only) |
| 04 | pnpm audit pre-deploy | CLI | 15 min | — | ⏳ |
| 05 | GitHub Actions CI/CD | Worktree | 1 h | GAP-04 | ⏳ |
| 06 | Playwright E2E | Worktree | 30 min | — | ⏳ |
| 07 | ABC analysis reporte | Worktree | 1 h | — | ⏳ |
| 08 | Integration tests DB | Worktree | 1 h | — | ⏳ |
| 09 | Barcode scanner | Worktree | 2-3 h | — | ⏳ |
| 10 | MFA/2FA ADMIN | Worktree | 2 h | — | ⏳ |
| 11 | Image registry GHCR | Worktree | 1-2 h | GAP-05 | ⏳ |

**Orden sugerido de ejecución**:
1. Bloque quick-wins (01, 02, 03, 04) → todo en una sesión CLI (~35 min)
2. E2E tests (06) → valida que nada rompió tras quick-wins
3. CI/CD (05 → 11) → cierra el loop deploy automatizado
4. Integration tests (08) → cobertura DB crítica
5. ABC (07), Barcode (09), MFA (10) → features nuevas según prioridad de negocio

**Tracking**: cuando un gap se cierre, tachar aquí (marca markdown: `### ~~GAP-NN~~ · …`) + documentar el commit que lo cerró.
