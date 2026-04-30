#!/usr/bin/env bash
# scripts/backup-offsite.sh — DyPos CL (Fase 2A · DR-10 template)
#
# Copia el dump más reciente de /var/backups/dypos-cl-db/ a un bucket
# off-site (S3-compatible). Diseñado para correr en cron del VPS.
#
# === ESTADO ===
# Este script es un TEMPLATE. NO ejecutar en prod hasta que:
#   1. Pierre decida provider (Backblaze B2 / S3 / Wasabi / R2 — DR-10).
#   2. Pierre cree bucket + Application Key (scope: write-only al bucket).
#   3. Variables OFFSITE_BACKUP_* estén en $APP_DIR/.env.docker.
#
# Hasta entonces, este script falla rápido con mensaje claro si falta config.
#
# === PATHS ===
# El path del deploy actual es /opt/pos-chile (ver scripts/deploy.sh:24
# `VPS_DIR="/opt/pos-chile"`). Tenants futuros pueden usar otro APP_DIR
# vía variable de ambiente. Default: /opt/pos-chile.
#
# === USO (cuando esté operativo) ===
#   sudo crontab -e
#   0 3 * * *  /opt/pos-chile/scripts/backup-offsite.sh >> /var/log/dypos-backup-offsite.log 2>&1
#
# Para tenants con otro path:
#   0 3 * * *  APP_DIR=/opt/<tenant> /opt/<tenant>/scripts/backup-offsite.sh >> ...
#
# === SEGURIDAD ===
# - El script asume que las credenciales viven en $APP_DIR/.env.docker
#   (chmod 600, owner root). NUNCA hardcodear keys en este archivo.
# - El script sube el dump cifrado en reposo en el bucket; activar encryption
#   server-side al crear el bucket.
# - Rotación remota: política de lifecycle del bucket (retención 30 días);
#   el script NO borra dumps antiguos del bucket — eso lo gestiona el provider.

set -euo pipefail

# ─── Carga de config ────────────────────────────────────────────────────────

APP_DIR="${APP_DIR:-/opt/pos-chile}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env.docker}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/dypos-cl-db}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[backup-offsite] ERROR: $ENV_FILE no existe" >&2
  exit 2
fi

# Carga variables OFFSITE_BACKUP_* sin exponer otras al ambiente.
# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

required_vars=(
  OFFSITE_BACKUP_PROVIDER     # "b2" | "s3" | "wasabi" | "r2"
  OFFSITE_BACKUP_BUCKET       # nombre del bucket
  OFFSITE_BACKUP_KEY_ID       # Application Key ID / Access Key
  OFFSITE_BACKUP_KEY_SECRET   # Application Key Secret
  OFFSITE_BACKUP_ENDPOINT     # URL S3-compatible (B2: s3.us-west-002.backblazeb2.com)
  OFFSITE_BACKUP_REGION       # ej. us-west-002 (B2) | us-east-1 (S3)
)

missing=()
for v in "${required_vars[@]}"; do
  if [[ -z "${!v:-}" ]]; then
    missing+=("$v")
  fi
done

if (( ${#missing[@]} > 0 )); then
  echo "[backup-offsite] ERROR: variables faltantes en $ENV_FILE:" >&2
  printf '  - %s\n' "${missing[@]}" >&2
  echo "" >&2
  echo "Este script es template hasta que DR-10 (decision-log.md) esté cerrada." >&2
  echo "Ver docs/operations/external-setup-checklist.md §6." >&2
  exit 3
fi

# ─── Localizar último dump ──────────────────────────────────────────────────

if [[ ! -d "$BACKUP_DIR" ]]; then
  echo "[backup-offsite] ERROR: $BACKUP_DIR no existe" >&2
  exit 4
fi

LATEST_DUMP="$(find "$BACKUP_DIR" -maxdepth 1 -name 'pre-deploy-*.sql.gz' -type f -print | sort | tail -n 1)"

if [[ -z "$LATEST_DUMP" ]]; then
  echo "[backup-offsite] WARN: no hay dumps pre-deploy en $BACKUP_DIR" >&2
  # No es error fatal — puede ser un VPS recién provisionado sin deploys aún.
  exit 0
fi

DUMP_FILENAME="$(basename "$LATEST_DUMP")"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
HOSTNAME_TAG="$(hostname -s)"
REMOTE_KEY="${HOSTNAME_TAG}/${TIMESTAMP}_${DUMP_FILENAME}"

echo "[backup-offsite] Subiendo $LATEST_DUMP → s3://${OFFSITE_BACKUP_BUCKET}/${REMOTE_KEY}"

# ─── Verificar checksum local antes de subir ────────────────────────────────

LOCAL_SHA256="$(sha256sum "$LATEST_DUMP" | awk '{print $1}')"
echo "[backup-offsite] sha256 local: $LOCAL_SHA256"

# ─── Upload via aws-cli (S3-compatible) ─────────────────────────────────────
#
# Requiere awscli instalado en el VPS:
#   apt-get install -y awscli
#
# Para Backblaze B2 también funciona; basta el endpoint correcto.

export AWS_ACCESS_KEY_ID="$OFFSITE_BACKUP_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$OFFSITE_BACKUP_KEY_SECRET"
export AWS_DEFAULT_REGION="$OFFSITE_BACKUP_REGION"

aws s3 cp "$LATEST_DUMP" \
  "s3://${OFFSITE_BACKUP_BUCKET}/${REMOTE_KEY}" \
  --endpoint-url "https://${OFFSITE_BACKUP_ENDPOINT}" \
  --metadata "sha256=${LOCAL_SHA256},source=${HOSTNAME_TAG},provider=${OFFSITE_BACKUP_PROVIDER}"

# ─── Verificar que el objeto existe remotamente ─────────────────────────────

if aws s3 ls "s3://${OFFSITE_BACKUP_BUCKET}/${REMOTE_KEY}" \
  --endpoint-url "https://${OFFSITE_BACKUP_ENDPOINT}" >/dev/null 2>&1; then
  echo "[backup-offsite] OK: subida confirmada"
else
  echo "[backup-offsite] ERROR: no se pudo verificar el objeto subido" >&2
  exit 5
fi

# ─── Limpiar credenciales del ambiente ──────────────────────────────────────

unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_DEFAULT_REGION

echo "[backup-offsite] Done. ${TIMESTAMP}"
exit 0

# ============================================================================
# RESTORE TEST (mensual — Pierre o agente con permiso)
#
# Procedimiento manual:
#   1. Descargar último dump del bucket a /tmp en VPS staging:
#      aws s3 cp s3://<bucket>/<key> /tmp/restore-test.sql.gz \
#        --endpoint-url https://<endpoint>
#
#   2. Verificar SHA256 contra metadata:
#      sha256sum /tmp/restore-test.sql.gz
#
#   3. Restaurar a una BD aislada:
#      docker exec pos-postgres createdb -U pos_admin restore_test
#      gunzip -c /tmp/restore-test.sql.gz | \
#        docker exec -i pos-postgres psql -U pos_admin -d restore_test
#
#   4. Verificar conteo de registros críticos. Las tablas reales en Postgres
#      están en snake_case (ver @@map en packages/db/prisma/schema.prisma):
#      docker exec pos-postgres psql -U pos_admin -d restore_test -c \
#        "SELECT 'ventas' AS tabla, COUNT(*) FROM ventas
#         UNION ALL SELECT 'productos', COUNT(*) FROM productos
#         UNION ALL SELECT 'clientes', COUNT(*) FROM clientes
#         UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs;"
#
#   5. Drop la BD de prueba:
#      docker exec pos-postgres dropdb -U pos_admin restore_test
#
#   6. Registrar el restore test en memory/projects/pos-chile-monorepo.md.
# ============================================================================
