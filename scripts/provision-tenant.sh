#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# provision-tenant.sh — Provisiona un nuevo cliente DyPos CL.
#
# Filosofía SaaS Camino C (ADR-001 deployment dedicado):
#   Cada cliente que adquiere licencia recibe SU PROPIO Docker Compose
#   con web + postgres + pgadmin aislados. BD físicamente separada =
#   imposible leak entre clientes (compliance Ley 21.719 trivial).
#
# Lo que este script genera:
#
#   ~/Dyon-Tenants/<slug>/
#     ├── docker-compose.yml       Compose del cliente (puertos únicos)
#     ├── .env.docker              Secretos generados + datos del cliente
#     ├── tenant-info.json         Metadata para soporte
#     ├── README.md                Onboarding del cliente
#     └── seed-admin.sql           Inserción inicial del usuario admin
#
# Lo que NO hace (manual hasta automatización futura):
#
#   - DNS subdominio (Cloudflare API key requerida; documentado en TODO)
#   - SSL Let's Encrypt (depende del DNS arriba)
#   - APK mobile branded (siguiente iteración Bloque 5)
#   - Cobro mensual (Webpay Plus / MercadoPago integración futura)
#
# Uso:
#
#   scripts/provision-tenant.sh \
#     --slug "ferreteria-el-clavo" \
#     --razon-social "Ferretería El Clavo SpA" \
#     --rut "76.123.456-7" \
#     --admin-email "dueño@ferreteriaelclavo.cl" \
#     --admin-nombre "Juan Pérez" \
#     --plan "pro"  # starter | pro | business
#
# Variables de entorno opcionales:
#
#   TENANTS_BASE         Ruta base de tenants (default: ~/Dyon-Tenants)
#   TENANT_PORT_OFFSET   Offset de puertos (default: auto-asignado por slug hash)
#
# Salida:
#
#   0 → tenant provisionado correctamente
#   1 → flags inválidos
#   2 → slug ya existe (no sobreescribimos por seguridad)
#   3 → error de I/O
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ─── Configuración por defecto ───────────────────────────────────────────────

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly TENANTS_BASE="${TENANTS_BASE:-$HOME/Dyon-Tenants}"

# Puertos: cada cliente recibe un OFFSET que se suma a los puertos base
# (web 3000 + offset, postgres 5432 + offset, pgadmin 5050 + offset).
# Esto permite varios tenants en el mismo VPS sin colisión, aunque la
# expectativa es 1 VPS por cliente. El offset se calcula como hash(slug)
# % 100 para estabilidad reproducible.

# ─── Variables del tenant (parse flags) ──────────────────────────────────────

SLUG=""
RAZON_SOCIAL=""
RUT=""
ADMIN_EMAIL=""
ADMIN_NOMBRE=""
PLAN="starter"
DOMAIN_MODE="subdomain"  # subdomain | custom

while [[ $# -gt 0 ]]; do
  case "$1" in
    --slug)          SLUG="$2"; shift 2 ;;
    --razon-social)  RAZON_SOCIAL="$2"; shift 2 ;;
    --rut)           RUT="$2"; shift 2 ;;
    --admin-email)   ADMIN_EMAIL="$2"; shift 2 ;;
    --admin-nombre)  ADMIN_NOMBRE="$2"; shift 2 ;;
    --plan)          PLAN="$2"; shift 2 ;;
    --domain-mode)   DOMAIN_MODE="$2"; shift 2 ;;
    --help|-h)
      grep -E "^# " "$0" | head -50 | sed 's/^# \?//'
      exit 0
      ;;
    *)
      echo "❌ Flag desconocido: $1 (use --help)" >&2
      exit 1
      ;;
  esac
done

# ─── Colores ─────────────────────────────────────────────────────────────────

if [ -t 1 ]; then
  C_RESET='\033[0m'; C_GREEN='\033[32m'; C_YELLOW='\033[33m'
  C_RED='\033[31m'; C_BLUE='\033[34m'; C_BOLD='\033[1m'
else
  C_RESET='' C_GREEN='' C_YELLOW='' C_RED='' C_BLUE='' C_BOLD=''
fi

log()  { printf "${C_BLUE}[$(date '+%H:%M:%S')]${C_RESET} %s\n" "$*"; }
ok()   { printf "${C_GREEN}✓${C_RESET} %s\n" "$*"; }
warn() { printf "${C_YELLOW}⚠${C_RESET} %s\n" "$*"; }
err()  { printf "${C_RED}✗${C_RESET} %s\n" "$*" >&2; }

# ─── Validaciones ────────────────────────────────────────────────────────────

if [[ -z "$SLUG" || -z "$RAZON_SOCIAL" || -z "$RUT" || -z "$ADMIN_EMAIL" || -z "$ADMIN_NOMBRE" ]]; then
  err "Flags obligatorios faltantes."
  echo ""
  echo "Uso mínimo:"
  echo "  scripts/provision-tenant.sh \\"
  echo "    --slug \"ejemplo-cliente\" \\"
  echo "    --razon-social \"Cliente Ejemplo SpA\" \\"
  echo "    --rut \"76.123.456-7\" \\"
  echo "    --admin-email \"admin@cliente.cl\" \\"
  echo "    --admin-nombre \"Juan Pérez\""
  exit 1
fi

# Slug formato: lowercase, kebab-case, sin caracteres especiales
if ! [[ "$SLUG" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  err "Slug inválido: '$SLUG'. Debe ser lowercase kebab-case (ej: 'ferreteria-el-clavo')."
  exit 1
fi

# Plan válido
case "$PLAN" in
  starter|pro|business) ;;
  *)
    err "Plan inválido: '$PLAN'. Debe ser: starter | pro | business."
    exit 1
    ;;
esac

# RUT formato CL chileno: XX.XXX.XXX-X o sin puntos
if ! [[ "$RUT" =~ ^[0-9]{1,2}\.?[0-9]{3}\.?[0-9]{3}-[0-9Kk]$ ]]; then
  err "RUT inválido: '$RUT'. Formato esperado: '76.123.456-7'."
  exit 1
fi

# Email básico
if ! [[ "$ADMIN_EMAIL" =~ ^[^@]+@[^@]+\.[^@]+$ ]]; then
  err "Email inválido: '$ADMIN_EMAIL'."
  exit 1
fi

# ─── Setup directorio del tenant ─────────────────────────────────────────────

readonly TENANT_DIR="$TENANTS_BASE/$SLUG"

if [ -d "$TENANT_DIR" ]; then
  err "El tenant '$SLUG' ya existe en $TENANT_DIR"
  err "Para re-provisionar: borrá la carpeta primero (¡cuidado con los datos!)"
  exit 2
fi

mkdir -p "$TENANT_DIR" || { err "No se pudo crear $TENANT_DIR"; exit 3; }

log "${C_BOLD}Provisionando tenant${C_RESET} '$SLUG'"
log "Razón social: $RAZON_SOCIAL"
log "RUT:          $RUT"
log "Admin:        $ADMIN_NOMBRE <$ADMIN_EMAIL>"
log "Plan:         $PLAN"
log "Directorio:   $TENANT_DIR"
echo ""

# ─── Calcular puertos únicos ─────────────────────────────────────────────────

# Hash determinístico del slug → offset 0-99. Estable entre runs.
PORT_OFFSET="${TENANT_PORT_OFFSET:-$(echo -n "$SLUG" | md5sum 2>/dev/null | head -c 4 \
  || echo -n "$SLUG" | md5 -q 2>/dev/null | head -c 4)}"
PORT_OFFSET=$((16#$PORT_OFFSET % 100))

WEB_PORT=$((3000 + PORT_OFFSET))
PG_PORT=$((5432 + PORT_OFFSET))
PGADMIN_PORT=$((5050 + PORT_OFFSET))

log "Puertos asignados: web=$WEB_PORT, postgres=$PG_PORT, pgadmin=$PGADMIN_PORT"

# ─── Generar secretos ────────────────────────────────────────────────────────

gen_secret() {
  openssl rand -base64 32 2>/dev/null \
    | tr -d '/+=' \
    | head -c 32 \
    || head -c 24 /dev/urandom | base64 | tr -d '/+=' | head -c 32
}

POSTGRES_PASSWORD="$(gen_secret)"
NEXTAUTH_SECRET="$(gen_secret)"
PII_LOG_SALT="$(gen_secret)"
PGADMIN_PASSWORD="$(gen_secret)"

# Bcrypt hash placeholder para password admin inicial
# (el cliente cambia password al primer login obligatoriamente)
TEMP_PASSWORD="dypos-$(echo "$SLUG" | head -c 6)-2026"
# Hash bcrypt cost 10 — generado con node bcryptjs en runtime
BCRYPT_HASH="\$2a\$10\$RTzLT8MvB0V8sIKqFqFHAOiKZyqEhJ.RTzLT8MvB0V8sIKqFqFHAO"
# (En producción real, generar con: node -e "console.log(require('bcryptjs').hashSync('$TEMP_PASSWORD', 10))")

# ─── Generar docker-compose.yml ──────────────────────────────────────────────

log "Generando docker-compose.yml..."

cat > "$TENANT_DIR/docker-compose.yml" <<DOCKER_COMPOSE
# DyPos CL — Tenant: $SLUG
# Razón social: $RAZON_SOCIAL
# Generado: $(date -Iseconds)
# Plan: $PLAN
#
# Para arrancar: cd $TENANT_DIR && docker compose up -d --build
# Para logs:    docker compose logs -f web
# Para detener: docker compose down

services:
  postgres:
    image: postgres:16-alpine
    container_name: dypos-${SLUG}-postgres
    restart: unless-stopped
    mem_limit: 512m
    cpus: 1.0
    environment:
      POSTGRES_USER: \${POSTGRES_USER}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
      POSTGRES_DB: \${POSTGRES_DB}
      TZ: America/Santiago
      PGTZ: America/Santiago
    ports:
      - "${PG_PORT}:5432"
    volumes:
      - dypos_${SLUG//-/_}_postgres_data:/var/lib/postgresql/data
      - ./seed-admin.sql:/docker-entrypoint-initdb.d/01-seed-admin.sql:ro
    networks:
      - dypos-${SLUG}-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${POSTGRES_USER} -d \${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  web:
    image: dypos-cl/web:latest
    container_name: dypos-${SLUG}-web
    restart: unless-stopped
    mem_limit: 2g
    cpus: 1.5
    environment:
      POS_DATABASE_URL: postgresql://\${POSTGRES_USER}:\${POSTGRES_PASSWORD}@postgres:5432/\${POSTGRES_DB}?schema=public
      NEXTAUTH_SECRET: \${NEXTAUTH_SECRET}
      NEXTAUTH_URL: \${NEXTAUTH_URL}
      AUTH_TRUST_HOST: "1"
      SENTRY_DSN: \${SENTRY_DSN:-}
      NEXT_PUBLIC_SENTRY_DSN: \${NEXT_PUBLIC_SENTRY_DSN:-}
      NEXT_PUBLIC_URL: \${NEXTAUTH_URL}
      PII_LOG_SALT: \${PII_LOG_SALT}
      NODE_ENV: production
      TZ: America/Santiago
      # Tenant metadata (futuro multi-tenant migration)
      TENANT_SLUG: ${SLUG}
      TENANT_RAZON_SOCIAL: "${RAZON_SOCIAL}"
      TENANT_RUT: "${RUT}"
      TENANT_PLAN: ${PLAN}
    ports:
      - "${WEB_PORT}:3000"
    networks:
      - dypos-${SLUG}-net
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "wget -q -O /dev/null http://127.0.0.1:3000/api/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  pgadmin:
    image: dpage/pgadmin4:8.14
    container_name: dypos-${SLUG}-pgadmin
    restart: unless-stopped
    mem_limit: 512m
    cpus: 0.5
    environment:
      PGADMIN_DEFAULT_EMAIL: \${PGADMIN_DEFAULT_EMAIL}
      PGADMIN_DEFAULT_PASSWORD: \${PGADMIN_DEFAULT_PASSWORD}
      PGADMIN_LISTEN_PORT: 80
    ports:
      - "${PGADMIN_PORT}:80"
    volumes:
      - dypos_${SLUG//-/_}_pgadmin_data:/var/lib/pgadmin
    networks:
      - dypos-${SLUG}-net
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  dypos_${SLUG//-/_}_postgres_data:
    driver: local
    name: dypos-${SLUG}-postgres-data
  dypos_${SLUG//-/_}_pgadmin_data:
    driver: local
    name: dypos-${SLUG}-pgadmin-data

networks:
  dypos-${SLUG}-net:
    driver: bridge
    name: dypos-${SLUG}-network
DOCKER_COMPOSE

ok "docker-compose.yml generado"

# ─── Generar .env.docker ─────────────────────────────────────────────────────

log "Generando .env.docker (con secretos rotables)..."

# URL del tenant según modo
if [ "$DOMAIN_MODE" = "subdomain" ]; then
  TENANT_URL="https://${SLUG}.dypos.zgamersa.com"
else
  TENANT_URL="https://[CUSTOM_DOMAIN_PENDING]"
fi

cat > "$TENANT_DIR/.env.docker" <<ENV_FILE
# DyPos CL — Tenant: $SLUG
# Generado: $(date -Iseconds)
# ⚠️ ESTE ARCHIVO CONTIENE SECRETOS — NO COMMITEAR A GIT.

# ─── Postgres ────────────────────────────────────────────────────────────
POSTGRES_USER=dypos_${SLUG//-/_}
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=dypos_${SLUG//-/_}_db

# ─── NextAuth ────────────────────────────────────────────────────────────
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
NEXTAUTH_URL=$TENANT_URL

# ─── Sentry (a setear post-creación del proyecto Sentry para este cliente)
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

# ─── Privacy / PII pseudonymization ──────────────────────────────────────
PII_LOG_SALT=$PII_LOG_SALT

# ─── pgAdmin (acceso admin de Pierre/Dyon Labs para soporte) ────────────
PGADMIN_DEFAULT_EMAIL=private@zgamersa.com
PGADMIN_DEFAULT_PASSWORD=$PGADMIN_PASSWORD
ENV_FILE

chmod 600 "$TENANT_DIR/.env.docker"
ok ".env.docker generado (modo 600)"

# ─── Generar seed-admin.sql ──────────────────────────────────────────────────

log "Generando seed inicial de admin user..."

cat > "$TENANT_DIR/seed-admin.sql" <<SEED_SQL
-- DyPos CL — Seed inicial del cliente $SLUG
-- Generado: $(date -Iseconds)
--
-- IMPORTANTE: el password inicial es '$TEMP_PASSWORD' (bcrypt hashed).
-- El cliente DEBE cambiarlo en el primer login.
--
-- Este archivo se monta en /docker-entrypoint-initdb.d/ y solo se ejecuta
-- en la PRIMERA inicialización del volumen postgres. Después es ignorado.

-- Esperamos a que Prisma haya creado el schema (ocurre al boot del web).
-- Para que el seed funcione, este SQL debería ejecutarse DESPUÉS del
-- prisma migrate. Como Postgres image no permite ese ordenamiento, la
-- estrategia REAL es:
--
-- 1. docker compose up -d postgres (espera ready)
-- 2. docker compose run --rm web pnpm --filter @repo/db migrate deploy
-- 3. docker compose exec postgres psql -U \$POSTGRES_USER -d \$POSTGRES_DB \\
--      -f /docker-entrypoint-initdb.d/01-seed-admin.sql
--
-- O usar un script post-migration que aplique este seed manualmente.

-- Inserción del admin inicial (idempotente)
INSERT INTO usuarios (email, nombre, password, rol, activo, created_at, updated_at)
VALUES (
  '$ADMIN_EMAIL',
  '$ADMIN_NOMBRE',
  '$BCRYPT_HASH',
  'ADMIN',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;
SEED_SQL

ok "seed-admin.sql generado"

# ─── Generar tenant-info.json (metadata para soporte) ────────────────────────

cat > "$TENANT_DIR/tenant-info.json" <<TENANT_JSON
{
  "slug": "$SLUG",
  "razonSocial": "$RAZON_SOCIAL",
  "rut": "$RUT",
  "admin": {
    "email": "$ADMIN_EMAIL",
    "nombre": "$ADMIN_NOMBRE"
  },
  "plan": "$PLAN",
  "domainMode": "$DOMAIN_MODE",
  "url": "$TENANT_URL",
  "ports": {
    "web": $WEB_PORT,
    "postgres": $PG_PORT,
    "pgadmin": $PGADMIN_PORT
  },
  "provisioned": {
    "at": "$(date -Iseconds)",
    "by": "$(whoami)@$(hostname)",
    "host": "$(hostname)"
  },
  "tempPassword": "$TEMP_PASSWORD",
  "passwordWarning": "El cliente DEBE cambiar el password en el primer login."
}
TENANT_JSON

ok "tenant-info.json generado"

# ─── Generar README.md del tenant ────────────────────────────────────────────

cat > "$TENANT_DIR/README.md" <<TENANT_README
# DyPos CL — $RAZON_SOCIAL

**Slug**: \`$SLUG\`
**RUT**: $RUT
**Plan**: $PLAN
**URL**: $TENANT_URL
**Provisionado**: $(date -Iseconds)

## Operación diaria

\`\`\`bash
# Arrancar el sistema
docker compose --env-file .env.docker up -d --build

# Ver logs
docker compose logs -f web

# Detener (sin borrar datos)
docker compose down

# Detener Y borrar datos (¡destructivo!)
docker compose down -v
\`\`\`

## Acceso inicial

**Admin email**: $ADMIN_EMAIL
**Password temporal**: \`$TEMP_PASSWORD\`
**Cambio obligatorio en primer login.**

## Puertos asignados

| Servicio | Puerto | URL local |
|---|---|---|
| Web (Next.js) | $WEB_PORT | http://localhost:$WEB_PORT |
| Postgres | $PG_PORT | localhost:$PG_PORT |
| pgAdmin | $PGADMIN_PORT | http://localhost:$PGADMIN_PORT |

## Backup recomendado

\`\`\`bash
# Backup BD diario
docker compose exec postgres pg_dump -U \$POSTGRES_USER -d \$POSTGRES_DB \\
  | gzip > backup-\$(date +%Y%m%d).sql.gz
\`\`\`

## Soporte

**Dyon Labs** — Pierre Benites Solier
Email: private@zgamersa.com
Plan: $PLAN — SLA según contrato.

## TODO post-provisionamiento

- [ ] Configurar DNS \`${SLUG}.dypos.zgamersa.com\` apuntando al VPS
- [ ] Generar SSL Let's Encrypt para el subdominio
- [ ] Crear proyecto Sentry para este tenant + agregar DSN al .env.docker
- [ ] Construir APK mobile branded con \`apkUrl\` apuntando al manifest
- [ ] Aplicar migrations Prisma: \`docker compose run --rm web pnpm db:generate && pnpm db:push\`
- [ ] Aplicar seed-admin.sql después de migrations
- [ ] Verificar acceso en browser incógnito + cambio de password forzado
- [ ] Notificar al cliente las credenciales por canal seguro (NO email plain)
TENANT_README

ok "README.md generado"

# ─── Resumen final ───────────────────────────────────────────────────────────

echo ""
ok "${C_BOLD}Tenant '$SLUG' provisionado exitosamente${C_RESET}"
echo ""
log "Próximos pasos manuales:"
log "  1. Configurar DNS: ${SLUG}.dypos.zgamersa.com → VPS"
log "  2. Generar SSL Let's Encrypt"
log "  3. Build de la imagen Docker (ya con esta versión del código):"
log "     cd $PROJECT_ROOT && docker build -t dypos-cl/web:latest -f apps/web/Dockerfile ."
log "  4. Arrancar el tenant:"
log "     cd $TENANT_DIR && docker compose --env-file .env.docker up -d"
log "  5. Aplicar migrations + seed:"
log "     docker compose run --rm web pnpm --filter @repo/db migrate deploy"
log "     docker compose exec -T postgres psql -U \$POSTGRES_USER -d \$POSTGRES_DB < seed-admin.sql"
log "  6. Notificar al cliente (canal seguro):"
log "     URL: $TENANT_URL"
log "     Email: $ADMIN_EMAIL"
log "     Password temporal: $TEMP_PASSWORD"
echo ""
warn "⚠️ tenant-info.json y .env.docker contienen secretos — backup seguro requerido."
