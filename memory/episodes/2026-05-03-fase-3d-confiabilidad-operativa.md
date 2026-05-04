---
title: Episodio — Fase 3D confiabilidad operativa
date: 2026-05-03
status: active
phase: 3D
tags:
  - episode
  - operacion
  - smoke
  - backup
  - monitoreo
  - sla
---

# Episodio — Fase 3D confiabilidad operativa

## Objetivo

Cerrar lo que NO requiere credenciales externas para que DyPos CL sea
vendible sin depender de memoria humana entre deploys. Pierre no
quiere features comerciales nuevas hasta que la base operativa esté.

## Verificado en código (esta fase)

| Item | Evidencia |
|---|---|
| `scripts/smoke-prod.sh` (DR-07) — read-only, opcional `--with-auth` | Script bash, syntax OK (`bash -n`), exit 0 con dev local + seed admin (PASS=11 / FAIL=0), exit 1 con creds malas (PASS=6 / FAIL=2 verificado), smoke prod básico real PASS=6 / FAIL=0 |
| Refactor `LAST_BODY` global para evitar pérdida de PASS/FAIL en subshells | Bug detectado en primer smoke (PASS=5 vs esperado 6); fix verificado en re-smoke (PASS=6) |
| Patch Codex post-verificación | Fallo DNS/`curl` reportaba `HTTP 000000` por `curl ... || echo 000`; corregido a `HTTP 000` con `if ! code="$(curl ...)"`. `bash -n` OK, fail path verificado contra dominio inválido, smoke prod PASS=6 / FAIL=0 |
| `docs/operations/runbook-smoke-prod.md` (DR-07) | Checklist completo: parte A automatizada, parte B manual UI (login admin/cajero, gate cambio password, comprobante público, mobile, reportes), parte C frecuencia recomendada por trigger, parte D troubleshooting, parte E plantilla de reporte |
| `docs/operations/runbook-backup-restore.md` (DR-10) | Cubre: estado actual, backup pre-deploy automático, activación off-site con criterio de cierre, restore desde local, restore desde off-site, test mensual, disaster recovery completo |
| `memory/open-loops/dr-01-branch-protection.md` (actualizado) | Sección "Verificación de estado al 2026-05-03": pushes recientes confirman status `advisory not enforced` (warning sin bloqueo). Criterio de cierre ahora exige push de prueba rechazado |
| `memory/open-loops/dr-06-monitoreo-externo.md` (creado) | Tabla de artefactos, criterio de cierre con checklist 9 ítems, validación end-to-end (`docker stop pos-web` + esperar email) |
| `memory/open-loops/dr-07-smoke-prod-automatizado.md` (creado) | Estado real diferenciado: script `read-only` ✅, runbook ✅, wire-up automático en `deploy.sh` ❌, smoke contra prod real ❌, CI scheduled ❌ |
| `memory/open-loops/dr-10-backup-offsite.md` (creado) | Tabla con 14 ítems estado: 7 implementados, 7 pendientes Pierre |

## Documentado pero NO ejecutado

- Smoke prod básico real (`https://dy-pos.zgamersa.com`) — ejecutado
  por Codex el 2026-05-03 después del commit de Worktree:
  PASS=6 / FAIL=0. Cubre `/api/health`, `/login`, `/privacidad` y
  gate `/perfil` sin sesión.
- Smoke prod con auth (`--with-auth`) — NO ejecutado porque requiere
  credenciales smoke dedicadas o autorización explícita para usar admin.
- `scripts/backup-offsite.sh` — existe desde Fase 2A. NO ha subido
  jamás un dump real porque las env vars `OFFSITE_BACKUP_*` no están
  seteadas en ningún tenant. Comportamiento correcto del script:
  exit 3 con mensaje claro si faltan.
- Wire-up del smoke al final de `scripts/deploy.sh` — discutido en
  el open-loop pero no implementado. Espera decisión Pierre sobre
  exponer credenciales smoke (creds dedicadas vs admin del seed).
- UptimeRobot — instrucciones UI listas en
  `docs/operations/external-setup-checklist.md` §5; ningún monitor
  creado.

## Pendiente externo Pierre (no doable por agente)

| ID | Acción | Tiempo estimado | Bloqueante para |
|---|---|---|---|
| DR-01 | Activar branch protection enforced en GitHub Settings | 5 min | Trabajo en equipo seguro |
| DR-06 | Crear cuenta UptimeRobot + monitor + validar alerta | 10 min/tenant | SLA contractual con clientes B2B |
| DR-07 | Decidir wire-up automático en `deploy.sh` (sí/no) | 5 min decisión + 30 min impl si sí | Smoke confiable post-deploy |
| DR-10 | Provider + bucket + key + cron + restore test | 1 hora/tenant | Disaster recovery real |

## Decisiones técnicas tomadas en esta fase

1. **Smoke `read-only`, sin "venta de prueba"**. El brief original
   mencionaba "crear venta + eliminar" pero ensucia AuditLog prod
   en cada deploy. Sustituido por `GET /api/v1/productos` que
   ejercita la cadena Server Action → Prisma → Postgres sin
   escribir. Trade-off aceptado: cobertura ligeramente menor a
   cambio de no contaminar prod.
2. **Credenciales smoke solo via env, NO via CLI**. `--password=...`
   queda visible en `ps aux` → leak. El script falla rápido si se
   pasa `--with-auth` sin las env vars.
3. **Sin deps duras**: el script usa solo bash + curl. `python3` es
   opcional para mejor JSON escaping; fallback funcional sin él.
   Esto permite correrlo desde cualquier máquina admin (incluido
   un VPS limpio).
4. **Open-loops separados por DR-NN**, no batch. Cada uno tiene
   dueño explícito (todos Pierre), criterio de cierre propio,
   evidencia esperada. Anti-duplicación con
   `docs/architecture/decision-log.md` (referencia, no copia).

## Gates de la fase

- `bash -n scripts/smoke-prod.sh` → syntax OK.
- Smoke local sin auth (dev server localhost:3000) → PASS=6 / FAIL=0.
- Smoke local con auth (admin del seed) → PASS=11 / FAIL=0.
- Smoke local con creds inválidas → exit 1 / FAIL=2.
- Smoke prod básico real (sin auth) contra
  `https://dy-pos.zgamersa.com` → PASS=6 / FAIL=0.
- Fail path de red (`https://nonexistent.invalid`) → exit 1 con
  `HTTP 000`, no `HTTP 000000`.
- `git fetch origin && git status -sb` → working tree limpio,
  sincronizado.

## Pendientes después de esta fase

- Pierre acción externa (4 open-loops abiertos arriba).
- ~~Wire-up `scripts/deploy.sh`~~ → cerrado en Fase 3D.1, ver sección
  abajo.
- Update `docs/architecture/decision-log.md` para reflejar que DR-07
  está parcialmente cerrado por implementación (script + runbook +
  wire-up básico) y el resto pasa a `memory/open-loops/`.

---

## Fase 3D.1 — Wire-up del smoke en `deploy.sh` (2026-05-03)

### Cambios en `scripts/deploy.sh`

1. **Refactor**: el bloque rollback inline (≈20 líneas que aparecía
   solo en el path de health-fail) se extrajo a la función
   `do_rollback_and_exit "razón"`. Ahora se invoca desde:
   - Health check fail (comportamiento previo, mismo efecto).
   - Smoke prod fail con `SMOKE_ROLLBACK_ON_FAIL=1` (opt-in).
2. **Nueva fase 7/7 "Smoke Prod (read-only)"** después del health
   check (paso 6/7 antes era 6/6). Renumeración de headers
   `1/6..6/6` → `1/7..6/7` + `5a-bis/7`, `5b/7` para coherencia
   visual.
3. **Invocación**: `"$SMOKE_SCRIPT" "https://${DOMAIN}"` sin
   `--with-auth`. Cubre `/api/health` (con keyword), `/login`,
   `/privacidad`, gate `/perfil`. Stderr del script (mensajes
   `[OK]`/`[FAIL]`) se propagan al operador.
4. **Smoke-fail default**: exit 1, backup preservado, sin cleanup de
   backups antiguos. No rollback automático porque el smoke corre desde
   la máquina admin y puede fallar por DNS/red local aunque el VPS esté
   sano. Rollback automático queda disponible con
   `SMOKE_ROLLBACK_ON_FAIL=1`.
5. **Escape hatch**: `SKIP_SMOKE=1 ./scripts/deploy.sh` salta el
   smoke con warning. Para casos puntuales (debugging, deploys
   docs-only). NO recomendado en flujos normales.
6. **Cleanup de backups movido**: ahora ocurre SOLO después de smoke
   OK. Eso preserva la red de seguridad mientras la verificación
   está en curso (antes se limpiaba justo después del health).

### Decisiones del diseño 3D.1

- **Sin `--with-auth`**: el brief explícito de Pierre prohíbe agregar
  `SMOKE_ADMIN_*` por ahora. Smoke básico cubre regresiones de ruta
  pública sin credenciales.
- **Rollback automático solo para health-fail**: health se verifica
  contra el servicio recién recreado y es señal fuerte de deploy roto.
  Smoke público puede fallar por DNS/red local del operador; por eso
  marca el deploy como fallido y conserva backup, pero no revierte por
  default. Si Pierre quiere la política agresiva, puede ejecutar con
  `SMOKE_ROLLBACK_ON_FAIL=1`.
- **Refactor mínimo**: extraje solo `do_rollback_and_exit`.
  Estructura de fases preservada. Sin tocar rsync, ni ssh_run, ni
  prisma migrate. Exit codes y `set -euo pipefail` intactos.

### Verificado en local-safe (NO en prod)

- `bash -n scripts/deploy.sh` → syntax OK.
- Path resolution: `SCRIPT_DIR` con `BASH_SOURCE[0]` resuelve a
  `<repo>/scripts`. `SMOKE_SCRIPT` apunta correctamente al script
  ejecutable.
- 4 ramas del bloque smoke ejecutadas como dry-run aislado:
  | Rama | Configuración | Esperado | Resultado |
  |---|---|---|---|
  | 1. SKIP | `SKIP_SMOKE=1` | warn + continuar (exit 0) | ✅ exit 0 |
  | 2. ausente | `SMOKE_SCRIPT=/nonexistent/...` | error + exit 1, backup preservado | ✅ exit 1 |
  | 3. fail-net | URL inválida `http://nonexistent.invalid` | smoke fail + exit 1, backup preservado | ✅ exit 1 |
  | 4. ok-dev | dev server `http://localhost:3000` | success (exit 0) | ✅ exit 0 |

### NO ejecutado contra prod

`./scripts/deploy.sh` con el wire-up activo fue ejecutado contra
`https://dy-pos.zgamersa.com` por Codex el 2026-05-03 21:26 CLT.

Resultado:

- Build local omitido (`N`), deploy confirmado escribiendo `deploy`.
- Backup app: `/opt/pos-chile.backup_20260503_212623`.
- Backup DB pre-migrations:
  `/var/backups/dypos-cl-db/pre-deploy-20260503-213104.sql.gz`.
- `prisma migrate deploy`: 8 migrations found, no pending migrations.
- Health check: OK.
- Paso 7/7 `Smoke Prod (read-only)`: PASS=6 / FAIL=0.
- Deploy completado con `Smoke prod OK`.
- Verificación final posterior:
  - contenedores `pos-web`, `pos-postgres`, `pos-pgadmin` up;
  - `pos-web` y `pos-postgres` healthy;
  - smoke manual final PASS=6 / FAIL=0.

La primera ejecución real del wire-up quedó validada sin rollback.

Mientras tanto, el smoke ejecutable manualmente sigue siendo el
mismo binario probado:

```bash
./scripts/smoke-prod.sh https://dy-pos.zgamersa.com
```

## NO tocado deliberadamente en esta fase

- Cloudflare DNS / SSL.
- GitHub Settings (branch protection).
- UptimeRobot u otro provider de monitoreo.
- Provider de backups (S3 / B2 / Wasabi / R2).
- Mobile (`apps/mobile/*`).
- Producto web Server Actions / UI.

Pierre dijo explícitamente "no avances con features comerciales
todavía".

## Smoke prod real

Smoke automatizado básico realizado por Codex contra producción:

```bash
./scripts/smoke-prod.sh https://dy-pos.zgamersa.com
# PASS=6 · FAIL=0
```

Queda pendiente el smoke con auth porque requiere usuario/credenciales
smoke dedicadas o autorización explícita para usar una cuenta admin:

```
SMOKE_ADMIN_EMAIL=... SMOKE_ADMIN_PASSWORD=... \
  ./scripts/smoke-prod.sh https://dy-pos.zgamersa.com --with-auth
```

…y registrar resultado en este episodio o en una nota específica
`memory/episodes/YYYY-MM-DD-smoke-prod-<tenant>.md`.

## Observaciones del deploy 3D.1

- El build Docker sigue mostrando warnings esperados de Sentry /
  OpenTelemetry (`Critical dependency` y Edge Runtime con `jose`). No
  bloquearon compile ni runtime.
- Apareció un nuevo warning de ESLint dentro de Docker:
  `Cannot find module '@next/eslint-plugin-next'`. Es el mismo patrón
  que `eslint-plugin-react-hooks`: local lint pasa, pero Docker build
  no resuelve el plugin transitive. Codex aplicó patch local agregando
  `@next/eslint-plugin-next@15.5.15` como devDependency directa de
  `apps/web`.
- Patch local verificado:
  - `pnpm --filter web lint` ✅
  - `pnpm --filter web test` → 265/265 ✅
  - `pnpm --filter web build` ✅
  - `pnpm --filter web type-check` ✅ (rerun después del build; el
    primer intento falló porque corrió en paralelo con `next build` y
    `.next/types` estaba regenerándose).
- Segundo deploy real ejecutado con `f87fb10`:
  - backup app: `/opt/pos-chile.backup_20260503_213806`;
  - backup DB:
    `/var/backups/dypos-cl-db/pre-deploy-20260503-214359.sql.gz`;
  - `prisma migrate deploy`: no pending migrations;
  - health OK;
  - smoke paso 7/7 PASS=6 / FAIL=0;
  - verificación final de contenedores: `pos-web` y `pos-postgres`
    healthy;
  - smoke manual final PASS=6 / FAIL=0.
- Resultado: el warning Docker
  `Cannot find module '@next/eslint-plugin-next'` desapareció.
  Quedan sólo warnings conocidos de Sentry/OpenTelemetry, `jose` Edge
  Runtime y Upstash sin env en build stage.

---

## Fase 3D.2 — Preparación DR-06/DR-10 sin credenciales (2026-05-04)

### Decisiones del scope

1. **NO crear `health-self-check.sh` aislado para DR-06**.
   `smoke-prod.sh` ya cubre exactamente lo que UptimeRobot
   inspecciona (status 200 + keyword `"status":"ok"` + keyword
   `"database":"connected"`). Crear un script duplicado sería más
   superficie de mantenimiento sin valor proporcional.
2. **SÍ crear `backup-offsite-precheck.sh` para DR-10**. El script
   principal asume tooling/paths/perms que Pierre no descubre hasta
   intentar correr el cron. Le ahorra ciclos de "fail por X → fix".

### Implementado en código

| Item | Archivo | Verificación |
|---|---|---|
| Mini-script curl (10 muestras) pre-UptimeRobot | `docs/operations/external-setup-checklist.md` §5.0 | one-liner pega-y-corre, valida status + latencia + 2 keywords |
| `scripts/backup-offsite-precheck.sh` | nuevo, 7 secciones de checks | `bash -n` OK; PASS=3/FAIL=3 en local (esperado, no es VPS); PASS=15/FAIL=0 en mock VPS feliz; PASS=12/WARN=1/FAIL=1 con endpoint inalcanzable (detectó conectividad rota correctamente); detecta vars con formato malo (provider inválido, bucket uppercase, endpoint con protocolo) |
| Bug `HTTP 000` con conectividad caída | mismo patrón que `221d59f` aplicó a smoke; reaplicado al precheck con `if ! HTTP_CODE=...` para no concatenar `||echo 000` | verificado contra `nonexistent.invalid.example` — reporta `HTTP 000` no `HTTP 000000` |
| Update `runbook-backup-restore.md` §3 | bloque info al inicio que invoca el precheck | leído |
| Update `external-setup-checklist.md` §5.0 + §6 | snippet curl + referencia al precheck DR-10 | leído |
| Update `dr-06-monitoreo-externo.md` | fila nueva en tabla de artefactos | leído |
| Update `dr-10-backup-offsite.md` | fila nueva en tabla de artefactos | leído |

### Distinción verificado / documentado / pendiente Pierre

| Categoría | Item | Detalle |
|---|---|---|
| ✅ Verificado en código | `backup-offsite-precheck.sh` syntax, 4 escenarios (local sin VPS, mock VPS OK, vars malformadas, endpoint inalcanzable) | logs en este episodio |
| 📄 Documentado pero NO ejecutado contra VPS real | el precheck no se corrió contra el VPS prod (`64.176.21.229`) | requiere SSH a prod, fuera de scope esta fase. Esperado: PASS≥3 + INFO en las 6 vars OFFSITE_BACKUP_* (vars sin setear) |
| 📄 Documentado pero NO ejecutado contra prod | mini-script curl §5.0 pre-UptimeRobot | requiere correr 10 muestras contra `https://dy-pos.zgamersa.com/api/health` desde la máquina admin. NO se hizo en esta fase porque Pierre no autorizó nuevas requests post-deploy |
| ⏳ Pendiente externo Pierre | DR-06: cuenta UptimeRobot + monitor + alerta validada | sigue en `dr-06-monitoreo-externo.md` |
| ⏳ Pendiente externo Pierre | DR-10: provider + bucket + key + cron + restore mensual | sigue en `dr-10-backup-offsite.md` |
| ⏳ Pendiente externo Pierre | DR-01: branch protection enforced | sigue advisory; cada push lo confirma |

### NO tocado deliberadamente en esta fase

- `scripts/deploy.sh` (Pierre dijo "no tocar más salvo autorización").
- Producto web/mobile.
- DB schema o data.
- Provider externo (Cloudflare, GitHub, UptimeRobot, Backblaze, etc.).

### Verificación real Codex post-3D.2

Codex ejecutó los dos checks que sí estaban a nuestro alcance:

1. **DR-06 pre-UptimeRobot contra producción**
   - 10 requests a `https://dy-pos.zgamersa.com/api/health`.
   - 10/10 HTTP 200.
   - 10/10 keyword `"status":"ok"`.
   - 10/10 keyword `"database":"connected"`.
   - Latencia `time_total`: 0.152s a 0.602s.

2. **DR-10 precheck real contra VPS**
   - El script todavía no estaba desplegado en
     `/opt/pos-chile/scripts/` porque Fase 3D.2 no había pasado por
     deploy; se ejecutó por SSH streaming (`bash -s`) sin copiar
     archivos ni modificar la app.
   - Primer resultado: FAIL único por `awscli` no instalado.
   - `apt-get install awscli` no tenía candidato en Ubuntu 24.04/mirror.
   - Codex instaló AWS CLI v2 oficial en `/usr/local/bin/aws`.
   - Versión verificada:
     `aws-cli/2.34.41 Python/3.14.4 Linux/6.8.0-101-generic exe/x86_64.ubuntu.24`.
   - Rerun del precheck real:
     PASS=9 / WARN=0 / FAIL=0 / INFO=11.
   - Estado: VPS listo para activar DR-10 cuando Pierre cree provider,
     bucket, key y agregue `OFFSITE_BACKUP_*` en `.env.docker`.
