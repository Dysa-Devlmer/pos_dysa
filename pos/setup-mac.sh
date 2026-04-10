#!/bin/bash

# ╔══════════════════════════════════════════════════╗
# ║     SISTEMA POS — INSTALACIÓN EN MAC            ║
# ╚══════════════════════════════════════════════════╝

RESET='\033[0m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'

DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║       SISTEMA POS — INSTALACIÓN EN MAC          ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${RESET}"
echo ""

# ──────────────────────────────────────────────────────
# DETECTAR ENTORNO
# ──────────────────────────────────────────────────────
ENTORNO=""
HTDOCS=""
MYSQL_BIN=""
URL=""

if [ -d "/Applications/MAMP/htdocs" ]; then
    ENTORNO="MAMP"
    HTDOCS="/Applications/MAMP/htdocs"
    MYSQL_BIN="/Applications/MAMP/Library/bin/mysql"
    URL="http://localhost:8888/pos"
    echo -e "${GREEN}[✔]${RESET} MAMP detectado"
fi

if command -v brew &>/dev/null && brew list | grep -q "php" 2>/dev/null; then
    ENTORNO="HOMEBREW"
    MYSQL_BIN="$(which mysql 2>/dev/null)"
    URL="http://localhost:8000"
    echo -e "${GREEN}[✔]${RESET} PHP Homebrew detectado"
fi

if [ -z "$ENTORNO" ]; then
    echo -e "${YELLOW}[!]${RESET} No se detectó MAMP ni PHP Homebrew."
    echo ""
    echo -e "${BOLD}Opciones disponibles:${RESET}"
    echo "  1) Instalar MAMP    → https://www.mamp.info/en/downloads/"
    echo "  2) Instalar via Homebrew: brew install php mysql"
    echo "  3) Docker (ver instrucciones abajo)"
    echo ""
fi

# ──────────────────────────────────────────────────────
# OPCIÓN A: MAMP
# ──────────────────────────────────────────────────────
if [ "$ENTORNO" = "MAMP" ]; then
    echo ""
    echo -e "${BOLD}[1/3]${RESET} Copiando proyecto a MAMP..."
    DESTINO="$HTDOCS/pos"
    mkdir -p "$DESTINO"
    cp -r "$DIR/." "$DESTINO/"
    echo -e "${GREEN}[✔]${RESET} Archivos copiados a $DESTINO"

    echo ""
    echo -e "${BOLD}[2/3]${RESET} Importando base de datos..."

    if [ -f "$MYSQL_BIN" ]; then
        "$MYSQL_BIN" -u root -proot \
            -e "CREATE DATABASE IF NOT EXISTS pos CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci;" 2>/dev/null

        "$MYSQL_BIN" -u root -proot pos < "$DESTINO/pos.sql" 2>/dev/null

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}[✔]${RESET} Base de datos importada correctamente"
        else
            echo -e "${YELLOW}[!]${RESET} Importa manualmente en phpMyAdmin:"
            echo "     http://localhost:8888/phpMyAdmin"
            echo "     → Crea DB 'pos' → Importa pos.sql"
        fi
    else
        echo -e "${YELLOW}[!]${RESET} Abre MAMP primero y luego importa manualmente:"
        echo "     phpMyAdmin → Nueva DB 'pos' → Importar → pos.sql"
    fi

    echo ""
    echo -e "${BOLD}[3/3]${RESET} Abriendo el sistema..."
    sleep 1
    open "$URL"

    echo ""
    echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════╗${RESET}"
    echo -e "${GREEN}${BOLD}║           ✔  INSTALACIÓN COMPLETA               ║${RESET}"
    echo -e "${GREEN}${BOLD}╠══════════════════════════════════════════════════╣${RESET}"
    echo -e "${GREEN}${BOLD}║  URL:       http://localhost:8888/pos            ║${RESET}"
    echo -e "${GREEN}${BOLD}║  Usuario:   admin                                ║${RESET}"
    echo -e "${GREEN}${BOLD}║  Password:  admin                                ║${RESET}"
    echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════╝${RESET}"

# ──────────────────────────────────────────────────────
# OPCIÓN B: PHP BUILT-IN SERVER (Homebrew o PHP nativo)
# ──────────────────────────────────────────────────────
elif [ "$ENTORNO" = "HOMEBREW" ]; then
    echo ""
    echo -e "${BOLD}[1/2]${RESET} Iniciando base de datos MySQL..."

    if command -v mysql &>/dev/null; then
        mysql -u root \
            -e "CREATE DATABASE IF NOT EXISTS pos CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci;" 2>/dev/null
        mysql -u root pos < "$DIR/pos.sql" 2>/dev/null
        echo -e "${GREEN}[✔]${RESET} Base de datos importada"
    else
        echo -e "${YELLOW}[!]${RESET} Importa la base de datos manualmente"
    fi

    echo ""
    echo -e "${BOLD}[2/2]${RESET} Iniciando servidor PHP en http://localhost:8000 ..."
    echo -e "${YELLOW}      (presiona Ctrl+C para detenerlo)${RESET}"
    echo ""
    open "http://localhost:8000"
    php -S localhost:8000 -t "$DIR" "$DIR/router.php"
fi
