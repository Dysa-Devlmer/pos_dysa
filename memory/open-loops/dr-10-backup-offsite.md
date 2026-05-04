---
title: DR-10 — Backup off-site BD
date: 2026-05-03
status: active
priority: high
owner: Pierre
tags:
  - open-loop
  - operacion
  - backup
  - disaster-recovery
  - compliance
---

# DR-10 — Backup off-site BD

## Contexto

`scripts/deploy.sh` hace `pg_dump` pre-deploy automático y rota 14
copias en `/var/backups/dypos-cl-db/` del VPS. Si el VPS se pierde
completo (DDoS, suspensión de cuenta Vultr, disco corrupto), los 14
dumps se van con él.

No hay copia diaria off-site (S3-compatible). Eso bloquea:

- SLA serio de RPO con clientes B2B.
- Compliance si se exige retención fuera del proveedor único.
- Disaster recovery real a VPS distinto.

## Estado actual de los artefactos

| Pieza | Estado | Ubicación |
|---|---|---|
| Backup pre-deploy local automático | ✅ activo | `scripts/deploy.sh` fase 5a-bis |
| Rotación 14 dumps locales | ✅ activo | mismo script |
| Script template upload off-site (S3-compatible) | ✅ implementado | `scripts/backup-offsite.sh` (165 líneas) |
| Validación: el script falla rápido si faltan env vars | ✅ verificado | exit 3 con mensaje claro |
| SHA256 + metadata en upload | ✅ implementado | en el script |
| Runbook restore (local + off-site + DR) | ✅ implementado (Fase 3D) | `docs/operations/runbook-backup-restore.md` |
| Procedimiento UI de setup external | ✅ documentado | `docs/operations/external-setup-checklist.md` §6 |
| Precheck pre-credenciales (Fase 3D.2) | ✅ implementado | `scripts/backup-offsite-precheck.sh` — read-only, sin credenciales. Verifica tooling, paths, perms .env.docker, formato de vars, conectividad outbound, cron entry. Exit 0 = listo / 1 = bloqueante. |
| Provider elegido | ❌ pendiente | — |
| Bucket creado con encryption SSE | ❌ pendiente | — |
| Application Key con scope write-only | ❌ pendiente | — |
| Variables `OFFSITE_BACKUP_*` en `.env.docker` del tenant | ❌ pendiente | — |
| awscli instalado en VPS prod | ❌ pendiente | `apt-get install -y awscli` |
| Cron diario activo | ❌ pendiente | `0 3 * * *` |
| Lifecycle policy del bucket (retención 30 días) | ❌ pendiente | — |
| Test de restore mensual ejercitado | ❌ pendiente | runbook §6 |

## Por qué alta prioridad

- Sin off-site, RPO = "infinito" si pierdes el VPS. RTO sin off-site
  = "imposible" (no hay desde dónde restaurar).
- El script ya está listo. La inversión faltante es solo cuenta +
  bucket + cron — no hay código nuevo.
- Compliance Ley 21.719 facilita la defensa legal si hay incidente y
  se puede demostrar retención de datos en proveedor secundario.

## Criterio de cierre

- [ ] Pierre eligió provider (recomendado por costo/latencia CL):
  Backblaze B2 > Wasabi > Cloudflare R2 > AWS S3. Ver §6 de
  `external-setup-checklist.md` para comparativa.
- [ ] Bucket creado: `dypos-cl-<tenant>-backups` con SSE-AES256.
- [ ] Application Key creada con scope `write-only` al bucket.
  Credenciales guardadas en password manager Pierre, NUNCA en git.
- [ ] Lifecycle policy: retención 30 días, version suspended.
- [ ] `apt-get install -y awscli` en el VPS prod.
- [ ] `OFFSITE_BACKUP_*` en `$APP_DIR/.env.docker` (chmod 600 root).
- [ ] Primera ejecución manual del script en VPS:
  `/opt/pos-chile/scripts/backup-offsite.sh` → exit 0 con mensaje
  `[backup-offsite] OK: subida confirmada`.
- [ ] Verificar el objeto subido con `aws s3 ls` (lo hace el script
  internamente, pero evidencia adicional desde la máquina admin).
- [ ] Cron registrado:
  `0 3 * * * /opt/pos-chile/scripts/backup-offsite.sh >> /var/log/dypos-backup-offsite.log 2>&1`
- [ ] Confirmar al día siguiente que el cron generó un upload nuevo
  (revisar bucket + log).
- [ ] **Test de restore mensual** ejercitado al menos una vez,
  registrado en `memory/episodes/YYYY-MM-DD-restore-test.md`.

## Acción concreta

Ver:
- `docs/operations/external-setup-checklist.md` §6 — UI exacta.
- `docs/operations/runbook-backup-restore.md` §3 — pasos en VPS.

Tiempo estimado: **1 hora** end-to-end por tenant (la mayor parte es
crear cuenta y bucket en provider).

## Observaciones técnicas

- El script NO borra dumps remotos. Eso lo hace la lifecycle policy
  del bucket. NO depender de policy para retention compliance — si
  el provider la cambia, podemos perder backups silenciosamente.
- `OFFSITE_BACKUP_KEY_SECRET` debe ser scope **write-only**. Si la
  filtran, el atacante puede subir basura pero NO leer ni borrar
  dumps existentes. Para restore, Pierre usa una key separada
  (read+write, NO en VPS — solo en su máquina admin).
- SHA256 se inyecta como metadata del objeto S3. Permite verificar
  integridad post-download sin descifrar contenido completo.
- El script asume nombre fijo del container Postgres
  (`pos-postgres`) y BD (`pos_chile_db`). Multi-tenant requerirá
  parametrizar (override por env var).

## Quién no puede cerrarlo

Ningún agente. Requiere creación de cuenta + bucket en provider
externo + custodia de credenciales por Pierre.

## Riesgo de no cerrarlo

Pérdida total de datos del tenant si el VPS se rompe sin previo
aviso. Bajo control de un actor maligno (cuenta Vultr suspendida
por reporte falso, disco encriptado por ransomware, etc.) NO hay
ruta de recuperación.

## Cierre

_Pendiente — agregar bloque cuando Pierre complete provider + bucket
+ key + cron + primer restore test._
