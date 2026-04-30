# External setup checklist — DyPos CL (Fase 2A)

> **Para:** Pierre Benites Solier (Dyon Labs)
> **Generado:** 2026-04-30 — Fase 2A
> **Propósito:** Lista exhaustiva de pasos operacionales que **solo Pierre
> puede ejecutar** porque requieren credenciales (Cloudflare, GitHub,
> UptimeRobot, provider backups, device físico). El agente NO los toca.

Cada sección incluye: precondiciones, comandos exactos, validación, y
qué reportar al agente para cerrar el item en `decision-log.md`.

---

## 1. DNS Cloudflare — `apk-dypos.zgamersa.com` → VPS

**Precondición:** VPS de DyPos CL (IP fija) operativo con `pos-web`
corriendo en :3000 y nginx escuchando :80/:443.

**Pasos en Cloudflare UI** (`zgamersa.com` zone):

1. Login a Cloudflare → seleccionar zona `zgamersa.com`.
2. **DNS → Records → Add record:**
   - Type: `A`
   - Name: `apk-dypos`
   - IPv4 address: `<IP_VPS>` (mismo del dominio principal de DyPos CL)
   - Proxy status: **DNS only** (gris) — primero validar HTTP-01 sin
     proxy. Activar proxy después de SSL OK.
   - TTL: Auto.
3. Save.

**Validación (desde tu máquina):**

```bash
dig +short apk-dypos.zgamersa.com
# debe retornar la IP del VPS
```

**Reportar al agente:** "DNS apk-dypos resuelve a <IP>".

---

## 2. SSL Let's Encrypt — `apk-dypos.zgamersa.com`

**Precondición:** DNS del paso 1 propagado (verificar con `dig`).
**Importante:** Cloudflare proxy debe estar **OFF** durante este paso
(certbot HTTP-01 challenge requiere acceso directo al origin). Activar
proxy después.

**Comando en VPS (SSH):**

```bash
ssh root@<IP_VPS>
certbot --nginx -d apk-dypos.zgamersa.com \
  --non-interactive --agree-tos -m admin@dypos.cl
```

**Validación:**

```bash
curl -I https://apk-dypos.zgamersa.com/
# debe retornar 200 (o 403 si /var/www/apks/ vacío — esperado)
# Y NO debe haber warning de cert inválido
```

Renovación automática ya queda configurada vía systemd timer
(`systemctl list-timers | grep certbot`).

**Después:** Activar Cloudflare proxy (nube naranja) en el record DNS
del paso 1. Modo SSL: **Full (strict)** — origin tiene cert válido.

**Reportar al agente:** "SSL OK en apk-dypos, proxy Cloudflare activo".

---

## 3. Validar descarga real de APK pública

**Precondición:** pasos 1 + 2 completos. APK ya publicada en
`/var/www/apks/android/<nombre>.apk` (via `scripts/mobile-publish-release.sh`).

**Validación end-to-end:**

```bash
# Desde tu máquina o desde un cliente externo:
curl -I https://apk-dypos.zgamersa.com/android/dypos-cl-vX.Y.Z.apk
# Esperado: 200 OK + Content-Type: application/vnd.android.package-archive

# Descargar y verificar SHA256:
curl -O https://apk-dypos.zgamersa.com/android/dypos-cl-vX.Y.Z.apk
sha256sum dypos-cl-vX.Y.Z.apk
# Comparar contra el SHA reportado en /api/mobile/manifest:
curl https://<dypos_dominio>/api/mobile/manifest
```

**Reportar:** "APK descargable con SHA correcto".

---

## 4. Branch protection — `main` (DR-01)

**Pasos en GitHub UI** (`Dysa-Devlmer/pos_dysa`):

1. Settings → Branches → Branch protection rules → **Add rule**.
2. Branch name pattern: `main`.
3. Activar:
   - ☑ **Require a pull request before merging**
     - Required approvals: **1**
     - ☑ Dismiss stale pull request approvals when new commits are pushed
   - ☑ **Require status checks to pass before merging**
     - ☑ Require branches to be up to date before merging
     - Status checks que deben pasar (buscar y agregar):
       - `web (type-check + lint + test + build)`
       - `mobile (type-check + lint + test)`
   - ☑ **Require linear history** (recomendado — evita merge commits)
   - ☑ **Do not allow bypassing the above settings**
     - **Excepción para Pierre:** dejar tu cuenta como `Bypass list` solo
       si necesitas push directo en emergencias. Lo recomendado es NO
       agregar bypass — usar PR siempre.
4. **NO activar:**
   - "Allow force pushes" — DEBE quedar OFF.
   - "Allow deletions" — DEBE quedar OFF.
5. Save changes.

**Validación:**

```bash
# Intento de push directo a main desde branch local debería fallar:
git checkout -b test-protection
git commit --allow-empty -m "test"
git push origin test-protection:main
# Esperado: rejected — protected branch
git push origin --delete test-protection 2>/dev/null
```

**Reportar:** "Branch protection main activa, status checks web+mobile required".

---

## 5. UptimeRobot — monitor `/api/health` (DR-06)

**Provider:** UptimeRobot (free tier — 50 monitors, intervalo mínimo 5min).
Alternativa: BetterStack (free 10 monitors, status page incluida).

**Pasos UptimeRobot:**

1. Login en https://uptimerobot.com (crear cuenta si no existe).
2. **Add New Monitor:**
   - Monitor Type: `HTTP(s)`
   - Friendly Name: `DyPos CL — health`
   - URL: `https://dy-pos.zgamersa.com/api/health`
     (o el dominio prod del tenant — ajustar)
   - Monitoring Interval: `5 minutes`
   - **Advanced Settings:**
     - HTTP Method: `GET`
     - **Keyword Monitoring:** activar
       - Keyword Type: `exists`
       - Keyword Value: `"status":"ok"`
       - (Nota: `/api/health` retorna JSON
         `{"status":"ok","database":"connected","version":"2.0.0",...}`
         — verificado en prod. Si UptimeRobot tiene problemas matcheando
         JSON compacto, fallback aceptable: solo HTTP 200.)
     - HTTP status codes considered up: `200`
3. **Alert Contacts to Notify:** seleccionar/crear contacto email
   (`pierre@dyonlabs.cl` o equivalente).
4. Create Monitor.

**Configuración recomendada (todos los tenants):**

| Setting | Valor |
|---------|-------|
| Type | HTTP(s) |
| Interval | 5 min |
| Keyword | `"status":"ok"` |
| HTTP method | GET |
| Timeout | 30s |
| Alert when down for | 1 ciclo (5 min) |
| Notification channels | Email + (opcional) Slack/WhatsApp |

**Multi-tenant:** repetir 1 monitor por tenant. UptimeRobot free permite
50 monitors → suficiente hasta 50 tenants.

**Validación:** desde el VPS, parar el container temporalmente y verificar
que llega alerta en <10 min:

```bash
ssh root@<IP_VPS> 'docker stop pos-web'
# esperar alerta UptimeRobot
ssh root@<IP_VPS> 'docker start pos-web'
```

**Reportar:** "UptimeRobot monitor creado, alerta validada en email".

---

## 6. Off-site backup BD (DR-10)

**Estado actual:** `scripts/deploy.sh` hace dump local pre-deploy + rota
14 dumps en `/var/backups/dypos-cl-db/`. **NO** hay copy off-site.

**Decisión pendiente — Pierre elige provider:**

| Provider | Costo | Ventajas |
|----------|-------|----------|
| **Backblaze B2** | ~$6/TB/mes | Más barato, S3-compatible API |
| **AWS S3** | ~$23/TB/mes | Estándar industria, integración amplia |
| **Wasabi** | ~$7/TB/mes | Sin egress fees, S3-compatible |
| **Cloudflare R2** | ~$15/TB/mes | Sin egress, integración nativa con CF |

**Recomendación agente:** Backblaze B2 por costo y simplicidad
S3-compatible.

**Una vez decidido el provider:**

1. Pierre crea bucket dedicado (`dypos-cl-backups-<tenant>`).
2. Pierre genera Application Key con scope **solo write** al bucket.
3. Pierre comparte credenciales (key id + secret) por canal seguro.
4. Agente integra `scripts/backup-offsite.sh` (ya preparado como template,
   ver §7).

**Política propuesta:**

- Local pre-deploy: 14 dumps (ya existente).
- Off-site nightly: cron `0 3 * * *` en VPS → upload a bucket con
  retención 30 días.
- Off-site weekly: snapshot dominical retenido 12 semanas.
- Restore test: mensual, manual, registrado en
  `memory/projects/pos-chile-monorepo.md`.

**Reportar al agente:** "Provider X elegido, credentials disponibles en
`.env.docker` como `OFFSITE_BACKUP_*`".

---

## 7. Resumen de credenciales que Pierre custodia

| Credencial | Dónde vive | Quién accede |
|-----------|-----------|--------------|
| SSH deploy key (`pos_deploy_ed25519`) | `~/.ssh/` Pierre + `authorized_keys` VPS | Pierre + agentes con permiso |
| `.env.docker` VPS | `/opt/pos-chile/.env.docker` chmod 600 | Solo Pierre |
| `NEXTAUTH_SECRET` | `.env.docker` | Solo Pierre |
| `POS_DATABASE_URL` (password) | `.env.docker` | Solo Pierre |
| `SENTRY_DSN` web | `.env.docker` | Solo Pierre |
| `SENTRY_DSN` mobile (DR-12) | `app.json` o `.env` mobile | Solo Pierre |
| Cloudflare API token | Cloudflare dashboard | Solo Pierre |
| GitHub token (CI deploy) | GitHub Settings → Tokens | Solo Pierre |
| UptimeRobot login | uptimerobot.com | Solo Pierre |
| Off-site backup keys (DR-10) | `.env.docker` | Solo Pierre |
| Keystore Android release | `~/Dropbox/.../<keystore>.jks` | Solo Pierre |
| Keystore password | password manager Pierre | Solo Pierre |

**Regla:** El agente **nunca** ve, lee, ni transmite estas credenciales.
Si necesita una operación que las requiera, prepara el comando exacto
para que Pierre lo ejecute.

---

## 8. Estado al cierre Fase 2A

| Item | Estado | Responsable |
|------|--------|-------------|
| 1. DNS apk-dypos | 🟡 pendiente Pierre | Pierre |
| 2. SSL apk-dypos | 🟡 depende del 1 | Pierre |
| 3. Validar APK pública | 🟡 depende del 2 | Pierre + agente smoke |
| 4. Branch protection main (DR-01) | 🟡 pendiente Pierre | Pierre |
| 5. UptimeRobot (DR-06) | 🟡 pendiente Pierre | Pierre |
| 6. Off-site backup (DR-10) | 🟡 decisión + script | Pierre + agente |
| `scripts/backup-offsite.sh` template | ✅ preparado | Agente (Fase 2A) |
| nginx vhost apk-dypos | ✅ existe en VPS (Fase 0.5) | Agente (cerrado) |
| Bind mount `/var/www/apks` | ✅ docker-compose.yml | Agente (cerrado) |
| `decision-log.md` DR-11/DR-12 | ✅ documentado | Agente (Fase 2A) |
| Este checklist | ✅ creado | Agente (Fase 2A) |

---

_Última actualización: 2026-04-30 — Fase 2A._
