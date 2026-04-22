#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# dev.sh — Control del entorno local de POS Chile
#
# Uso:
#   ./scripts/dev.shstart    Levanta postgres (docker) + pnpm dev (http://localhost:3000)
#   ./scripts/dev.shstop     Detiene pnpm dev; deja postgres corriendo
#   ./scripts/dev.shstop --all   Detiene pnpm dev + contenedores docker
#   ./scripts/dev.shstatus   Muestra estado de docker + puerto 3000
#   ./scripts/dev.shlogs     Sigue los logs de pnpm dev en vivo
#   ./scripts/dev.shrestart  stop + start
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

LOG_FILE="$ROOT_DIR/.dev-server.log"
PID_FILE="$ROOT_DIR/.dev-server.pid"
PORT=3000

# ── Helpers ──────────────────────────────────────────────────────────────────
c_reset='\033[0m'; c_bold='\033[1m'
c_green='\033[0;32m'; c_yellow='\033[0;33m'; c_red='\033[0;31m'; c_cyan='\033[0;36m'
log()  { printf "${c_cyan}▸${c_reset} %s\n" "$*"; }
ok()   { printf "${c_green}✓${c_reset} %s\n" "$*"; }
warn() { printf "${c_yellow}⚠${c_reset} %s\n" "$*"; }
err()  { printf "${c_red}✗${c_reset} %s\n" "$*" >&2; }

port_busy() { lsof -ti:"$1" >/dev/null 2>&1; }
postgres_up() { docker ps --filter "name=pos-postgres" --filter "status=running" --format '{{.Names}}' | grep -q pos-postgres; }

# ── Acciones ─────────────────────────────────────────────────────────────────

action_start() {
  printf "${c_bold}▸ POS Chile — start${c_reset}\n"

  # 1. Postgres
  if postgres_up; then
    ok "Postgres ya corriendo (pos-postgres)"
  else
    log "Levantando contenedores Docker (postgres + pgadmin)…"
    docker compose up -d
    ok "Docker compose arriba"
  fi

  # 2. Puerto 3000
  if port_busy "${PORT}"; then
    warn "Puerto ${PORT} ya ocupado — no se levanta pnpm dev"
    warn "Usa './dev.sh stop' primero o './dev.sh restart'"
    return 1
  fi

  # 3. pnpm dev en background
  log "Iniciando pnpm dev (logs → $LOG_FILE)…"
  : > "$LOG_FILE"
  nohup pnpm --filter web dev > "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"

  # 4. Esperar a "Ready"
  log "Esperando arranque de Next.js…"
  for _ in $(seq 1 30); do
    if grep -q "Ready in" "$LOG_FILE" 2>/dev/null; then
      ok "Next.js listo → http://localhost:${PORT}"
      echo
      printf "  pnpm dev PID: %s\n" "$(cat "$PID_FILE")"
      printf "  Logs:         ./scripts/dev.sh logs\n"
      printf "  Detener:      ./scripts/dev.sh stop\n"
      return 0
    fi
    if grep -qE "(EADDRINUSE|Error:)" "$LOG_FILE" 2>/dev/null; then
      err "Error al arrancar — revisa $LOG_FILE"
      tail -20 "$LOG_FILE"
      return 1
    fi
    sleep 1
  done
  warn "Next.js tardó más de 30s — revisa ./dev.sh logs"
}

action_stop() {
  local stop_all="${1:-}"
  printf "${c_bold}▸ POS Chile — stop${c_reset}\n"

  # 1. Matar pnpm dev por PID
  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid="$(cat "$PID_FILE")"
    if kill -0 "$pid" 2>/dev/null; then
      log "Deteniendo pnpm dev (PID $pid)…"
      kill "$pid" 2>/dev/null || true
      sleep 1
      kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$PID_FILE"
  fi

  # 2. Limpiar puerto 3000 (por si quedó algo huérfano)
  if port_busy "${PORT}"; then
    log "Liberando puerto ${PORT}…"
    lsof -ti:"${PORT}" | xargs kill -9 2>/dev/null || true
  fi
  ok "Next.js detenido"

  # 3. --all → también docker
  if [[ "$stop_all" == "--all" ]]; then
    log "Deteniendo contenedores Docker…"
    docker compose down
    ok "Docker compose down"
  else
    postgres_up && ok "Postgres sigue corriendo (usa --all para detenerlo)"
  fi
}

action_status() {
  printf "${c_bold}▸ POS Chile — status${c_reset}\n\n"

  printf "  ${c_bold}Docker:${c_reset}\n"
  docker ps --filter "name=pos-" --format "    {{.Names}}\t{{.Status}}" | column -t -s $'\t'
  echo

  printf "  ${c_bold}Next.js (puerto ${PORT}):${c_reset}\n"
  if port_busy "${PORT}"; then
    local pids
    pids="$(lsof -ti:"${PORT}" | tr '\n' ' ')"
    ok "Corriendo — PID(s): $pids"
    printf "    URL: http://localhost:${PORT}\n"
  else
    warn "No corriendo"
  fi
}

action_logs() {
  if [[ ! -f "$LOG_FILE" ]]; then
    err "No hay logs — ¿arrancaste con ./dev.sh start?"
    return 1
  fi
  tail -f "$LOG_FILE"
}

# ── Main ─────────────────────────────────────────────────────────────────────

case "${1:-}" in
  start)   action_start ;;
  stop)    action_stop "${2:-}" ;;
  restart) action_stop; sleep 1; action_start ;;
  status)  action_status ;;
  logs)    action_logs ;;
  *)
    cat <<EOF
${c_bold}POS Chile — entorno local${c_reset}

Uso:
  ./scripts/dev.shstart              Levanta postgres + pnpm dev
  ./scripts/dev.shstop               Detiene pnpm dev (deja postgres)
  ./scripts/dev.shstop --all         Detiene pnpm dev + docker
  ./scripts/dev.shrestart            stop + start
  ./scripts/dev.shstatus             Estado de docker + puerto 3000
  ./scripts/dev.shlogs               Sigue los logs de pnpm dev

URL: http://localhost:${PORT}
EOF
    ;;
esac
