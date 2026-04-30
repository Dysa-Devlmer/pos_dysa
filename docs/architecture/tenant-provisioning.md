# Tenant provisioning — SaaS dedicado (Camino C)

> **Modelo:** un cliente = un VPS dedicado = una BD = un dominio.
> **Script:** `scripts/provision-tenant.sh`.
> **ADR base:** `docs/adr/001-arquitectura-saas-deployment-dedicado.md`.
> **Migración futura a multi-tenant lógico:** `docs/adr/002-multi-tenant-future-migration.md`.

DyPos CL elige Camino C para el MVP comercial: cero acoplamiento de datos
entre clientes, simplicidad de troubleshooting, blast radius mínimo, y
permite operar contratos B2B chilenos donde el comercio quiere "su" servidor.

## 1. Cuándo invocar

Cada vez que se onboarda un cliente nuevo. Idempotente: re-correr no destruye
estado existente.

## 2. Pre-requisitos (Pierre)

1. VPS Vultr provisionado (Ubuntu 22.04 LTS, mín. 2 vCPU / 4GB RAM / 80GB).
2. DNS propio del cliente (ej. `pos.<empresa>.cl`) apuntando A → IP del VPS.
3. Subdominio para APK (`apk-<empresa>.zgamersa.com` o equivalente).
4. Cuenta SMTP (Gmail app password) para reset de pgadmin (opcional).
5. Sentry project creado (opcional, recomendado).
6. Acceso root al VPS vía SSH key.

## 3. Flujo del script

`scripts/provision-tenant.sh` ejecuta:

```
1. Validación inputs
   ├─ TENANT_NAME (slug)
   ├─ TENANT_DOMAIN
   ├─ VPS_IP
   └─ ADMIN_EMAIL inicial

2. SSH al VPS
   ├─ apt update + instala docker, docker-compose-plugin, nginx, certbot
   ├─ crea /opt/dypos-cl/ con permisos correctos
   └─ crea /var/backups/dypos-cl-db/ + /var/www/apks/{android,ios} (UID 1001)

3. Configurar nginx
   ├─ vhost <TENANT_DOMAIN> reverse-proxy a 127.0.0.1:3000
   ├─ vhost apk-<TENANT>.zgamersa.com sirve /var/www/apks/
   └─ habilita en sites-enabled

4. Cert SSL (Let's Encrypt)
   ├─ certbot --nginx -d <TENANT_DOMAIN>
   └─ renovación auto vía systemd timer

5. Generar .env.docker
   ├─ NEXTAUTH_SECRET = openssl rand -base64 32
   ├─ POSTGRES_PASSWORD = openssl rand
   ├─ PII_LOG_SALT = openssl rand
   └─ POS_DATABASE_URL = postgresql://...

6. Sembrar BD
   ├─ docker compose up -d postgres
   ├─ esperar healthy
   ├─ prisma migrate deploy
   └─ seed inicial (admin user, categoría default)

7. Levantar web
   ├─ docker compose up -d --build
   └─ healthcheck 12×10s

8. Smoke setup
   └─ verifica /api/health 200
```

## 4. Primer login

Tras el script, el admin del tenant entra con:

- Email: `<ADMIN_EMAIL>` (input al provisionar)
- Password: temporal generada — el script la imprime UNA SOLA VEZ al final.

Pierre debe:

1. Comunicarla al cliente por canal seguro (no email plano).
2. Forzar cambio en primer login (UI de perfil ya soporta `cambiarPassword`).

## 5. Estructura de archivos en el VPS

```
/opt/dypos-cl/
├── docker-compose.yml          # copia del repo
├── .env.docker                 # secretos del tenant (chmod 600)
├── apps/web/Dockerfile         # build context
└── packages/                   # build context

/var/backups/dypos-cl-db/       # dumps pg
/var/www/apks/                  # APKs publicadas
  ├─ android/
  └─ ios/
/etc/nginx/sites-available/<tenant>
/etc/letsencrypt/live/<tenant_domain>/
```

## 6. Aislamiento entre tenants

- Un tenant = un VPS. No hay datos compartidos.
- Sentry projects separados (cada tenant en su org/proyecto).
- Upstash Redis instances separadas (rate-limit no comparte buckets).
- Backups separados (no copy entre VPS).

## 7. Onboarding del cliente

Una vez que el script termina y el primer login funciona:

1. Pierre crea catálogo inicial (categorías, productos top) — opcionalmente
   importando CSV (feature pendiente, ver `decision-log.md`).
2. Configura cajeros (`/usuarios`).
3. Capacita al usuario admin (15-30 min).
4. Genera APK firmada y publica (`scripts/mobile-build-apk.sh` +
   `mobile-publish-release.sh`).

Detalle ops en `docs/m7-runbook.md`.

## 8. Offboarding (cliente baja)

1. **Pierre** descarga backup completo (BD + APKs + `.env.docker`).
2. Documenta en notebook de retención (compliance).
3. `docker compose down -v` para destruir volúmenes.
4. Snapshot final del VPS y luego destrucción.
5. DNS puntos al sinkhole o eliminación.

## 9. Multi-tenant futuro

Migrar a single-deployment-multi-tenant cuando el costo operativo de N VPS
se vuelva ineficiente (~30+ tenants estimado). Plan en
`docs/adr/002-multi-tenant-future-migration.md`. Hasta entonces:
**Camino C es la arquitectura oficial**.

## 10. Tareas Pierre vs agentes (provisioning)

| Tarea | Quién |
|-------|-------|
| Comprar VPS y configurar DNS | **Pierre** |
| Custodiar `.env.docker` y password admin temporal | **Pierre** |
| Iterar `provision-tenant.sh` | Agentes (con ADR si cambia el flujo) |
| Smoke post-provisioning | Agente con browser MCP |
| Capacitación del cliente | **Pierre** |

## 11. Gotchas (provisioning)

| Tag | Gotcha |
|-----|--------|
| TP-01 | UID 1001 (`nextjs` user del container) debe ser dueño de `/var/www/apks/`. |
| TP-02 | Cloudflare proxy OFF al inicio para que certbot valide HTTP-01. |
| TP-03 | Reusar deploy key entre tenants es aceptable; `~/.ssh/pos_deploy_ed25519`. |
| TP-04 | `NEXTAUTH_URL` debe coincidir con dominio HTTPS exacto (cookies). |
