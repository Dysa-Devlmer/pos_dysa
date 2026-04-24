#!/usr/bin/env bash
# mobile-publish-release.sh — publicar un APK nuevo de POS Chile mobile.
#
# Flujo:
#   1. Valida .env.mobile.publish + que el APK ya exista
#   2. Lee version + versionCode de app.json
#   3. Sube el APK a R2 con nombre versionado (pos-chile-v1.0.1-vc2.apk)
#   4. POST a /api/mobile/manifest con los metadatos → flip isLatest atómico en la DB
#   5. Verifica que GET /api/mobile/manifest devuelva la nueva versión
#
# Uso:
#   ./scripts/mobile-publish-release.sh path/to/app-release.apk [--notes "Changelog"]
#
# Requiere: aws CLI (brew install awscli), jq, curl.
# Por qué aws CLI: R2 es S3-compatible y aws CLI es el camino más probado.
# Autenticación: variable AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY no sirven con
#   Cloudflare API Tokens — usamos `aws configure` con el token como "access key"
#   vía el endpoint --endpoint-url de Cloudflare. Ver:
#   https://developers.cloudflare.com/r2/examples/aws/aws-cli/

set -euo pipefail

# ─── Colores ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

say()  { printf "${BLUE}▸${NC} %s\n" "$*"; }
ok()   { printf "${GREEN}✓${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}⚠${NC} %s\n" "$*"; }
err()  { printf "${RED}✗${NC} %s\n" "$*" >&2; exit 1; }

# ─── Root del repo ──────────────────────────────────────────────────────
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# ─── Parseo args ────────────────────────────────────────────────────────
APK_PATH="${1:-}"
NOTES=""
MIN_VERSION=""

shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --notes)       NOTES="$2"; shift 2 ;;
    --min-version) MIN_VERSION="$2"; shift 2 ;;
    *) err "Flag desconocido: $1" ;;
  esac
done

[[ -z "$APK_PATH" ]] && err "Uso: $0 <ruta-al-apk> [--notes 'texto'] [--min-version X.Y.Z]"
[[ ! -f "$APK_PATH" ]] && err "APK no existe: $APK_PATH"

# ─── Env ────────────────────────────────────────────────────────────────
ENV_FILE="$ROOT/.env.mobile.publish"
[[ ! -f "$ENV_FILE" ]] && err "Falta $ENV_FILE — copiá scripts/mobile-publish-release.example.env y completá"
# shellcheck source=/dev/null
set -a; . "$ENV_FILE"; set +a

for v in CLOUDFLARE_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET_NAME R2_PUBLIC_URL API_BASE_URL; do
  [[ -z "${!v:-}" ]] && err "Variable $v vacía en $ENV_FILE"
done

# El User API Token (cfut_...) no sirve para S3 — avisar si alguien lo pegó aquí.
[[ "$R2_ACCESS_KEY_ID" == cfut_* ]] && err "R2_ACCESS_KEY_ID parece ser un User API Token (cfut_...). Para S3 necesitás un R2 API Token → genera uno en R2 → Manage R2 API tokens."
[[ ${#R2_ACCESS_KEY_ID} -ne 32 ]] && warn "R2_ACCESS_KEY_ID tiene ${#R2_ACCESS_KEY_ID} chars (se esperan 32). Puede fallar el upload."

# ─── Dependencias ───────────────────────────────────────────────────────
command -v aws  >/dev/null || err "falta aws CLI — instalá con: brew install awscli"
command -v jq   >/dev/null || err "falta jq — brew install jq"
command -v curl >/dev/null || err "falta curl"

# ─── Leer version de app.json ───────────────────────────────────────────
APP_JSON="$ROOT/apps/mobile/app.json"
VERSION=$(jq -r '.expo.version' "$APP_JSON")
VERSION_CODE=$(jq -r '.expo.android.versionCode' "$APP_JSON")

[[ "$VERSION" == "null" || -z "$VERSION" ]] && err "No pude leer .expo.version de $APP_JSON"
[[ "$VERSION_CODE" == "null" || -z "$VERSION_CODE" ]] && err "No pude leer .expo.android.versionCode de $APP_JSON"

# Semver check
[[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] && err "version inválida en app.json: '$VERSION' (se espera X.Y.Z)"

APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
OBJECT_KEY="pos-chile-v${VERSION}-vc${VERSION_CODE}.apk"

# ─── Resumen + confirmación ─────────────────────────────────────────────
printf "\n${BOLD}Publicar release mobile${NC}\n"
printf "  Versión     : %s (versionCode %s)\n" "$VERSION" "$VERSION_CODE"
printf "  APK local   : %s (%s)\n" "$APK_PATH" "$APK_SIZE"
printf "  R2 key      : %s\n" "$OBJECT_KEY"
printf "  URL pública : %s/%s\n" "$R2_PUBLIC_URL" "$OBJECT_KEY"
printf "  Notes       : %s\n" "${NOTES:-<ninguna>}"
printf "  minVersion  : %s\n" "${MIN_VERSION:-<ninguno — update opcional>}"
printf "  API         : %s\n\n" "$API_BASE_URL"

read -r -p "Escribí 'publicar' para continuar: " CONFIRM
[[ "$CONFIRM" != "publicar" ]] && err "Cancelado"

# ─── Admin token ────────────────────────────────────────────────────────
if [[ -z "${ADMIN_API_TOKEN:-}" ]]; then
  say "ADMIN_API_TOKEN no está en $ENV_FILE"
  read -r -s -p "Pegá el Bearer token admin (stdin silencioso): " ADMIN_API_TOKEN
  printf "\n"
  [[ -z "$ADMIN_API_TOKEN" ]] && err "Token vacío"
fi

# ─── Upload a R2 vía aws CLI ────────────────────────────────────────────
say "Subiendo APK a R2…"
R2_ENDPOINT="https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"

# Credenciales S3-compatibles del R2 API Token (Access Key ID + Secret Access Key).
# Son 32-hex y 64-hex respectivamente — NO confundir con el User API Token cfut_...
AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
AWS_DEFAULT_REGION="auto" \
aws s3 cp "$APK_PATH" "s3://${R2_BUCKET_NAME}/${OBJECT_KEY}" \
  --endpoint-url "$R2_ENDPOINT" \
  --content-type "application/vnd.android.package-archive" \
  --no-progress

ok "APK subido → ${R2_PUBLIC_URL}/${OBJECT_KEY}"

# ─── POST al manifest ───────────────────────────────────────────────────
APK_URL="${R2_PUBLIC_URL}/${OBJECT_KEY}"

say "Publicando manifest en backend…"
PAYLOAD=$(jq -n \
  --arg platform "ANDROID" \
  --arg version "$VERSION" \
  --argjson versionCode "$VERSION_CODE" \
  --arg apkUrl "$APK_URL" \
  --arg notes "$NOTES" \
  --arg minVersion "$MIN_VERSION" \
  '{platform: $platform, version: $version, versionCode: $versionCode, apkUrl: $apkUrl}
   + (if $notes == "" then {} else {notes: $notes} end)
   + (if $minVersion == "" then {} else {minVersion: $minVersion} end)')

HTTP_CODE=$(curl -s -o /tmp/manifest-response.json -w "%{http_code}" \
  -X POST "$API_BASE_URL/api/mobile/manifest" \
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

if [[ "$HTTP_CODE" != "201" ]]; then
  cat /tmp/manifest-response.json
  err "Manifest POST falló (HTTP $HTTP_CODE). El APK quedó en R2 pero el backend no lo registró."
fi

ok "Manifest publicado"

# ─── Verificación ───────────────────────────────────────────────────────
say "Verificando GET público…"
sleep 1  # darle un instante al CDN si hay edge cache
REMOTE_VERSION=$(curl -s "$API_BASE_URL/api/mobile/manifest?platform=ANDROID" | jq -r '.version // "null"')

if [[ "$REMOTE_VERSION" != "$VERSION" ]]; then
  warn "GET devolvió version='$REMOTE_VERSION' (esperado '$VERSION') — puede ser cache CDN. Revisar en 5 min."
else
  ok "Backend reporta latest = $VERSION"
fi

printf "\n${GREEN}${BOLD}Release publicado ✓${NC}\n"
printf "  Los usuarios verán el banner de update en los próximos 5 min (staleTime React Query).\n"
printf "  Al abrir la app → tocar banner → Linking.openURL abre %s\n\n" "$APK_URL"
