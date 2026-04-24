#!/usr/bin/env bash
#
# Genera el keystore release de POS Chile Mobile.
#
# REGLA CRÍTICA: este script se ejecuta UNA SOLA VEZ en la vida del proyecto.
# Si pierdes el keystore generado aquí, pierdes la capacidad de publicar
# actualizaciones del mismo APK. Los usuarios tendrían que desinstalar y
# reinstalar — experiencia destructiva que espanta clientes.
#
# Qué hace:
#   1. Verifica que NO exista ya un keystore (protección anti-overwrite).
#   2. Pide al usuario los datos de identidad (nombre, org, ciudad).
#   3. Genera keystore release con keytool (RSA 2048, validez 10.000 días).
#   4. Setea permisos 600 (solo el dueño puede leer).
#   5. Crea backup cifrado en iCloud Drive.
#   6. Imprime el siguiente paso (registrar password en password manager).
#
# Ubicación del keystore: ~/.android-keystores/pos-chile-release.keystore
#   → Fuera del repo git (cero riesgo de commit accidental).
#   → Fuera de Dropbox/Google Drive en plaintext (solo copia cifrada).
#
# Ver docs/mobile-release-runbook.md para el workflow completo.

set -euo pipefail

# ── Paths ────────────────────────────────────────────────────────────────────
KEYSTORE_DIR="$HOME/.android-keystores"
KEYSTORE_NAME="pos-chile-release.keystore"
KEYSTORE_PATH="$KEYSTORE_DIR/$KEYSTORE_NAME"
KEY_ALIAS="pos-chile"
VALIDITY_DAYS=10000  # ~27 años — Google recomienda mínimo 25

# Backup cifrado en iCloud Drive (si está disponible)
ICLOUD_DIR="$HOME/Library/Mobile Documents/com~apple~CloudDocs/Keystores"

# ── Colores ──────────────────────────────────────────────────────────────────
red()    { printf '\033[0;31m%s\033[0m\n' "$*"; }
green()  { printf '\033[0;32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[0;33m%s\033[0m\n' "$*"; }
blue()   { printf '\033[0;34m%s\033[0m\n' "$*"; }

# ── Checks previos ───────────────────────────────────────────────────────────
if ! command -v keytool >/dev/null 2>&1; then
  red "❌ keytool no encontrado. Instala Java (JDK 17+)."
  red "   brew install openjdk@17"
  exit 1
fi

if [[ -f "$KEYSTORE_PATH" ]]; then
  red "❌ ABORT: ya existe un keystore en $KEYSTORE_PATH"
  red "   Si realmente quieres regenerarlo (PERDERÁS la identidad actual):"
  red "   mv \"$KEYSTORE_PATH\" \"$KEYSTORE_PATH.backup-\$(date +%s)\""
  red ""
  red "   Pero piénsalo DOS veces — si ya publicaste APKs con este keystore,"
  red "   rotarlo significa que ningún usuario existente podrá recibir updates."
  exit 1
fi

# ── Prompt de datos ──────────────────────────────────────────────────────────
blue "═══════════════════════════════════════════════════════════════════════"
blue "  POS Chile Mobile — Generador de keystore release"
blue "═══════════════════════════════════════════════════════════════════════"
echo ""
yellow "⚠️  Este keystore es la IDENTIDAD CRIPTOGRÁFICA de la app."
yellow "    Si lo pierdes → no puedes publicar updates nunca más."
yellow "    Si alguien lo roba → puede publicar malware con tu firma."
echo ""
yellow "📋 Antes de continuar, ten abierto tu password manager"
yellow "    (1Password, Bitwarden, etc). Vas a guardar 2 passwords ahí."
echo ""
read -p "¿Continuar? [y/N] " -n 1 -r REPLY
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  red "Cancelado."
  exit 0
fi

echo ""
blue "── Datos de identidad (aparecen en el certificado) ───────────────"
read -p "Nombre completo o razón social: " CN
read -p "Unidad organizacional (ej: 'Desarrollo'): " OU
read -p "Organización (ej: 'Dysa SpA'): " O
read -p "Ciudad (ej: 'Santiago'): " L
read -p "Estado/Región (ej: 'Region Metropolitana'): " ST
read -p "Código de país (2 letras, ej: 'CL'): " C

DNAME="CN=$CN, OU=$OU, O=$O, L=$L, ST=$ST, C=$C"
echo ""
blue "📝 DNAME: $DNAME"
echo ""
read -p "¿Correcto? [y/N] " -n 1 -r REPLY
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  red "Cancelado. Ejecuta el script nuevamente."
  exit 0
fi

# ── Generación ───────────────────────────────────────────────────────────────
mkdir -p "$KEYSTORE_DIR"
chmod 700 "$KEYSTORE_DIR"

echo ""
blue "🔐 keytool te pedirá 2 passwords:"
blue "   1. Store password (protege el archivo keystore)"
blue "   2. Key password (protege el alias '$KEY_ALIAS' dentro del keystore)"
yellow "   RECOMENDACIÓN: usa el MISMO password para ambos (Android lo prefiere)."
yellow "   Genera uno fuerte con: openssl rand -base64 24"
echo ""

keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore "$KEYSTORE_PATH" \
  -alias "$KEY_ALIAS" \
  -keyalg RSA -keysize 2048 \
  -validity "$VALIDITY_DAYS" \
  -dname "$DNAME"

chmod 600 "$KEYSTORE_PATH"

green ""
green "✅ Keystore generado:"
green "   $KEYSTORE_PATH"
echo ""

# ── Verificación ─────────────────────────────────────────────────────────────
blue "🔍 Verificando keystore..."
keytool -list -v -keystore "$KEYSTORE_PATH" -alias "$KEY_ALIAS" 2>/dev/null | grep -E "(Alias|Valid|SHA256)" | head -5 || true
echo ""

# ── Backup iCloud ────────────────────────────────────────────────────────────
if [[ -d "$HOME/Library/Mobile Documents/com~apple~CloudDocs" ]]; then
  mkdir -p "$ICLOUD_DIR"
  cp "$KEYSTORE_PATH" "$ICLOUD_DIR/$KEYSTORE_NAME"
  chmod 600 "$ICLOUD_DIR/$KEYSTORE_NAME"
  green "✅ Backup creado en iCloud Drive:"
  green "   $ICLOUD_DIR/$KEYSTORE_NAME"
  yellow "   ⚠️  iCloud cifra en tránsito y en reposo, PERO el archivo es"
  yellow "       legible por cualquiera con acceso a tu cuenta iCloud."
  yellow "       El password del keystore es la protección real."
else
  yellow "⚠️  iCloud Drive no detectado. Haz backup manual del keystore a:"
  yellow "    - Un disco externo cifrado"
  yellow "    - Google Drive / Dropbox (el archivo está protegido por password)"
fi

# ── Fingerprint para registrar en password manager ───────────────────────────
echo ""
blue "── Fingerprint SHA-256 del certificado (para verificación futura) ──"
keytool -list -v -keystore "$KEYSTORE_PATH" -alias "$KEY_ALIAS" 2>/dev/null | grep "SHA256:" | head -1 || true
echo ""

# ── Próximos pasos ───────────────────────────────────────────────────────────
green "═══════════════════════════════════════════════════════════════════════"
green "  ✅ Fase 1 completa. Próximos pasos:"
green "═══════════════════════════════════════════════════════════════════════"
cat <<EOF

  1. Abre tu password manager (1Password / Bitwarden / etc) y crea una
     entrada con este contenido:

     ┌─────────────────────────────────────────────────────────────┐
     │ Título:     POS Chile Mobile — Android Keystore            │
     │ Tipo:       Secure Note                                    │
     │ Campos:                                                    │
     │   - keystore_path: $KEYSTORE_PATH
     │   - alias:         $KEY_ALIAS
     │   - store_password: <el password que ingresaste>           │
     │   - key_password:   <el password que ingresaste>           │
     │   - sha256: <pegar fingerprint de arriba>                  │
     │   - icloud_backup: $ICLOUD_DIR/$KEYSTORE_NAME
     │   - validity_until: $(date -v +${VALIDITY_DAYS}d '+%Y-%m-%d' 2>/dev/null || date -d "+${VALIDITY_DAYS} days" '+%Y-%m-%d' 2>/dev/null || echo 'calcular +27 años')
     └─────────────────────────────────────────────────────────────┘

  2. Cuando quieras buildear un APK release, el script de build leerá
     las credenciales desde un .env local (nunca en el repo).

     Ver: docs/mobile-release-runbook.md — Fase 5

  3. Ahora puedes proceder a Fase 2 (update checker in-app).
     Dile a Cowork: "Fase 1 completa, sigue Fase 2".

EOF
