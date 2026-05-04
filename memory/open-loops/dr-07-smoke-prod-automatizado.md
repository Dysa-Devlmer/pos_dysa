---
title: DR-07 — Smoke prod automatizado
date: 2026-05-03
status: active
priority: medium
owner: Pierre
tags:
  - open-loop
  - operacion
  - smoke
  - ci
---

# DR-07 — Smoke prod automatizado

## Contexto

Hasta Fase 3D el smoke prod era 100 % manual: Pierre o agente
abrían `Claude_in_Chrome` y verificaban en browser después de cada
deploy. Eso depende de la disponibilidad humana, no escala
multi-tenant y deja ventanas ciegas.

## Estado actual

| Pieza | Estado | Detalle |
|---|---|---|
| `scripts/smoke-prod.sh` read-only | ✅ implementado (Fase 3D) | Cubre `/api/health`, `/login`, `/privacidad`, gate `/perfil`, `--with-auth` con `/api/v1/auth/login` + `/api/v1/dashboard` + `/api/v1/productos` + sanity 401 |
| Validación local con dev server | ✅ verificado | 6/6 sin auth, 11/11 con auth contra seed admin. Exit 1 con creds malas (verificado) |
| Smoke prod básico real | ✅ verificado | `./scripts/smoke-prod.sh https://dy-pos.zgamersa.com` → PASS=6 / FAIL=0 el 2026-05-03 |
| Runbook smoke ejecutable (script + checklist UI) | ✅ implementado | `docs/operations/runbook-smoke-prod.md` |
| **Wire-up automático en `scripts/deploy.sh`** | ✅ implementado (Fase 3D.1) | Paso 7/7 invoca `smoke-prod.sh` post-health. Fail → exit 1 y backup preservado. Rollback automático solo con `SMOKE_ROLLBACK_ON_FAIL=1`. `SKIP_SMOKE=1` para escape hatch. |
| Smoke prod con auth | ❌ pendiente | Requiere usuario smoke dedicado o autorización para usar admin |
| Wire-up automático con `--with-auth` en `deploy.sh` | ❌ pendiente | Espera resolución del item anterior |
| CI scheduled smoke (uptime check vía GitHub Actions) | ❌ pendiente | Posible mejora cuando varios tenants estén activos |

## Por qué prioridad media

- Hoy el `scripts/deploy.sh` ya hace **rollback automático** si
  `/api/health` falla post-deploy (12 intentos × 10 s). Ese es el
  smoke mínimo crítico — ya implementado.
- DR-07 es **smoke MÁS profundo** (login + autenticación + listing
  básico). Aporta confianza pero NO es bloqueante para captar primer
  cliente.

## Decisiones técnicas tomadas (Fase 3D)

1. **100% read-only**: el script NO crea ventas de prueba. Razón: el
   brief original mencionaba "crear venta + eliminar" pero ensucia
   AuditLog prod. Se sustituye por validación de listing (`GET
   /api/v1/productos`) que verifica que la cadena Server → Prisma →
   PG funciona, sin escribir.
2. **Auth opcional**: sin `--with-auth` el script no necesita
   credenciales — sirve para monitoreo periódico simple. Con
   `--with-auth` requiere `SMOKE_ADMIN_EMAIL` + `SMOKE_ADMIN_PASSWORD`
   solo via env (NO via CLI flag — `ps aux` los expondría).
3. **Sin deps externas**: solo bash + curl. `python3` es opcional
   (mejor JSON escaping); fallback funcional sin él.
4. **Exit code semántico**: 0 = todo OK, 1 = al menos un FAIL.
   Compatible con CI / cron / systemd.

## Criterio de cierre

- [x] **Wire-up automático básico en `scripts/deploy.sh`** (Fase 3D.1).
  Sin auth — solo smoke read-only. Fail marca deploy fallido y preserva
  backup. Rollback automático queda opt-in con `SMOKE_ROLLBACK_ON_FAIL=1`.
- [ ] Decidir si `scripts/deploy.sh` debe invocar también
  `smoke-prod.sh --with-auth` (variante extendida). Pros: cubre flujo
  de login mobile y dashboard authed. Contras: requiere exponer
  credenciales smoke al script (`.env.docker` con `SMOKE_ADMIN_*`).
- [ ] Si SÍ wire-up con auth: agregar las creds smoke al
  `.env.docker` de cada tenant y extender el paso 7/7 de `deploy.sh`
  con `--with-auth`.
- [ ] Si NO wire-up con auth: documentar en
  `docs/architecture/deploy-ops.md` que post-deploy es OBLIGATORIO
  correr `./scripts/smoke-prod.sh --with-auth` desde la máquina
  admin antes de cerrar el ticket de deploy.
- [x] Primera ejecución básica contra prod real registrada como evidencia.
- [x] Primera ejecución de `deploy.sh` con wire-up activo contra prod
  registrada. Resultado 2026-05-03 21:26 CLT: deploy OK, health OK,
  smoke paso 7/7 PASS=6 / FAIL=0, backup app
  `/opt/pos-chile.backup_20260503_212623`, backup DB
  `/var/backups/dypos-cl-db/pre-deploy-20260503-213104.sql.gz`.
- [ ] Primera ejecución con auth contra prod real registrada como evidencia.
- [ ] (Opcional) Cron en VPS o GitHub Actions scheduled cada 30 min
  contra los tenants productivos.

## Quién decide

- **Pierre** debe autorizar:
  - Crear usuario smoke dedicado por tenant (`smoke@<tenant>.cl` con
    rol mínimo) o reusar admin del seed.
  - Wire-up automático en `deploy.sh` o mantener manual.
  - Frecuencia del scheduled smoke.

## Quién implementa

Agente, una vez Pierre decida los puntos arriba. Trabajo estimado:

- Wire-up `deploy.sh`: ~30 min código + tests.
- Cron mensual en GitHub Actions: ~1 hora (workflow + secrets).

## Riesgo de no cerrarlo

Bajo en este momento — el smoke manual + script disponibles cubren
los escenarios reales hoy. El riesgo crece linealmente con cantidad
de tenants: ya con 5 tenants activos, smoke manual post-deploy en
todos pasa a ser fricción.

## Cierre

_Pendiente — agregar bloque cuando Pierre decida wire-up
automático vs ejecución manual y se registre la primera ejecución
contra prod._
