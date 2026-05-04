# Runbook — Backup BD y restore (DyPos CL)

> Documento operativo para el VPS de un tenant. Pierre / agente con
> acceso SSH al VPS.
> Relacionado: `scripts/deploy.sh` (backup pre-deploy automático),
> `scripts/backup-offsite.sh` (template off-site, requiere
> credenciales — DR-10 en `docs/architecture/decision-log.md`).

---

## Contenido

1. [Estado actual de los backups](#1-estado-actual-de-los-backups)
2. [Backup local pre-deploy automático](#2-backup-local-pre-deploy-automático)
3. [Backup off-site (DR-10) — estado y activación](#3-backup-off-site-dr-10--estado-y-activación)
4. [Restore desde dump local pre-deploy](#4-restore-desde-dump-local-pre-deploy)
5. [Restore desde backup off-site](#5-restore-desde-backup-off-site)
6. [Test de restore mensual (obligatorio una vez DR-10 esté activo)](#6-test-de-restore-mensual)
7. [Disaster recovery — VPS perdido completo](#7-disaster-recovery--vps-perdido-completo)

---

## 1. Estado actual de los backups

| Tipo | Frecuencia | Origen | Destino | Retención | Estado |
|---|---|---|---|---|---|
| Pre-deploy local | Cada `./scripts/deploy.sh` | `pg_dump` en VPS | `/var/backups/dypos-cl-db/pre-deploy-*.sql.gz` | 14 dumps (FIFO) | ✅ activo |
| Diario local | — | — | — | — | ❌ no implementado |
| Off-site | — | — | S3-compatible (Backblaze B2 / S3 / Wasabi / R2) | — | 🟡 template existe, **NO** activo (DR-10 pendiente) |

**Implicancias hoy:**
- Si el VPS se pierde completo, los 14 dumps locales se van con él.
- Los dumps cubren **solo el momento del último deploy**, no actividad
  intermedia. Si pasaron 3 días sin deploy, hay 3 días de ventas que
  solo viven en el Postgres del VPS sin copia.

**Cuándo activar off-site (DR-10):**
- Antes de captar el primer cliente con SLA contractual.
- Cuando un solo tenant supere ~$1M CLP en ventas mensuales (la pérdida
  de datos pasa a ser disaster, no incidente).

---

## 2. Backup local pre-deploy automático

### Cómo se genera

`scripts/deploy.sh` corre estos comandos en el VPS antes de tocar
contenedores:

```bash
mkdir -p /var/backups/dypos-cl-db
DUMP="/var/backups/dypos-cl-db/pre-deploy-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
docker exec pos-postgres pg_dump -U pos_admin -Fc pos_chile_db | gzip > "$DUMP"
# Rotación: mantener 14 más recientes, eliminar el resto.
ls -t /var/backups/dypos-cl-db/pre-deploy-*.sql.gz | tail -n +15 | xargs -r rm -f
```

### Verificación rápida

```bash
ssh root@<IP_VPS>
ls -lh /var/backups/dypos-cl-db/ | head -20
# Esperado: archivos pre-deploy-YYYYMMDDTHHMMSSZ.sql.gz, 14 max.
```

### Inspección del contenido sin restaurar

```bash
gunzip -c /var/backups/dypos-cl-db/pre-deploy-LATEST.sql.gz | head -30
# Header del dump: "PGDMP" + version. Si dice "ERROR" → corrupto.

# Tamaño descomprimido aproximado:
gunzip -c /var/backups/dypos-cl-db/pre-deploy-LATEST.sql.gz | wc -c
```

---

## 3. Backup off-site (DR-10) — estado y activación

### Estado

`scripts/backup-offsite.sh` existe como **template** (165 líneas).
Falla rápido con código 3 si las variables `OFFSITE_BACKUP_*` no están
en `.env.docker`. NO sube nada hasta que Pierre complete los pasos
de §3 (provider + bucket + key + cron).

> ℹ️ **Antes de configurar credenciales**, correr el precheck
> agregado en Fase 3D.2:
>
> ```bash
> ssh root@<IP_VPS> '/opt/pos-chile/scripts/backup-offsite-precheck.sh'
> ```
>
> Es read-only, sin credenciales. Verifica:
>
> - awscli + sha256sum + gzip instalados.
> - APP_DIR + scripts/backup-offsite.sh + BACKUP_DIR existen.
> - .env.docker existe con perms restringidos (idealmente 600).
> - Las 6 vars `OFFSITE_BACKUP_*` (formato + presencia, sin
>   imprimir secretos).
> - Conectividad outbound al endpoint S3 (HTTP 403 sin auth =
>   red OK).
> - Cron entry presente (o sugerencia de cron si falta).
>
> Exit code 0 = listo para activar. 1 = bloqueante, resolver primero.
> Validado en local con mock VPS feliz: PASS=15 / FAIL=0. Validado
> con endpoint inalcanzable: detectó FAIL conectividad correctamente.

NO sube nada hasta que Pierre complete:

1. **Elegir provider** (Backblaze B2 recomendado por costo / latencia
   Chile, alternativas: Wasabi, S3, R2).
2. **Crear bucket** con nombre `dypos-cl-<tenant>-backups` y encryption
   server-side activado (AES-256).
3. **Crear Application Key** scope `write-only` al bucket. Guardar key
   id + secret en password manager de Pierre.
4. **Setear lifecycle policy** del bucket: retención 30 días, version
   suspended, delete después de 30d.
5. **Agregar a `$APP_DIR/.env.docker`** (chmod 600, owner root):
   ```
   OFFSITE_BACKUP_PROVIDER=b2
   OFFSITE_BACKUP_BUCKET=dypos-cl-<tenant>-backups
   OFFSITE_BACKUP_KEY_ID=<APPLICATION_KEY_ID>
   OFFSITE_BACKUP_KEY_SECRET=<APPLICATION_KEY_SECRET>
   OFFSITE_BACKUP_ENDPOINT=s3.us-west-002.backblazeb2.com
   OFFSITE_BACKUP_REGION=us-west-002
   ```
6. **Instalar awscli en el VPS:**
   ```bash
   apt-get update && apt-get install -y awscli
   ```
7. **Probar el script en dry-run** (correr una vez manualmente y revisar
   logs):
   ```bash
   ssh root@<IP_VPS>
   /opt/pos-chile/scripts/backup-offsite.sh
   echo "exit=$?"
   ```
   Esperado: `[backup-offsite] OK: subida confirmada`. Si falla, revisar
   credenciales y endpoint.
8. **Agregar a cron del VPS** (3 AM UTC = 23:00 hora Chile):
   ```bash
   sudo crontab -e
   # Agregar:
   0 3 * * * /opt/pos-chile/scripts/backup-offsite.sh >> /var/log/dypos-backup-offsite.log 2>&1
   ```

### Lo que hace el script (resumen)

- Lee variables `OFFSITE_BACKUP_*` de `.env.docker`.
- Localiza el dump pre-deploy más reciente en `/var/backups/dypos-cl-db/`.
- Calcula SHA256 local.
- Sube a `s3://<bucket>/<hostname>/<timestamp>_<filename>` con metadata
  `sha256` + `source` + `provider`.
- Verifica que el objeto existe remoto con `aws s3 ls`.
- Limpia env vars sensibles del shell.

NO borra dumps remotos (eso lo hace la lifecycle policy del bucket).

---

## 4. Restore desde dump local pre-deploy

Caso típico: deploy.sh acaba de ejecutarse y el sistema quedó roto.
Quiero volver al estado pre-deploy.

> **El script `deploy.sh` ya hace rollback automático al último backup
> si el health check post-deploy falla (12 intentos × 10 s).** Este
> procedimiento manual es para casos donde el rollback automático
> también falló o ya no es elegible (ej. detectaste el bug 1 hora
> después del deploy).

### Pasos

```bash
ssh root@<IP_VPS>
cd /opt/pos-chile

# 1. Identificar el dump al que vas a volver.
ls -t /var/backups/dypos-cl-db/pre-deploy-*.sql.gz | head -5
# Elegir el deseado (típicamente el más reciente o el penúltimo).
DUMP="/var/backups/dypos-cl-db/pre-deploy-20260502T030000Z.sql.gz"

# 2. Detener el web (la BD sigue arriba para el restore).
docker compose stop pos-web

# 3. Drop + recreate la BD aplicación.
#    OJO: cualquier dato post-dump SE PIERDE. Si hay ventas de
#    clientes posteriores al dump, considera salvarlas primero
#    (pg_dump específico de tablas afectadas a archivo aparte).
docker exec pos-postgres psql -U pos_admin -d postgres -c \
  "DROP DATABASE pos_chile_db WITH (FORCE);"
docker exec pos-postgres psql -U pos_admin -d postgres -c \
  "CREATE DATABASE pos_chile_db OWNER pos_admin;"

# 4. Restore.
gunzip -c "$DUMP" | \
  docker exec -i pos-postgres pg_restore -U pos_admin -d pos_chile_db --no-owner --clean --if-exists

# 5. Verificar conteos críticos.
docker exec pos-postgres psql -U pos_admin -d pos_chile_db -c \
  "SELECT 'ventas' AS t, COUNT(*) FROM ventas
   UNION ALL SELECT 'productos', COUNT(*) FROM productos
   UNION ALL SELECT 'clientes', COUNT(*) FROM clientes
   UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs;"

# 6. Levantar el web.
docker compose start pos-web

# 7. Smoke con el script automatizado:
./scripts/smoke-prod.sh https://<dominio-tenant>
```

### Tiempo estimado (BD < 100 MB)

5–10 minutos end-to-end.

---

## 5. Restore desde backup off-site

Caso: el VPS perdió disco / fue terminado / migrás a uno nuevo. El
último dump local ya no existe, pero el bucket sí.

> **Precondición**: tener creds `OFFSITE_BACKUP_KEY_ID/SECRET` a mano
> (password manager Pierre).

### Pasos

```bash
ssh root@<IP_VPS_NUEVO>

# 1. Instalar awscli si no está.
apt-get update && apt-get install -y awscli

# 2. Listar dumps remotos (más recientes arriba).
export AWS_ACCESS_KEY_ID=<key_id>
export AWS_SECRET_ACCESS_KEY=<key_secret>
aws s3 ls s3://<bucket>/<hostname-viejo>/ \
  --endpoint-url https://<endpoint> \
  | sort -r | head -10

# 3. Descargar el deseado a /tmp.
aws s3 cp s3://<bucket>/<hostname>/<timestamp>_<filename>.sql.gz \
  /tmp/restore.sql.gz \
  --endpoint-url https://<endpoint>

# 4. Verificar SHA256 contra metadata remota.
EXPECTED_SHA="$(aws s3api head-object \
  --bucket <bucket> --key <hostname>/<timestamp>_<filename>.sql.gz \
  --endpoint-url https://<endpoint> \
  --query Metadata.sha256 --output text)"
ACTUAL_SHA="$(sha256sum /tmp/restore.sql.gz | awk '{print $1}')"
if [[ "$EXPECTED_SHA" != "$ACTUAL_SHA" ]]; then
  echo "ERROR: SHA mismatch. Backup posiblemente corrupto." >&2
  exit 1
fi

# 5. Restore (mismo procedimiento que en §4 paso 3 en adelante).
docker exec pos-postgres psql -U pos_admin -d postgres -c \
  "DROP DATABASE IF EXISTS pos_chile_db;"
docker exec pos-postgres psql -U pos_admin -d postgres -c \
  "CREATE DATABASE pos_chile_db OWNER pos_admin;"
gunzip -c /tmp/restore.sql.gz | \
  docker exec -i pos-postgres pg_restore -U pos_admin -d pos_chile_db --no-owner --clean --if-exists

# 6. Limpiar credenciales y dump temporal.
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
shred -u /tmp/restore.sql.gz

# 7. Smoke.
./scripts/smoke-prod.sh https://<dominio-tenant>
```

---

## 6. Test de restore mensual

**Por qué es obligatorio**: un backup que nunca se restauró no es un
backup, es una esperanza. La industria recomienda ejercitar el restore
al menos 1 vez al mes.

### Procedimiento (15 min)

1. Sacar SSH al VPS.
2. Crear BD aislada: `docker exec pos-postgres createdb -U pos_admin restore_test`.
3. Restore del dump más reciente (local o off-site) a `restore_test`.
4. Comparar conteos críticos vs prod:
   ```bash
   for db in pos_chile_db restore_test; do
     docker exec pos-postgres psql -U pos_admin -d $db -t -c \
       "SELECT '$db', COUNT(*) FROM ventas;
        SELECT '$db', COUNT(*) FROM audit_logs;"
   done
   ```
5. La diferencia esperada: las ventas/auditlog que ocurrieron entre
   el momento del dump y "ahora". Para un dump diario, debería ser
   ~24h de operación, ratio razonable.
6. Drop la BD: `docker exec pos-postgres dropdb -U pos_admin restore_test`.
7. **Registrar el test en `memory/episodes/YYYY-MM-DD-restore-test.md`**
   con: fecha, dump usado, conteos, duración, anomalías.

Si el restore falla en cualquier paso → **bloqueante crítico**.
Investigar antes de aceptar el backup como confiable.

---

## 7. Disaster recovery — VPS perdido completo

### Escenario

- El VPS de un tenant fue terminado / DDoS / disco corrupto / cuenta
  Vultr suspendida. No hay acceso al disco original.

### RTO (recovery time objective) realista

| Etapa | Tiempo |
|---|---|
| Provisionar VPS nuevo (`scripts/provision-tenant.sh`) | ~15 min |
| Configurar DNS / SSL | ~30 min (depende propagación DNS) |
| Restore desde off-site | ~10 min (BD < 100 MB) |
| Smoke + validación de Pierre | ~10 min |
| **Total** | **~1 hora si todo va bien** |

### RPO (recovery point objective)

- Si hay backup off-site **diario activo (DR-10 cerrado)**: pérdida
  máxima de datos = 24 horas de operación.
- Si NO hay off-site activo: pérdida = TODO el contenido del VPS
  desde el inicio del tenant (escenario inaceptable para SLA serio).

### Pasos

1. `./scripts/provision-tenant.sh <nuevo-tenant>` (en máquina admin).
2. Apuntar DNS al nuevo VPS (Cloudflare).
3. SSH al VPS y deploy inicial (`./scripts/deploy.sh`).
4. Restore desde off-site (§5).
5. Smoke (`./scripts/smoke-prod.sh https://<dominio>`).
6. Avisar a Pierre que valide en browser.
7. Documentar el incidente en
   `memory/episodes/YYYY-MM-DD-disaster-recovery-<tenant>.md`.

---

_Última actualización: 2026-05-03 — Fase 3D._
