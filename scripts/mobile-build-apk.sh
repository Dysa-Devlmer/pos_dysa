#!/usr/bin/env bash
# mobile-build-apk.sh — buildear APK release de POS Chile mobile localmente.
#
# Flujo:
#   1. Valida keystore.properties + local.properties (Android SDK path)
#   2. Lee version/versionCode de app.json (source of truth)
#   3. Inyecta en build.gradle antes del build (Expo managed → plugins.android
#      no toca build.gradle, hay que sincronizar manualmente)
#   4. ./gradlew assembleRelease
#   5. Copia APK a releases/ con nombre versionado
#
# Output: releases/pos-chile-v{VERSION}-vc{VERSION_CODE}.apk
# Uso:    ./scripts/mobile-build-apk.sh [--clean]

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

say()  { printf "${BLUE}▸${NC} %s\n" "$*"; }
ok()   { printf "${GREEN}✓${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}⚠${NC} %s\n" "$*"; }
err()  { printf "${RED}✗${NC} %s\n" "$*" >&2; exit 1; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CLEAN=0
[[ "${1:-}" == "--clean" ]] && CLEAN=1

ANDROID_DIR="$ROOT/apps/mobile/android"
APP_JSON="$ROOT/apps/mobile/app.json"
RELEASES_DIR="$ROOT/releases"

# ─── Validaciones ───────────────────────────────────────────────────────
[[ ! -d "$ANDROID_DIR" ]] && err "Falta apps/mobile/android/ — correr primero: cd apps/mobile && npx expo prebuild --platform android"
[[ ! -f "$ANDROID_DIR/keystore.properties" ]] && err "Falta $ANDROID_DIR/keystore.properties — copiar de keystore.properties.example y completar"
[[ ! -f "$APP_JSON" ]] && err "No encuentro $APP_JSON"

command -v jq >/dev/null || err "falta jq — brew install jq"
command -v java >/dev/null || err "falta java (JDK 17+) — brew install openjdk@17"

# ─── local.properties (Android SDK path) ────────────────────────────────
# Gradle necesita saber dónde está el Android SDK. Generamos local.properties
# automáticamente desde $ANDROID_HOME o el path default de Android Studio.
ANDROID_SDK="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
[[ ! -d "$ANDROID_SDK" ]] && err "No encuentro Android SDK en $ANDROID_SDK — setear ANDROID_HOME o instalar Android Studio"

cat > "$ANDROID_DIR/local.properties" <<EOF
# Auto-generado por mobile-build-apk.sh — no commitear
sdk.dir=$ANDROID_SDK
EOF

# ─── Sync version/versionCode desde app.json ────────────────────────────
# Expo regenera build.gradle en cada prebuild, pero cuando committeamos
# android/, el build.gradle queda estático. Sincronizamos manualmente.
VERSION=$(jq -r '.expo.version' "$APP_JSON")
VERSION_CODE=$(jq -r '.expo.android.versionCode' "$APP_JSON")

[[ "$VERSION" == "null" || ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] && err "expo.version inválido en app.json: $VERSION"
[[ "$VERSION_CODE" == "null" ]] && err "expo.android.versionCode no definido en app.json"

say "Sincronizando version $VERSION (code $VERSION_CODE) → build.gradle"
# macOS sed requiere '' después de -i; usar variante portable con backup temp.
GRADLE_FILE="$ANDROID_DIR/app/build.gradle"
sed -i.bak -E "s/versionCode [0-9]+/versionCode $VERSION_CODE/" "$GRADLE_FILE"
sed -i.bak -E "s/versionName \"[0-9]+\.[0-9]+\.[0-9]+\"/versionName \"$VERSION\"/" "$GRADLE_FILE"
rm -f "$GRADLE_FILE.bak"

# Verificar que el sed funcionó
grep -q "versionCode $VERSION_CODE" "$GRADLE_FILE" || err "No se pudo actualizar versionCode en build.gradle"
grep -q "versionName \"$VERSION\"" "$GRADLE_FILE" || err "No se pudo actualizar versionName en build.gradle"

# ─── Build ──────────────────────────────────────────────────────────────
cd "$ANDROID_DIR"

if [[ "$CLEAN" -eq 1 ]]; then
  say "Clean build — borrando caches gradle"
  ./gradlew clean
fi

say "Buildeando APK release (esto tarda 3-5 min la primera vez)…"
./gradlew assembleRelease

# ─── Copiar output ──────────────────────────────────────────────────────
APK_SRC="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
[[ ! -f "$APK_SRC" ]] && err "Gradle terminó OK pero no encuentro APK en $APK_SRC"

mkdir -p "$RELEASES_DIR"
APK_DEST="$RELEASES_DIR/pos-chile-v${VERSION}-vc${VERSION_CODE}.apk"
cp "$APK_SRC" "$APK_DEST"

APK_SIZE=$(du -h "$APK_DEST" | cut -f1)

printf "\n${GREEN}${BOLD}APK listo ✓${NC}\n"
printf "  Archivo : %s\n" "$APK_DEST"
printf "  Tamaño  : %s\n" "$APK_SIZE"
printf "  Versión : %s (versionCode %s)\n\n" "$VERSION" "$VERSION_CODE"
printf "Siguiente paso:\n"
printf "  ./scripts/mobile-publish-release.sh %s --notes 'Tu changelog aquí'\n\n" "$APK_DEST"
