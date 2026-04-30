# Deploy y operación — `scripts/deploy.sh`

> **Regla absoluta:** ningún cambio toca producción sin pasar por `scripts/deploy.sh`.
> Cero excepciones — ni "solo un fix rápido", ni "ssh manual al VPS".

## 1. Flujo canónico

```
local → commit + push origin main → ./scripts/deploy.sh → smoke browser
```

1. Desarrollar local (`pnpm dev`).
2. Verificar: `pnpm --filter web type-check && pnpm --filter web build`.
3. Commit + push (hook post-commit captura en `memory/.pending-notes`).
4. Ejecutar `./scripts/deploy.sh`.
5. Smoke prod en browser incógnito (gotcha 77 — curl NO valida Server Actions).

## 2. Fases del script

```
1. Pre-flight
   ├─ Docker daemon up
   ├─ SSH OK con ~/.ssh/pos_deploy_ed25519
   ├─ .env.docker existe + variables críticas (NEXTAUTH_SECRET, POS_DATABASE_URL, ...)
   └─ git working tree limpio (warn si dirty)

2. Build local opcional (Q: build local? n recomendado — VPS hace build)

3. Confirmación explícita
   └─ typear literal "deploy" para continuar

4. Sync archivos
   ├─ rsync (excluye node_modules, .next, dist, docs/, memory/, .git)
   └─ scp .env.docker separado (no va por rsync)

5. Recreate containers en VPS
   ├─ docker compose up -d --build --force-recreate --remove-orphans
   └─ (gotcha 75: sin --force-recreate no recarga código)

5a-bis. Backup BD pre-migrations  ← Fase 0.3
   ├─ pg_dump | gzip → /var/backups/dypos-cl-db/pre-deploy-YYYYMMDD-HHMMSS.sql.gz
   ├─ chmod 600
   └─ rotación 14 dumps

6. Apply migrations
   └─ docker exec pos-web pnpm --filter @repo/db prisma migrate deploy

7. Health check
   ├─ 12 intentos × 10s a /api/health
   └─ rollback automático al último backup si falla
```

## 3. Prerequisitos

### Deploy key

```bash
# Onboarding nuevo agente / máquina:
ssh-keygen -t ed25519 -f ~/.ssh/pos_deploy_ed25519 -N "" -C "pos-deploy@system_pos"
ssh-copy-id -i ~/.ssh/pos_deploy_ed25519.pub root@<VPS_IP>
```

### `.env.docker` en VPS (fuera del repo)

Pierre custodia. Mínimo:

```
POSTGRES_USER=pos_admin
POSTGRES_PASSWORD=<rotar>
POSTGRES_DB=pos_chile_db
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=https://<dominio-tenant>
POS_DATABASE_URL=postgresql://pos_admin:...@postgres:5432/pos_chile_db?schema=public
SENTRY_DSN=<dsn>
PII_LOG_SALT=<rotar>
PGADMIN_DEFAULT_EMAIL=admin@dypos.cl
PGADMIN_DEFAULT_PASSWORD=<rotar>
```

## 4. Backup y restore

### Pre-deploy (automático)

`scripts/deploy.sh` en fase 5a-bis. Ver `database.md §3`.

### Manual on-demand

```bash
ssh root@<VPS> '
  TS=$(date +%Y%m%d-%H%M%S)
  docker exec pos-postgres pg_dump -U pos_admin -d pos_chile_db | \
    gzip > /var/backups/dypos-cl-db/manual-$TS.sql.gz
  chmod 600 /var/backups/dypos-cl-db/manual-$TS.sql.gz
'
```

### Restore

```bash
ssh root@<VPS> '
  gunzip -c /var/backups/dypos-cl-db/<dump>.sql.gz | \
    docker exec -i pos-postgres psql -U pos_admin -d pos_chile_db
'
```

## 5. Rollback

`deploy.sh` rollback automático en fase 7 si health check falla 12 veces.
Restaura último backup pre-deploy y vuelve al image anterior.

Manual:

```bash
ssh root@<VPS>
cd /opt/pos-chile
git -C /opt/pos-chile reset --hard <commit_anterior>  # solo si hay clone
# o revertir docker image al tag anterior:
docker compose pull
docker compose up -d --force-recreate
```

## 6. Healthcheck

`GET /api/health` retorna:

```json
{ "ok": true, "db": "up", "version": "<git_sha>", "uptime_s": 3600 }
```

Usado por:

- Docker healthcheck del container (cada 30s).
- `deploy.sh` post-recreate.
- Monitoreo externo (UptimeRobot / equivalente — `DECISION_REQUIRED`).

## 7. Smoke prod checklist

Tras cada deploy, en browser incógnito:

- [ ] Login admin (admin@dypos.cl) → dashboard carga.
- [ ] Login cajero → ve `/caja`, NO ve `/usuarios` ni `/reportes`.
- [ ] Crear venta de prueba (con split tender si aplica).
- [ ] Editar la venta → verificar `total === sum(pagos)`.
- [ ] Eliminar venta de prueba → AuditLog la registra.
- [ ] Cerrar caja sin descuadre.
- [ ] `/api/health` responde 200.

## 8. Logs y troubleshooting

```bash
# Web app
ssh root@<VPS> 'docker logs --tail=200 pos-web'

# Postgres
ssh root@<VPS> 'docker logs --tail=200 pos-postgres'

# nginx
ssh root@<VPS> 'tail -f /var/log/nginx/error.log'
```

## 9. Cloudflare

- Modo SSL: **Full (strict)** — origin tiene cert válido (Let's Encrypt).
- NUNCA `Flexible` cuando origin tiene HTTPS — loop infinito (gotcha 76).
- Proxy ON solo cuando esté validado; mientras tanto DNS only.

## 10. Prohibido en prod

- ❌ `ssh VPS` + editar archivos directo (usar `deploy.sh`).
- ❌ `docker compose up` sin `--force-recreate`.
- ❌ "probar con curl y dar por OK el login" (gotcha 77).
- ❌ Cloudflare Flexible + origin HTTPS (gotcha 76).
- ❌ Saltarse el backup pre-deploy.

## 11. Tareas Pierre vs agentes (deploy-ops)

| Tarea | Quién |
|-------|-------|
| Provisionar VPS, DNS, certificados | **Pierre** |
| Custodiar `.env.docker` | **Pierre** |
| Ejecutar `deploy.sh` | Agente con confirmación de Pierre |
| Restaurar backup manualmente | **Pierre** |
| Configurar monitoreo externo | **Pierre** |
| Iterar `deploy.sh` mismo | Agentes con ADR + smoke staging |

## 12. Gotchas activos (deploy-ops)

| # | Gotcha |
|---|--------|
| 75 | `docker compose up` sin `--force-recreate`. |
| 76 | Cloudflare Flexible + origin HTTPS = loop. |
| 77 | Smoke en browser, no curl. |
| G-M51 | `git push` cuelga sin `GIT_TERMINAL_PROMPT=0`. |
| G-M52 | `deploy.sh` prompts: `printf 'n\ndeploy\n'`. |
| G-M53 | Backup BD pre-deploy auto — closed Fase 0.3. |
