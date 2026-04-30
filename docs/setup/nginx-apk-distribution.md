# Distribución de APKs — nginx vhost

> Setup del subdominio `apk-dypos.zgamersa.com` en el VPS Vultr para
> servir los APKs publicados desde `/dashboard/mobile-releases`.

## Contexto

El UI admin `/dashboard/mobile-releases` (Bloque 5 SaaS pivot 2026-04-30)
guarda APKs en el filesystem del server bajo `APK_STORAGE_DIR` (default
`/var/www/apks/`). Para que la app móvil pueda descargarlos, nginx debe
servir esa carpeta como pública en el subdominio
`apk-dypos.zgamersa.com`.

## Arquitectura

```
┌──────────────────────────────────────────────────────────────┐
│  App móvil (en device del usuario)                            │
│   1. Abre app → consulta /api/mobile/manifest                │
│   2. Recibe { apkUrl: "https://apk-dypos.zgamersa.com/.../X.apk" } │
│   3. Si hay update → user toca "Actualizar"                  │
│   4. Browser baja el APK desde el subdominio                 │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  Cloudflare DNS                                               │
│    apk-dypos.zgamersa.com → IP del VPS Vultr (proxied SSL)   │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  VPS Vultr                                                    │
│   nginx vhost:                                                │
│     listen 443 ssl                                            │
│     server_name apk-dypos.zgamersa.com                       │
│     root /var/www/apks/                                       │
│     location / {                                              │
│       autoindex off                                           │
│       allow all                                               │
│     }                                                         │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  Filesystem del VPS:                                          │
│   /var/www/apks/                                              │
│     android/                                                  │
│       dypos-cl-v1.0.4-build5.apk                              │
│       dypos-cl-v1.0.5-build6.apk                              │
│     ios/                                                      │
│       (manual TestFlight URLs, no APK directos)               │
└──────────────────────────────────────────────────────────────┘
```

## Setup paso a paso

### 1. DNS en Cloudflare

Login → zone `zgamersa.com` → DNS → Add record:

```
Type:    A
Name:    apk-dypos
Content: <IP-PUBLICA-VPS>  (la misma que dy-pos.zgamersa.com)
TTL:     Auto
Proxy:   ON (icono naranja activo) — usa Cloudflare CDN
```

### 2. nginx vhost en el VPS

SSH al VPS (`ssh root@64.176.21.229` típicamente) y crear vhost:

```bash
sudo nano /etc/nginx/sites-available/apk-dypos
```

Contenido:

```nginx
# /etc/nginx/sites-available/apk-dypos
# DyPos CL — distribución de APKs

server {
    listen 80;
    listen [::]:80;
    server_name apk-dypos.zgamersa.com;

    # Cloudflare maneja el SSL en su edge (Full mode). Si querés
    # SSL real en el origin, usar certbot abajo.
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name apk-dypos.zgamersa.com;

    # SSL cert (Let's Encrypt). Generar con:
    # sudo certbot --nginx -d apk-dypos.zgamersa.com
    ssl_certificate /etc/letsencrypt/live/apk-dypos.zgamersa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/apk-dypos.zgamersa.com/privkey.pem;

    # Storage de los APKs
    root /var/www/apks;

    # No mostrar listing del directorio (seguridad — los APKs se acceden
    # solo via URL exacta del manifest).
    autoindex off;

    # Logs separados para tracking de descargas (KPI: cuántos updates
    # toman los usuarios).
    access_log /var/log/nginx/apk-access.log;
    error_log /var/log/nginx/apk-error.log;

    # Servir archivos APK con MIME type correcto
    location ~ \.apk$ {
        types {
            application/vnd.android.package-archive apk;
        }
        # Forzar download (no abrir en browser)
        add_header Content-Disposition 'attachment';
        # Cache larga — los APKs son inmutables (versionCode único)
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Health check para monitoring
    location /health {
        access_log off;
        return 200 "OK\n";
        add_header Content-Type text/plain;
    }

    # Bloquear todo lo que no sea .apk o /health
    location / {
        return 404;
    }
}
```

### 3. Crear filesystem + permisos

```bash
sudo mkdir -p /var/www/apks/android /var/www/apks/ios
sudo chown -R www-data:www-data /var/www/apks
sudo chmod 755 /var/www/apks
sudo chmod 755 /var/www/apks/android /var/www/apks/ios
```

### 4. Generar SSL Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx  # si no está
sudo certbot --nginx -d apk-dypos.zgamersa.com --email private@zgamersa.com --agree-tos
```

certbot edita el vhost automáticamente para apuntar a los certs Let's
Encrypt + agrega renovación automática.

### 5. Activar vhost + reload nginx

```bash
sudo ln -s /etc/nginx/sites-available/apk-dypos /etc/nginx/sites-enabled/
sudo nginx -t                    # validar config
sudo systemctl reload nginx      # aplicar
```

### 6. Conectar el container `pos-web` al filesystem del host

El container Docker de `pos-web` necesita poder ESCRIBIR a `/var/www/apks/`
desde adentro (cuando el admin sube APK via `/dashboard/mobile-releases`).
Hay 2 formas:

**Opción A — Bind mount (más simple)**

En el `docker-compose.yml` del cliente:

```yaml
services:
  web:
    # ... resto de config
    volumes:
      - /var/www/apks:/var/www/apks  # bind mount con permisos 755
    environment:
      APK_STORAGE_DIR: /var/www/apks
      APK_PUBLIC_BASE_URL: https://apk-dypos.zgamersa.com
```

⚠️ El usuario que corre el container (`nextjs` UID 1001) debe tener
permiso de escritura en `/var/www/apks/` del host. Setup:

```bash
sudo chown -R 1001:1001 /var/www/apks
```

**Opción B — Cloudflare R2 (escalable, futuro)**

Cuando crezca el volumen de APKs (ej. >50 clientes, >100 GB), migrar a:

- Cloudflare R2 bucket público con dominio custom `apk-dypos.zgamersa.com`
- Server actions usan `@aws-sdk/client-s3` con creds R2 para upload
- nginx vhost se elimina, R2 sirve directo via su edge

Eso queda como [ADR-003 cuando llegue el momento].

## Variables de entorno requeridas

En `.env.docker` del cliente (o `.env` del demo):

```bash
APK_STORAGE_DIR=/var/www/apks
APK_PUBLIC_BASE_URL=https://apk-dypos.zgamersa.com
```

Sin estas variables, el server actions usan defaults (mismas URLs)
pero el bind mount nginx no funciona.

## Verificación end-to-end

1. Login en `dy-pos.zgamersa.com` con admin.
2. Navegar a `/mobile-releases`.
3. Subir un APK pequeño (< 5 MB) con version `0.0.1` versionCode `1`.
4. Confirmar que aparece en la lista con badge "latest".
5. Abrir `https://apk-dypos.zgamersa.com/android/dypos-cl-v0.0.1-build1.apk`
   en browser → debe descargar el APK.
6. App móvil hace GET `/api/mobile/manifest` → `apkUrl` apunta al
   subdominio.
7. Tap "Actualizar" en banner → browser abre, baja APK, instala.

## Rotación / cleanup

APKs viejos NO tienen GC automático. Cuando se publican muchas releases
(>20 por plataforma), considerar:

- Cron diario que borre APKs no-latest con > 90 días de antigüedad.
- O bien, mantener todos por compliance (un usuario con app vieja debe
  poder descargar su versión específica si necesita reinstalar).

Recomendación SaaS Camino C: mantener todos los APKs por al menos 1 año.
Storage es barato; permitir downgrade en caso de bug crítico es valioso.

## Troubleshooting

| Síntoma | Causa probable | Fix |
|---|---|---|
| App no descarga, error "Connection refused" | DNS no propagado o vhost no activo | `dig apk-dypos.zgamersa.com` + `sudo nginx -t` |
| 403 Forbidden | Permisos filesystem | `sudo chown -R 1001:1001 /var/www/apks` |
| 404 al descargar APK específico | El archivo no existe en disk | Verificar con `ls /var/www/apks/android/` que el `<filename>.apk` esté |
| MIME type wrong, browser muestra texto | Falta `types` block en nginx | Verificar `location ~ \.apk$` block |
| SSL handshake fail | Certificado vencido o mal configurado | `sudo certbot renew` |

## Backup recomendado

Los APKs se regeneran fácil (subiendo de nuevo desde `/mobile-releases`),
pero los uploads históricos pueden perderse si el VPS se cae. Backup
recomendado:

```bash
# Cron diario en el VPS
0 2 * * * tar czf /tmp/apks-backup-$(date +\%Y\%m\%d).tar.gz /var/www/apks/ \
  && rclone copy /tmp/apks-backup-*.tar.gz r2:dypos-backups/apks/ \
  && find /tmp/apks-backup-*.tar.gz -mtime +7 -delete
```

(asumiendo `rclone` con remote R2 configurado).
