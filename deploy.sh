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
SSH_KEY="$HOME/.ssh/id_rsa"
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
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new \
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
if ! ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new \
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
log "Transfiriendo archivos al VPS (rsync)..."
rsync -avz --progress \
  --exclude='.git/' \
  --exclude='node_modules/' \
  --exclude='apps/web/node_modules/' \
  --exclude='packages/*/node_modules/' \
  --exclude='.next/' \
  --exclude='apps/web/.next/' \
  --exclude='*.log' \
  --exclude='.env.local' \
  --exclude='deploy.log' \
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

  # Docker compose
  docker compose --env-file .env.docker up -d --build --remove-orphans

  echo 'Docker compose iniciado'
"

success "Docker compose ejecutado en VPS"

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
