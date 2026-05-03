#!/usr/bin/env bash
# scripts/smoke-prod.sh — Smoke prod automatizado (Fase 3D · DR-07).
#
# Verifica que un tenant en producción está sirviendo correctamente las
# rutas críticas. Diseñado para correrse:
#   1. Manualmente desde la máquina del agente / Pierre tras cada deploy.
#   2. (Futuro) Automáticamente al final de scripts/deploy.sh — pendiente
#      autorización Pierre por el riesgo bajo de tocar prod con curl.
#
# === DISEÑO ===
# - 100 % READ-ONLY. NO crea ventas, NO modifica datos, NO ensucia
#   AuditLog. La única "escritura" lateral es el contador de rate-limit
#   en Redis/memoria, que es no-issue.
# - Sin deps externas: solo bash + curl + jq (jq opcional).
# - Idempotente: corra cuántas veces quieras.
# - Exit code 0 si todo OK, 1 si cualquier check falla.
#
# === USO ===
#   # Smoke básico (solo health + login page; sin credenciales):
#   ./scripts/smoke-prod.sh https://dy-pos.zgamersa.com
#
#   # Smoke completo con auth (requiere ENV con credenciales del tenant):
#   SMOKE_ADMIN_EMAIL='admin@cliente.cl' \
#   SMOKE_ADMIN_PASSWORD='xxx' \
#   ./scripts/smoke-prod.sh https://cliente.dypos.zgamersa.com --with-auth
#
# === SEGURIDAD ===
# - Las credenciales NUNCA se hardcodean. Solo via env (no via arg de CLI
#   que aparecería en `ps`).
# - Si --with-auth está activo y faltan creds → fail-fast con mensaje.
# - El JWT recibido se mantiene solo en variable local; no se persiste.
# - Sin --with-auth, el smoke no necesita creds del tenant — útil para
#   monitoreo externo simple.
#
# === SALIDA ===
# Cada check imprime una línea con prefijo `[OK]` o `[FAIL]` y una
# descripción. Resumen final con conteo. Compatible con grep para CI.

set -uo pipefail

# ─── Args y validación ──────────────────────────────────────────────────────

if [[ $# -lt 1 ]]; then
  echo "Uso: $0 <URL_BASE> [--with-auth]" >&2
  echo "  URL_BASE: ej. https://dy-pos.zgamersa.com (sin trailing /)" >&2
  echo "  --with-auth: agrega tests autenticados (requiere SMOKE_ADMIN_EMAIL/PASSWORD)" >&2
  exit 2
fi

BASE_URL="${1%/}"  # Strip trailing slash si lo hubiera.
WITH_AUTH=0
if [[ "${2:-}" == "--with-auth" ]]; then
  WITH_AUTH=1
fi

if [[ ! "$BASE_URL" =~ ^https?:// ]]; then
  echo "[smoke-prod] ERROR: URL_BASE debe empezar con http:// o https://" >&2
  exit 2
fi

# ─── Estado ─────────────────────────────────────────────────────────────────

PASS=0
FAIL=0
START_TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Todos los logs van a stderr para no contaminar la salida que las
# funciones devuelven por stdout (el path del body file capturado vía
# command substitution).
ok()    { echo "[OK]   $*" >&2; PASS=$((PASS+1)); }
fail()  { echo "[FAIL] $*" >&2; FAIL=$((FAIL+1)); }
info()  { echo "[INFO] $*" >&2; }

info "smoke-prod inicio · base=$BASE_URL · with_auth=$WITH_AUTH · ts=$START_TS"

# ─── Helpers de curl ────────────────────────────────────────────────────────
#
# Usamos --max-time 15 para no colgarnos contra un endpoint zombie.
# --silent + --output a tmp para inspeccionar status + body por separado.

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# Las funciones NO devuelven el body por stdout — eso obliga a capturar
# vía `$(...)`, que crea un subshell donde los increments de PASS/FAIL
# se pierden. En su lugar, usan la variable global LAST_BODY con la ruta
# al archivo de respuesta. Cada call la sobreescribe.
LAST_BODY=""

# curl_check: GET, valida status code esperado.
# Args: <ETIQUETA> <URL> <STATUS_ESPERADO>
curl_check() {
  local label="$1" url="$2" expected="$3"
  LAST_BODY="$TMP_DIR/$RANDOM.body"
  local code
  if ! code="$(curl -sS -o "$LAST_BODY" -w '%{http_code}' --max-time 15 "$url")"; then
    code='000'
  fi
  if [[ "$code" == "$expected" ]]; then
    ok "$label → HTTP $code"
  else
    fail "$label → HTTP $code (esperado $expected) [$url]"
  fi
}

# curl_post_json: POST con JSON, valida status. Args: <LABEL> <URL> <JSON> <STATUS>
curl_post_json() {
  local label="$1" url="$2" json="$3" expected="$4"
  LAST_BODY="$TMP_DIR/$RANDOM.body"
  local code
  if ! code="$(curl -sS -o "$LAST_BODY" -w '%{http_code}' --max-time 15 \
    -H 'Content-Type: application/json' \
    -X POST -d "$json" "$url")"; then
    code='000'
  fi
  if [[ "$code" == "$expected" ]]; then
    ok "$label → HTTP $code"
  else
    fail "$label → HTTP $code (esperado $expected) [$url]"
  fi
}

# curl_bearer: GET con Authorization: Bearer, valida status. Args: <LABEL> <URL> <JWT> <STATUS>
curl_bearer() {
  local label="$1" url="$2" jwt="$3" expected="$4"
  LAST_BODY="$TMP_DIR/$RANDOM.body"
  local code
  if ! code="$(curl -sS -o "$LAST_BODY" -w '%{http_code}' --max-time 15 \
    -H "Authorization: Bearer $jwt" "$url")"; then
    code='000'
  fi
  if [[ "$code" == "$expected" ]]; then
    ok "$label → HTTP $code"
  else
    fail "$label → HTTP $code (esperado $expected) [$url]"
  fi
}

# ─── Check 1: /api/health (público) ─────────────────────────────────────────

curl_check 'GET /api/health' "$BASE_URL/api/health" 200

if [[ -s "$LAST_BODY" ]]; then
  if grep -q '"status":"ok"' "$LAST_BODY"; then
    ok 'health body contiene status:ok'
  else
    fail "health body no contiene status:ok (body: $(head -c 200 "$LAST_BODY"))"
  fi
  if grep -q '"database":"connected"' "$LAST_BODY"; then
    ok 'health body confirma database:connected'
  else
    fail "health body no confirma database:connected"
  fi
fi

# ─── Check 2: /login (página pública, no requiere sesión) ───────────────────

curl_check 'GET /login' "$BASE_URL/login" 200

# ─── Check 3: /privacidad (debe ser pública por App Store) ──────────────────

curl_check 'GET /privacidad' "$BASE_URL/privacidad" 200

# ─── Check 4: rutas autenticadas redirigen sin sesión ──────────────────────
#
# Estos endpoints NO deben servir contenido sin login. curl no sigue el
# redirect (sin -L) → vemos 307/302/303. Cualquier 200 acá sería leak.

if ! REDIRECT_BODY="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$BASE_URL/perfil")"; then
  REDIRECT_BODY='000'
fi
case "$REDIRECT_BODY" in
  302|303|307|308) ok "GET /perfil sin sesión → HTTP $REDIRECT_BODY (gate OK)" ;;
  *) fail "GET /perfil sin sesión → HTTP $REDIRECT_BODY (debería redirigir)" ;;
esac

# ─── Smoke autenticado (opcional) ───────────────────────────────────────────

if [[ $WITH_AUTH -eq 1 ]]; then
  if [[ -z "${SMOKE_ADMIN_EMAIL:-}" || -z "${SMOKE_ADMIN_PASSWORD:-}" ]]; then
    fail '--with-auth requiere SMOKE_ADMIN_EMAIL y SMOKE_ADMIN_PASSWORD en env'
  else
    info "Auth check con email=${SMOKE_ADMIN_EMAIL%@*}@***"

    # Login stateless mobile API → JWT en body. Construimos el JSON con
    # python3 si está disponible (escape seguro de comillas) — fallback
    # textual escapando solo `"`.
    if command -v python3 >/dev/null 2>&1; then
      LOGIN_JSON="$(SMOKE_ADMIN_EMAIL="$SMOKE_ADMIN_EMAIL" \
        SMOKE_ADMIN_PASSWORD="$SMOKE_ADMIN_PASSWORD" \
        python3 -c 'import json,os; print(json.dumps({"email": os.environ["SMOKE_ADMIN_EMAIL"], "password": os.environ["SMOKE_ADMIN_PASSWORD"]}))')"
    else
      LOGIN_JSON="$(printf '{"email":"%s","password":"%s"}' \
        "${SMOKE_ADMIN_EMAIL//\"/\\\"}" \
        "${SMOKE_ADMIN_PASSWORD//\"/\\\"}")"
    fi

    curl_post_json 'POST /api/v1/auth/login' \
      "$BASE_URL/api/v1/auth/login" "$LOGIN_JSON" 200

    JWT=''
    if [[ -s "$LAST_BODY" ]]; then
      # Extracción simple del JWT sin requerir jq instalado.
      JWT="$(grep -oE '"token":"[^"]+"' "$LAST_BODY" | head -1 | sed 's/"token":"//;s/"$//')"
    fi

    if [[ -n "$JWT" ]]; then
      ok 'login response incluye token'

      # Endpoint autenticado: dashboard. Read-only — no muta nada.
      curl_bearer 'GET /api/v1/dashboard (authed)' \
        "$BASE_URL/api/v1/dashboard" "$JWT" 200

      # Endpoint autenticado: productos.
      curl_bearer 'GET /api/v1/productos (authed)' \
        "$BASE_URL/api/v1/productos" "$JWT" 200

      # Sanity: header malformado → 401.
      if ! BAD_AUTH="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 \
        -H 'Authorization: NotBearer xxx' "$BASE_URL/api/v1/dashboard")"; then
        BAD_AUTH='000'
      fi
      if [[ "$BAD_AUTH" == '401' ]]; then
        ok 'auth header inválido → HTTP 401 (correcto)'
      else
        fail "auth header inválido → HTTP $BAD_AUTH (esperado 401)"
      fi
    else
      fail 'login response no incluye token (revisar credenciales o response shape)'
    fi
  fi
fi

# ─── Resumen ────────────────────────────────────────────────────────────────

END_TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo
echo "─────────────────────────────────────────────"
info "smoke-prod fin · ts=$END_TS"
info "PASS=$PASS · FAIL=$FAIL"
echo "─────────────────────────────────────────────"

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
exit 0
