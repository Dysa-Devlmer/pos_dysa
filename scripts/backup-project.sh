#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# backup-project.sh — Backup completo del proyecto a una ruta segura externa.
#
# Filosofía:
#   - Ejecutar ANTES de cualquier operación riesgosa (deploy, refactor mayor,
#     migration de schema, rebase de history).
#   - NO depende de git (capta también archivos no commiteados, .env.docker,
#     SQLite locales, etc. — útiles para reconstruir un estado intermedio).
#   - Idempotente: cada ejecución crea snapshot independiente con timestamp.
#   - Rotación: mantiene últimos N backups; los más viejos se borran auto.
#
# Uso:
#   scripts/backup-project.sh                 → snapshot estándar
#   scripts/backup-project.sh --full          → incluye node_modules (raro)
#   scripts/backup-project.sh --keep 20       → mantener últimos 20 backups
#   scripts/backup-project.sh --dest /path    → custom destino
#
# Variables de entorno opcionales:
#   BACKUP_DEST   — ruta destino (default: ~/Dysa-Projects-Backups)
#   BACKUP_KEEP   — número de backups a retener (default: 10)
#   BACKUP_FULL   — "1" para incluir node_modules y artifacts pesados
#
# Salida del script (exit codes):
#   0 → backup OK, integridad verificada
#   1 → fuente del proyecto no encontrada
#   2 → destino sin permisos de escritura
#   3 → rsync falló durante la copia
#   4 → verificación post-copy detectó discrepancia
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ─── Configuración por defecto ───────────────────────────────────────────────

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly PROJECT_NAME="$(basename "$PROJECT_ROOT")"

# Destino y retención (env > flags > defaults)
DEST_BASE="${BACKUP_DEST:-$HOME/Dysa-Projects-Backups}"
KEEP_LAST="${BACKUP_KEEP:-10}"
FULL_BACKUP="${BACKUP_FULL:-0}"

# Parse flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    --full)        FULL_BACKUP=1; shift ;;
    --keep)        KEEP_LAST="$2"; shift 2 ;;
    --dest)        DEST_BASE="$2"; shift 2 ;;
    --help|-h)
      grep -E "^# " "$0" | head -32 | sed 's/^# \?//'
      exit 0
      ;;
    *)
      echo "❌ Flag desconocido: $1 (use --help)" >&2
      exit 1
      ;;
  esac
done

# ─── Colores para output (solo si stdout es terminal) ────────────────────────

if [ -t 1 ]; then
  C_RESET='\033[0m'
  C_GREEN='\033[32m'
  C_YELLOW='\033[33m'
  C_RED='\033[31m'
  C_BLUE='\033[34m'
  C_BOLD='\033[1m'
else
  C_RESET='' C_GREEN='' C_YELLOW='' C_RED='' C_BLUE='' C_BOLD=''
fi

log()  { printf "${C_BLUE}[$(date '+%H:%M:%S')]${C_RESET} %s\n" "$*"; }
ok()   { printf "${C_GREEN}✓${C_RESET} %s\n" "$*"; }
warn() { printf "${C_YELLOW}⚠${C_RESET} %s\n" "$*"; }
err()  { printf "${C_RED}✗${C_RESET} %s\n" "$*" >&2; }

# ─── Validaciones ────────────────────────────────────────────────────────────

if [ ! -d "$PROJECT_ROOT/.git" ]; then
  err "No se encontró .git en $PROJECT_ROOT — ¿este script está bajo scripts/?"
  exit 1
fi

# Crear destino si no existe
mkdir -p "$DEST_BASE/$PROJECT_NAME" || {
  err "No se pudo crear destino: $DEST_BASE/$PROJECT_NAME"
  exit 2
}

# Verificar escritura
if [ ! -w "$DEST_BASE/$PROJECT_NAME" ]; then
  err "Sin permisos de escritura en $DEST_BASE/$PROJECT_NAME"
  exit 2
fi

# ─── Setup snapshot ──────────────────────────────────────────────────────────

readonly TIMESTAMP="$(date '+%Y%m%d-%H%M%S')"
readonly GIT_SHA="$(cd "$PROJECT_ROOT" && git rev-parse --short HEAD 2>/dev/null || echo 'no-git')"
readonly GIT_BRANCH="$(cd "$PROJECT_ROOT" && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'no-git')"
readonly DIRTY_FLAG="$(cd "$PROJECT_ROOT" && [ -n "$(git status --porcelain 2>/dev/null)" ] && echo "-dirty" || echo "")"

readonly SNAPSHOT_NAME="${TIMESTAMP}_${GIT_BRANCH}_${GIT_SHA}${DIRTY_FLAG}"
readonly SNAPSHOT_DIR="$DEST_BASE/$PROJECT_NAME/$SNAPSHOT_NAME"

log "${C_BOLD}Backup proyecto${C_RESET} $PROJECT_NAME"
log "Origen:   $PROJECT_ROOT"
log "Destino:  $SNAPSHOT_DIR"
log "Branch:   $GIT_BRANCH @ $GIT_SHA${DIRTY_FLAG}"
log "Modo:     $([ "$FULL_BACKUP" = "1" ] && echo 'FULL (incluye node_modules)' || echo 'estándar (excluye builds + node_modules)')"
echo ""

# ─── Patrón de exclusión ─────────────────────────────────────────────────────
#
# Categorías:
#   - Builds y artifacts (.next, dist, android/build, .gradle, .expo)
#   - Caches (node_modules, .turbo, .cache, coverage)
#   - Logs y temporales (*.log, .DS_Store)
#   - Archivos sensibles que NO queremos en backup (none — incluimos .env*
#     porque el backup es para recovery, no para sharing)
#
# IMPORTANTE: NO excluir .env, .env.docker, .env.mobile.publish — son críticos
# para reconstruir un estado deployable. El backup vive en una carpeta privada
# del usuario, no se comparte.

EXCLUDE_PATTERNS=(
  # Builds Next.js
  "--exclude=apps/web/.next/"
  "--exclude=apps/web/out/"
  # Builds mobile
  "--exclude=apps/mobile/.expo/"
  "--exclude=apps/mobile/dist/"
  "--exclude=apps/mobile/android/build/"
  "--exclude=apps/mobile/android/app/build/"
  "--exclude=apps/mobile/android/.gradle/"
  "--exclude=apps/mobile/ios/Pods/"
  "--exclude=apps/mobile/ios/build/"
  # APKs históricos (regenerables; viven también en R2/VPS para distribución)
  "--exclude=releases/"
  # Generic — patrones doble:
  # `.turbo/` matchea solo el del root, `**/.turbo/` los anidados.
  # Sin doble pattern, rsync deja escapar uno u otro según versión.
  "--exclude=.turbo/"
  "--exclude=**/.turbo/"
  "--exclude=coverage/"
  "--exclude=**/coverage/"
  "--exclude=.cache/"
  "--exclude=**/.cache/"
  "--exclude=**/.DS_Store"
  "--exclude=**/*.log"
  "--exclude=.dev-server.log"
  # Worktrees temporales (Cowork crea estos)
  "--exclude=.claude/worktrees/"
  # Tool-results/agents temporales (Claude Code session artifacts)
  "--exclude=**/tool-results/"
)

# node_modules excluido por default — pesa GB y se regenera con pnpm install
if [ "$FULL_BACKUP" != "1" ]; then
  EXCLUDE_PATTERNS+=(
    "--exclude=**/node_modules/"
  )
fi

# ─── Ejecutar rsync ──────────────────────────────────────────────────────────

log "Copiando archivos (rsync)..."

if ! rsync -a --delete-excluded \
  "${EXCLUDE_PATTERNS[@]}" \
  "$PROJECT_ROOT/" "$SNAPSHOT_DIR/" 2>&1 | tail -5; then
  err "rsync falló — revisa logs arriba"
  exit 3
fi

ok "Copia completada"

# ─── Metadata del snapshot ───────────────────────────────────────────────────

cat > "$SNAPSHOT_DIR/.backup-metadata.json" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "git_sha": "$GIT_SHA",
  "git_branch": "$GIT_BRANCH",
  "dirty": $([ -n "$DIRTY_FLAG" ] && echo 'true' || echo 'false'),
  "full_backup": $([ "$FULL_BACKUP" = "1" ] && echo 'true' || echo 'false'),
  "source_path": "$PROJECT_ROOT",
  "creator": "$(whoami)",
  "host": "$(hostname)"
}
EOF

# ─── Verificación de integridad ──────────────────────────────────────────────

log "Verificando integridad..."

# Sanity check: el backup debe tener al menos los directorios canónicos
REQUIRED_DIRS=("apps/web" "apps/mobile" "packages/db" ".git")
for dir in "${REQUIRED_DIRS[@]}"; do
  if [ ! -d "$SNAPSHOT_DIR/$dir" ]; then
    err "Falta directorio crítico: $dir"
    exit 4
  fi
done

# Tamaño razonable: el backup estándar debería pesar 50-300 MB
SIZE_HUMAN="$(du -sh "$SNAPSHOT_DIR" | awk '{print $1}')"
SIZE_BYTES="$(du -sk "$SNAPSHOT_DIR" | awk '{print $1}')"

# Si el backup pesa < 10MB algo está raro (probablemente excluyó demasiado)
if [ "$SIZE_BYTES" -lt 10000 ]; then
  err "Backup muy pequeño ($SIZE_HUMAN) — posible exclusión incorrecta"
  exit 4
fi

ok "Integridad OK — tamaño: $SIZE_HUMAN"

# ─── Rotación de backups viejos ──────────────────────────────────────────────

log "Rotación: manteniendo últimos $KEEP_LAST snapshots..."

# Listar backups (oldest first), eliminar los excedentes
SNAPSHOTS_DIR="$DEST_BASE/$PROJECT_NAME"
TOTAL_SNAPSHOTS="$(find "$SNAPSHOTS_DIR" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"

if [ "$TOTAL_SNAPSHOTS" -gt "$KEEP_LAST" ]; then
  TO_DELETE="$((TOTAL_SNAPSHOTS - KEEP_LAST))"
  log "Eliminando $TO_DELETE snapshot(s) antiguo(s)..."

  # Ordenar por mtime ascendente (más viejo primero), tomar los primeros N
  find "$SNAPSHOTS_DIR" -mindepth 1 -maxdepth 1 -type d -print0 \
    | xargs -0 ls -dt -r \
    | head -n "$TO_DELETE" \
    | while read -r old_snap; do
        warn "  borrando: $(basename "$old_snap")"
        rm -r "$old_snap" 2>/dev/null || rm -rf "$old_snap"
      done
fi

# ─── Resumen final ───────────────────────────────────────────────────────────

echo ""
ok "${C_BOLD}Backup completado${C_RESET}"
log "Ubicación:  $SNAPSHOT_DIR"
log "Tamaño:     $SIZE_HUMAN"
log "Total snapshots:  $(find "$SNAPSHOTS_DIR" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
echo ""
log "Para restaurar:"
log "  rsync -a --delete \"$SNAPSHOT_DIR/\" \"$PROJECT_ROOT/\""
log ""
log "Después del restore: pnpm install && pnpm db:generate"
