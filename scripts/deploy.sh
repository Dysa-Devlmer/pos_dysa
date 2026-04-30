#!/usr/bin/env bash
# =============================================================================
#  deploy.sh — POS Chile · Script de Deploy Profesional
#  VPS: 64.176.21.229 · Ubuntu 24.04 LTS
#
#  Flujo: local build → validación → rsync → docker compose → health check
#  En caso de fallo: rollback automático al build anterior
# =============================================================================

set -euo pipefail

# ─── Colores ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ─── Configuración ────────────────────────────────────────────────────────────
VPS_HOST="64.176.21.229"
VPS_USER="root"          # Cambiar a "pierre" después del hardening
VPS_DIR="/opt/pos-chile"
DOMAIN="dy-pos.zgamersa.com"
SSH_KEY="${DEPLOY_KEY:-$HOME/.ssh/pos_deploy_ed25519}"   # Deploy key dedicada (sin passphrase). Override con $DEPLOY_KEY.
ENV_FILE=".env.docker"
HEALTH_URL="https://${DOMAIN}/api/health"
HEALTH_URL_FALLBACK="http://${VPS_HOST}:3000/api/health"
HEALTH_RETRIES=12        # 12 x 10s = 2 minutos esperando
LOG_FILE="deploy.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# ─── Helpers ──────────────────────────────────────────────────────────────────
log()     { echo -e "${CYAN}[$(date '+%H:%M:%S')]${NC} $*" | tee -a "$LOG_FILE"; }
success() { echo -e "${GREEN}✓${NC} $*" | tee -a "$LOG_FILE"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $*" | tee -a "$LOG_FILE"; }
error()   { echo -e "${RED}✗${NC} $*" | tee -a "$LOG_FILE"; }
header()  { echo -e "\n${BOLD}${BLUE}═══ $* ═══${NC}\n"; }
die()     { error "$*"; exit 1; }

ssh_run() {
  # -n desactiva stdin: evita que ssh consuma el stdin del script parent.
  # Sin esto, los `read` interactivos del script reciben EOF y set -e aborta.
  ssh -n -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new \
      -o ConnectTimeout=10 "${VPS_USER}@${VPS_HOST}" "$@"
}

# ─── Banner ───────────────────────────────────────────────────────────────────
clear
echo -e "${BOLD}${BLUE}"
cat << 'EOF'
  ██████╗  ██████╗ ███████╗     ██████╗██╗  ██╗██╗██╗     ███████╗
  ██╔══██╗██╔═══██╗██╔════╝    ██╔════╝██║  ██║██║██║     ██╔════╝
  ██████╔╝██║   ██║███████╗    ██║     ███████║██║██║     █████╗
  ██╔═══╝ ██║   ██║╚════██║    ██║     ██╔══██║██║██║     ██╔══╝
  ██║     ╚██████╔╝███████║    ╚██████╗██║  ██║██║███████╗███████╗
  ╚═╝      ╚═════╝ ╚══════╝     ╚═════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝
EOF
echo -e "${NC}"
echo -e "  ${BOLD}Deploy → ${VPS_USER}@${VPS_HOST}:${VPS_DIR}${NC}"
echo -e "  ${BOLD}Dominio → https://${DOMAIN}${NC}"
echo -e "  ${CYAN}${TIMESTAMP}${NC}"
echo ""

# ─── 1. Pre-flight checks ─────────────────────────────────────────────────────
header "1/6 · Pre-flight Checks"

# Docker local
if ! docker info &>/dev/null; then
  die "Docker no está corriendo localmente. Inícialo antes de deployar."
fi
success "Docker local activo"

# SSH key
if [[ ! -f "$SSH_KEY" ]]; then
  die "SSH key no encontrada en $SSH_KEY"
fi
success "SSH key encontrada"

# .env.docker
if [[ ! -f "$ENV_FILE" ]]; then
  die "Archivo $ENV_FILE no existe. Cópialo desde .env.example y complétalo."
fi

# Validar vars críticas en .env.docker
check_env_var() {
  local var=$1
  local val
  val=$(grep -E "^${var}=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)
  if [[ -z "$val" ]] || [[ "$val" == *"generar"* ]] || [[ "$val" == *"localhost"* && "$var" == "NEXTAUTH_URL" ]]; then
    die "${var} no está configurada correctamente en ${ENV_FILE}. Valor actual: '${val}'"
  fi
}

# Verificar que NEXTAUTH_SECRET esté seteado (no el placeholder)
NEXTAUTH_SECRET_VAL=$(grep -E "^NEXTAUTH_SECRET=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)
if [[ -z "$NEXTAUTH_SECRET_VAL" ]] || [[ "$NEXTAUTH_SECRET_VAL" == *"generar"* ]]; then
  echo ""
  warn "NEXTAUTH_SECRET no configurado en $ENV_FILE"
  echo -e "  Genera uno con: ${CYAN}openssl rand -base64 32${NC}"
  echo ""
  die "Configura NEXTAUTH_SECRET antes de deployar"
fi
success ".env.docker válido"

# Conectividad SSH al VPS
log "Verificando conexión SSH a ${VPS_HOST}..."
if ! ssh -n -i "$SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new \
        -o BatchMode=yes "${VPS_USER}@${VPS_HOST}" "echo ok" &>/dev/null; then
  die "No se puede conectar al VPS. Verifica SSH key y que el servidor esté activo."
fi
success "SSH conectado al VPS"

# Docker en VPS
if ! ssh_run "docker info" &>/dev/null; then
  die "Docker no está corriendo en el VPS."
fi
success "Docker activo en VPS"

# ─── 2. Build local ───────────────────────────────────────────────────────────
header "2/6 · Build Local"

echo -e "¿Correr build local antes de deployar? ${CYAN}[s/N]${NC} "
read -r RUN_BUILD
if [[ "$RUN_BUILD" =~ ^[sS]$ ]]; then
  log "Corriendo pnpm install..."
  pnpm install --frozen-lockfile 2>&1 | tail -5

  log "Corriendo pnpm build..."
  if ! pnpm build 2>&1 | tail -20; then
    die "Build local falló. Corrige los errores antes de deployar."
  fi
  success "Build local exitoso"
else
  warn "Build local omitido (asegúrate que el código esté listo)"
fi

# ─── 3. Confirmación ─────────────────────────────────────────────────────────
header "3/6 · Confirmación"

echo -e "  ${BOLD}Destino:${NC}   ${VPS_USER}@${VPS_HOST}:${VPS_DIR}"
echo -e "  ${BOLD}Env file:${NC}  ${ENV_FILE}"
echo -e "  ${BOLD}Acción:${NC}    rsync + docker compose up --build"
echo ""
echo -e "${YELLOW}¿Proceder con el deploy? [escribe 'deploy' para confirmar]${NC} "
read -r CONFIRM
if [[ "$CONFIRM" != "deploy" ]]; then
  warn "Deploy cancelado."
  exit 0
fi

# ─── 4. Backup en VPS ────────────────────────────────────────────────────────
header "4/6 · Backup + Transferencia"

BACKUP_TAG=$(date '+%Y%m%d_%H%M%S')

log "Creando backup del deploy anterior en VPS..."
ssh_run "
  if [ -d ${VPS_DIR} ]; then
    docker compose -f ${VPS_DIR}/docker-compose.yml --env-file ${VPS_DIR}/.env.docker \
      ps --format json 2>/dev/null | grep -q 'running' \
      && docker compose -f ${VPS_DIR}/docker-compose.yml --env-file ${VPS_DIR}/.env.docker \
         stop web 2>/dev/null || true
    cp -r ${VPS_DIR} ${VPS_DIR}.backup_${BACKUP_TAG} 2>/dev/null || true
    echo 'Backup creado: ${VPS_DIR}.backup_${BACKUP_TAG}'
  else
    mkdir -p ${VPS_DIR}
    echo 'Primera instalación — sin backup previo'
  fi
" || warn "No se pudo crear backup (primera instalación probablemente)"

success "Backup: ${VPS_DIR}.backup_${BACKUP_TAG}"

# rsync — excluir lo que no necesita el VPS
# Estrategia: respetar .gitignore (filter :-) + excludes explícitos para
# archivos versionados pero dev-only (memory/, docs internos, MCPs locales).
# Sin esto, rsync transferiría zip/ (1.3 GB PHP legacy), node_modules raíz
# via pnpm symlinks, screenshots/, etc → llenaba el disco del VPS.
log "Transfiriendo archivos al VPS (rsync)..."
rsync -avz --progress \
  --filter=':- .gitignore' \
  --exclude='.git/' \
  --exclude='.gitignore' \
  --exclude='.claude/' \
  --exclude='.obsidian/' \
  --exclude='.worktrees/' \
  --exclude='.DS_Store' \
  --exclude='memory/' \
  --exclude='zip/' \
  --exclude='screenshots/' \
  --exclude='docs/' \
  --exclude='vultr-mcp-server/' \
  --exclude='cloudflare-mcp-server/' \
  --exclude='datatables.net/' \
  --exclude='ssh.md' \
  --exclude='token.md' \
  --exclude='apikey.md' \
  --exclude='*.key' \
  --exclude='*.pem' \
  --exclude='*.log' \
  --exclude='deploy.log' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='.env.docker' \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new" \
  . "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/"

# Transferir .env.docker por separado (no está en rsync para mayor control)
log "Transfiriendo .env.docker..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new \
  "$ENV_FILE" "${VPS_USER}@${VPS_HOST}:${VPS_DIR}/.env.docker"

success "Archivos transferidos"

# ─── 5. Deploy en VPS ────────────────────────────────────────────────────────
header "5/6 · Docker Compose en VPS"

log "Iniciando docker compose up --build en VPS..."
ssh_run "
  set -e
  cd ${VPS_DIR}

  # Instalar dependencias Node en VPS si no existen (primera vez)
  if ! command -v node &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  fi

  if ! command -v pnpm &>/dev/null; then
    npm install -g pnpm@10.6.0
  fi

  # Build de producción
  pnpm install --frozen-lockfile

  # Docker compose — --force-recreate es OBLIGATORIO: sin esto Compose
  # puede reutilizar el container viejo si labels/env no cambiaron, aunque
  # la imagen haya sido reconstruida (gotcha 75)
  docker compose --env-file .env.docker up -d --build --force-recreate --remove-orphans

  echo 'Docker compose iniciado'
"

success "Docker compose ejecutado en VPS"

# ─── 5a-bis. Backup BD de prod ANTES de migrations ───────────────────────────
# Fase 0.3 (sesión 2026-04-30) — cierra gotcha G-M53:
#   "deploy.sh NO backupea BD prod, solo el directorio". Si una migration
#   destructiva corrompe datos, el rollback automático del script restaura
#   /opt/pos-chile (código + configs) pero NO la BD. Pérdida total potencial.
#
# Política: pg_dump | gzip a /var/backups/dypos-cl-db/, mantener últimos
# 14 dumps con rotación FIFO. Si el dump falla, el deploy se aborta con
# exit code (es deuda más grave perder datos que retrasar el deploy).
#
# Path del backup se imprime en logs explícitamente para trazabilidad
# (Codex requirement).
header "5a-bis/6 · Backup BD prod (pre-migrations)"

DB_BACKUP_TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
DB_BACKUP_PATH="/var/backups/dypos-cl-db/pre-deploy-${DB_BACKUP_TIMESTAMP}.sql.gz"

log "Generando dump comprimido en VPS: $DB_BACKUP_PATH"
ssh_run "
  set -e
  mkdir -p /var/backups/dypos-cl-db
  POSTGRES_USER=\$(grep '^POSTGRES_USER=' ${VPS_DIR}/.env.docker | cut -d= -f2-)
  POSTGRES_DB=\$(grep '^POSTGRES_DB=' ${VPS_DIR}/.env.docker | cut -d= -f2-)
  docker exec pos-postgres pg_dump -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" \\
    | gzip > '${DB_BACKUP_PATH}'
  chmod 600 '${DB_BACKUP_PATH}'
  ls -lh '${DB_BACKUP_PATH}'
" || die "Backup BD falló — abortando deploy. Investiga antes de re-intentar."

log "Rotación: manteniendo últimos 14 dumps..."
ssh_run "
  set -e
  cd /var/backups/dypos-cl-db
  TOTAL=\$(ls -1 pre-deploy-*.sql.gz 2>/dev/null | wc -l | tr -d ' ')
  if [ \"\$TOTAL\" -gt 14 ]; then
    ls -1t pre-deploy-*.sql.gz | tail -n +15 | xargs -r rm -v
  fi
"

success "Backup BD: $DB_BACKUP_PATH"
log "Para restaurar manualmente:"
log "  docker exec -i pos-postgres psql -U \$POSTGRES_USER -d \$POSTGRES_DB \\"
log "    < <(zcat $DB_BACKUP_PATH)"

# ─── 5b. Prisma migrate deploy ───────────────────────────────────────────────
# Por qué este paso existe (gotcha 96 — incidente 2026-04-27):
#   El Dockerfile multi-stage NO incluye `packages/db/prisma/` en la imagen
#   final (solo el cliente generado), así que NO podemos correr migrate
#   desde el container `pos-web`. Si la BD de prod queda atrás respecto al
#   schema, la app crashea con P2022 en runtime ("column does not exist").
#
# Estrategia: subir prisma/ al VPS y correr `migrate deploy` desde un
# container `node:22-alpine` ad-hoc en la red `pos-chile-network` para que
# pueda resolver `pos-postgres:5432` por DNS interno.
#
# Las migrations son idempotentes (IF NOT EXISTS / DO $$ EXCEPTION) — es
# seguro re-correrlas. Si no hay pendientes, prisma reporta "Already in sync".
header "5b/6 · Prisma migrate deploy"

log "Empaquetando migrations locales..."
PRISMA_TARBALL="/tmp/pos-prisma-$(date +%s).tar.gz"
tar -czf "$PRISMA_TARBALL" -C packages/db prisma/

log "Transfiriendo migrations al VPS..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new \
  "$PRISMA_TARBALL" "${VPS_USER}@${VPS_HOST}:/tmp/pos-prisma.tar.gz"
rm -f "$PRISMA_TARBALL"

log "Aplicando migrations en BD de prod..."
ssh_run "
  set -e
  cd /tmp
  rm -rf pos-prisma && mkdir pos-prisma
  tar -xzf pos-prisma.tar.gz -C pos-prisma
  rm -f pos-prisma.tar.gz

  POSTGRES_USER=\$(grep '^POSTGRES_USER=' ${VPS_DIR}/.env.docker | cut -d= -f2-)
  POSTGRES_PASSWORD=\$(grep '^POSTGRES_PASSWORD=' ${VPS_DIR}/.env.docker | cut -d= -f2-)
  POSTGRES_DB=\$(grep '^POSTGRES_DB=' ${VPS_DIR}/.env.docker | cut -d= -f2-)
  DB_URL=\"postgresql://\${POSTGRES_USER}:\${POSTGRES_PASSWORD}@pos-postgres:5432/\${POSTGRES_DB}\"

  # Esperar a que postgres esté ready después del recreate
  for i in 1 2 3 4 5 6 7 8 9 10; do
    if docker exec pos-postgres pg_isready -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" &>/dev/null; then
      echo 'Postgres listo'
      break
    fi
    echo \"Esperando postgres (\$i/10)...\"
    sleep 2
  done

  docker run --rm \
    --network pos-chile-network \
    -v /tmp/pos-prisma/prisma:/app/prisma:ro \
    -e POS_DATABASE_URL=\"\$DB_URL\" \
    -e DATABASE_URL=\"\$DB_URL\" \
    -w /app \
    node:22-alpine \
    sh -c 'npx -y prisma@6.19.3 migrate deploy --schema=/app/prisma/schema.prisma'

  rm -rf /tmp/pos-prisma
"

success "Migrations aplicadas en BD de prod"

# ─── 6. Health check ─────────────────────────────────────────────────────────
header "6/6 · Health Check"

log "Esperando que la app esté disponible en ${HEALTH_URL}..."
ATTEMPT=0
APP_UP=false

while [[ $ATTEMPT -lt $HEALTH_RETRIES ]]; do
  ATTEMPT=$((ATTEMPT + 1))
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$HEALTH_URL" 2>/dev/null || echo "000")

  if [[ "$HTTP_CODE" == "200" ]]; then
    APP_UP=true
    break
  fi

  echo -ne "  Intento ${ATTEMPT}/${HEALTH_RETRIES} — HTTP ${HTTP_CODE} — esperando 10s...\r"
  sleep 10
done

echo ""

if [[ "$APP_UP" == "true" ]]; then
  echo ""
  echo -e "${GREEN}${BOLD}"
  echo "  ╔══════════════════════════════════════╗"
  echo "  ║   ✅ DEPLOY EXITOSO                  ║"
  echo "  ╠══════════════════════════════════════╣"
  echo -e "  ║   App: https://${DOMAIN}  ║"
  echo -e "  ║   pgAdmin: http://${VPS_HOST}:5050        ║"
  echo "  ╚══════════════════════════════════════╝"
  echo -e "${NC}"

  log "Deploy completado en ${TIMESTAMP}"

  # Limpiar backups antiguos (conservar los últimos 3)
  ssh_run "
    ls -dt ${VPS_DIR}.backup_* 2>/dev/null | tail -n +4 | xargs rm -rf 2>/dev/null || true
  "
else
  echo ""
  error "DEPLOY FALLÓ — Health check no pasó después de $((HEALTH_RETRIES * 10))s"
  echo ""

  warn "Iniciando ROLLBACK al backup anterior..."
  ssh_run "
    set -e
    cd /opt

    # Detener containers fallidos
    docker compose -f ${VPS_DIR}/docker-compose.yml --env-file ${VPS_DIR}/.env.docker \
      down 2>/dev/null || true

    # Restaurar backup
    LATEST_BACKUP=\$(ls -dt ${VPS_DIR}.backup_* 2>/dev/null | head -1)
    if [ -n \"\$LATEST_BACKUP\" ]; then
      rm -rf ${VPS_DIR}
      cp -r \"\$LATEST_BACKUP\" ${VPS_DIR}
      cd ${VPS_DIR}
      docker compose --env-file .env.docker up -d
      echo 'Rollback completado desde: '\$LATEST_BACKUP
    else
      echo 'No hay backup disponible para rollback'
    fi
  "

  warn "Rollback ejecutado. Revisa los logs con:"
  echo "  ssh root@${VPS_HOST} 'docker compose -f ${VPS_DIR}/docker-compose.yml logs --tail=50'"

  exit 1
fi
