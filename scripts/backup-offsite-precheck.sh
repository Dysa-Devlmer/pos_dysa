#!/usr/bin/env bash
# scripts/backup-offsite-precheck.sh — Precheck DR-10 (Fase 3D.2).
#
# Valida que el VPS está LISTO para activar el cron de backup off-site.
# NO sube nada. NO usa credenciales. Solo verifica que el entorno cumple
# las precondiciones que asume scripts/backup-offsite.sh.
#
# === USO ===
#   # En el VPS donde correrá el cron:
#   sudo /opt/pos-chile/scripts/backup-offsite-precheck.sh
#
#   # Desde la máquina admin contra otro APP_DIR:
#   APP_DIR=/opt/<tenant> ./scripts/backup-offsite-precheck.sh
#
#   # En local (la mayoría de checks fallará porque no es VPS — esperado):
#   ./scripts/backup-offsite-precheck.sh
#
# === SALIDA ===
#   [OK]   item válido
#   [WARN] no bloquea pero conviene revisar (perms, formato)
#   [FAIL] bloquea — el cron va a fallar si se activa así
#   [INFO] estado esperado pre-DR-10 (vars sin setear, dumps inexistentes
#          en VPS recién provisionado, etc.)
#
# === EXIT ===
#   0 = sin FAIL (puede tener WARN/INFO).
#   1 = al menos un FAIL — NO activar cron sin resolver.

set -uo pipefail

# ─── Args y estado ──────────────────────────────────────────────────────────

APP_DIR="${APP_DIR:-/opt/pos-chile}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env.docker}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/dypos-cl-db}"
SCRIPT_PATH="${SCRIPT_PATH:-$APP_DIR/scripts/backup-offsite.sh}"

PASS=0
WARN=0
FAIL=0
INFO=0

ok()    { echo "[OK]   $*";  PASS=$((PASS+1));  }
warn()  { echo "[WARN] $*";  WARN=$((WARN+1));  }
fail()  { echo "[FAIL] $*";  FAIL=$((FAIL+1));  }
info()  { echo "[INFO] $*";  INFO=$((INFO+1));  }
hdr()   { echo; echo "─── $* ─────────────────────────────"; }

echo "backup-offsite-precheck · APP_DIR=$APP_DIR · ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# ─── 1. Tooling ─────────────────────────────────────────────────────────────

hdr "1. Tooling instalado"

if command -v aws >/dev/null 2>&1; then
  AWS_VER="$(aws --version 2>&1 | head -1)"
  ok "awscli presente: $AWS_VER"
else
  fail "awscli no instalado · 'apt-get install -y awscli' (Debian/Ubuntu)"
fi

if command -v sha256sum >/dev/null 2>&1; then
  ok "sha256sum disponible"
elif command -v shasum >/dev/null 2>&1; then
  ok "shasum disponible (alias macOS)"
else
  fail "ni sha256sum ni shasum: el script no puede verificar integridad"
fi

if command -v gzip >/dev/null 2>&1 && command -v gunzip >/dev/null 2>&1; then
  ok "gzip/gunzip disponibles"
else
  fail "gzip/gunzip faltan (necesario para los dumps comprimidos)"
fi

# ─── 2. Paths esperados ─────────────────────────────────────────────────────

hdr "2. Paths esperados"

if [[ -d "$APP_DIR" ]]; then
  ok "APP_DIR existe: $APP_DIR"
else
  fail "APP_DIR no existe: $APP_DIR · este script asume el deploy ya está hecho"
fi

if [[ -x "$SCRIPT_PATH" ]]; then
  ok "scripts/backup-offsite.sh existe y es ejecutable: $SCRIPT_PATH"
elif [[ -f "$SCRIPT_PATH" ]]; then
  warn "scripts/backup-offsite.sh existe pero no es ejecutable: chmod +x $SCRIPT_PATH"
else
  fail "scripts/backup-offsite.sh no existe en $SCRIPT_PATH · revisar el rsync del deploy"
fi

# ─── 3. Backup directory + dumps ────────────────────────────────────────────

hdr "3. Backup directory + dumps locales"

if [[ -d "$BACKUP_DIR" ]]; then
  ok "BACKUP_DIR existe: $BACKUP_DIR"

  # Listar dumps. Si está vacío, es esperado en VPS recién provisionado.
  DUMP_COUNT="$(find "$BACKUP_DIR" -maxdepth 1 -name 'pre-deploy-*.sql.gz' -type f 2>/dev/null | wc -l | tr -d ' ')"
  if [[ "$DUMP_COUNT" -gt 0 ]]; then
    LATEST_DUMP="$(find "$BACKUP_DIR" -maxdepth 1 -name 'pre-deploy-*.sql.gz' -type f -print 2>/dev/null | sort | tail -n 1)"
    LATEST_SIZE="$(du -h "$LATEST_DUMP" 2>/dev/null | awk '{print $1}')"
    ok "$DUMP_COUNT dumps pre-deploy presentes · último: $(basename "$LATEST_DUMP") ($LATEST_SIZE)"
  else
    info "BACKUP_DIR vacío · esperado en VPS recién provisionado, antes del primer deploy"
  fi
else
  warn "BACKUP_DIR no existe: $BACKUP_DIR · se crea automáticamente en el primer deploy con backup pre-migration"
fi

# ─── 4. Env file y permisos ─────────────────────────────────────────────────

hdr "4. .env.docker y permisos"

if [[ -f "$ENV_FILE" ]]; then
  ok "ENV_FILE existe: $ENV_FILE"

  # Permisos: queremos chmod 600 idealmente (rw solo owner).
  if command -v stat >/dev/null 2>&1; then
    # Linux stat -c, BSD/macOS stat -f. Probamos ambos.
    PERMS="$(stat -c '%a' "$ENV_FILE" 2>/dev/null || stat -f '%Lp' "$ENV_FILE" 2>/dev/null || echo '???')"
    case "$PERMS" in
      600|400) ok ".env.docker permisos: $PERMS (restringido — correcto)" ;;
      640|644|660) warn ".env.docker permisos: $PERMS (legible por grupo/otros) · ideal: chmod 600 $ENV_FILE" ;;
      6[6-7]?|7??) warn ".env.docker permisos: $PERMS (demasiado abierto) · chmod 600 $ENV_FILE" ;;
      ???) info ".env.docker permisos: $PERMS (no estándar — revisar manualmente)" ;;
    esac
  fi
else
  fail "ENV_FILE no existe: $ENV_FILE · debe contener las vars OFFSITE_BACKUP_* + las del deploy normal"
fi

# ─── 5. Variables OFFSITE_BACKUP_* ──────────────────────────────────────────

hdr "5. Variables OFFSITE_BACKUP_* (sin imprimir secretos)"

if [[ -f "$ENV_FILE" ]]; then
  # Sourceamos en subshell para no contaminar nuestro entorno con el resto de
  # las vars del deploy. Solo leemos las que nos importan.
  REQUIRED=(OFFSITE_BACKUP_PROVIDER OFFSITE_BACKUP_BUCKET OFFSITE_BACKUP_KEY_ID
            OFFSITE_BACKUP_KEY_SECRET OFFSITE_BACKUP_ENDPOINT OFFSITE_BACKUP_REGION)
  MISSING=()
  PROVIDER_VAL=""
  BUCKET_VAL=""
  ENDPOINT_VAL=""
  REGION_VAL=""

  while IFS= read -r var; do
    # Cargar el valor concreto sin exponer.
    val="$(set -a; . "$ENV_FILE" 2>/dev/null; eval "printf '%s' \"\${$var:-}\""; set +a)"
    if [[ -z "$val" ]]; then
      MISSING+=("$var")
    else
      case "$var" in
        OFFSITE_BACKUP_PROVIDER)  PROVIDER_VAL="$val" ;;
        OFFSITE_BACKUP_BUCKET)    BUCKET_VAL="$val" ;;
        OFFSITE_BACKUP_ENDPOINT)  ENDPOINT_VAL="$val" ;;
        OFFSITE_BACKUP_REGION)    REGION_VAL="$val" ;;
      esac
    fi
  done < <(printf '%s\n' "${REQUIRED[@]}")

  if [[ ${#MISSING[@]} -eq 0 ]]; then
    ok "Las 6 variables OFFSITE_BACKUP_* están seteadas"

    # Validación de formato (sin exponer secretos).
    case "$PROVIDER_VAL" in
      b2|s3|wasabi|r2) ok "PROVIDER=$PROVIDER_VAL · valor reconocido" ;;
      *)               warn "PROVIDER=$PROVIDER_VAL · valores recomendados: b2 / s3 / wasabi / r2" ;;
    esac

    if [[ "$BUCKET_VAL" =~ ^[a-z0-9][a-z0-9.-]{2,62}$ ]]; then
      ok "BUCKET cumple formato S3-compatible (lowercase, 3-63 chars)"
    else
      warn "BUCKET no cumple convención S3 (lowercase + alfanum + . -, 3-63 chars): '$BUCKET_VAL'"
    fi

    if [[ "$ENDPOINT_VAL" =~ ^[a-z0-9.-]+\.[a-z]{2,}$ ]]; then
      ok "ENDPOINT parece hostname válido (sin protocolo, lowercase)"
    else
      warn "ENDPOINT debería ser hostname puro sin https:// · ej. s3.us-west-002.backblazeb2.com"
    fi

    if [[ -n "$REGION_VAL" ]]; then
      ok "REGION presente: $REGION_VAL"
    fi
  else
    info "Variables OFFSITE_BACKUP_* faltan en .env.docker (esperado pre-DR-10):"
    for v in "${MISSING[@]}"; do
      info "  - $v"
    done
    info "Setear en $ENV_FILE cuando Pierre cree bucket + key (DR-10 open-loop)."
  fi
else
  info "ENV_FILE no existe — saltando validación de variables"
fi

# ─── 6. Conectividad outbound al endpoint (sin auth) ────────────────────────

hdr "6. Conectividad outbound al endpoint S3"

if [[ -n "${ENDPOINT_VAL:-}" ]] && command -v curl >/dev/null 2>&1; then
  # GET sin credenciales debería retornar 403/400 (auth required) si llega
  # al endpoint. Eso confirma red OK. Cualquier exit ≠ 0 de curl o conexión
  # rechazada indica problema de red / firewall.
  # NOTA: usamos `if !` para no concatenar exit-fallback con el output
  # de %{http_code} (mismo bug que se arregló en smoke-prod.sh · 221d59f).
  if ! HTTP_CODE="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "https://${ENDPOINT_VAL}/" 2>/dev/null)"; then
    HTTP_CODE='000'
  fi
  case "$HTTP_CODE" in
    200|301|302|400|401|403)
      ok "Endpoint responde (HTTP $HTTP_CODE) · conectividad outbound OK"
      ;;
    000)
      fail "No se pudo conectar a $ENDPOINT_VAL · firewall outbound o DNS · resolver antes de activar cron"
      ;;
    *)
      warn "Endpoint respondió HTTP $HTTP_CODE · revisar manualmente"
      ;;
  esac
else
  info "Endpoint sin definir o curl ausente · skip conectividad"
fi

# ─── 7. Cron entry esperada ─────────────────────────────────────────────────

hdr "7. Cron entry"

if command -v crontab >/dev/null 2>&1; then
  if crontab -l 2>/dev/null | grep -q 'backup-offsite'; then
    CRON_LINE="$(crontab -l 2>/dev/null | grep 'backup-offsite' | head -1)"
    ok "Cron entry presente · $CRON_LINE"
  else
    info "No hay cron entry para backup-offsite · pendiente activar (DR-10)"
    info "Sugerencia: 0 3 * * * $SCRIPT_PATH >> /var/log/dypos-backup-offsite.log 2>&1"
  fi
else
  info "crontab no disponible en este entorno"
fi

# ─── Resumen ────────────────────────────────────────────────────────────────

echo
echo "─────────────────────────────────────────────"
echo "[INFO] Resumen: PASS=$PASS · WARN=$WARN · FAIL=$FAIL · INFO=$INFO"
echo "─────────────────────────────────────────────"

if [[ $FAIL -gt 0 ]]; then
  echo "Resultado: FAIL · resolver bloqueantes antes de activar el cron de DR-10"
  exit 1
fi
if [[ $WARN -gt 0 ]]; then
  echo "Resultado: WARN · revisar items marcados; no bloqueante"
fi
if [[ $WARN -eq 0 && $FAIL -eq 0 ]]; then
  echo "Resultado: OK · entorno listo (incluyendo lo que aún esté como INFO esperado)"
fi
exit 0
