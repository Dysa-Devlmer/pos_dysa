# Decision log — ADRs vivos + decisiones pendientes

> ADRs históricos completos viven en `docs/adr/`.
> Este log es índice + estado + decisiones que requieren input de Pierre
> (tag `DECISION_REQUIRED`).

## ADRs vigentes

| Nº | Título | Estado | Doc |
|----|--------|--------|-----|
| 001 | Arquitectura SaaS — deployment dedicado (Camino C) | **VIGENTE** | `docs/adr/001-arquitectura-saas-deployment-dedicado.md` |
| 002 | Migración futura a multi-tenant lógico | PLAN | `docs/adr/002-multi-tenant-future-migration.md` |

### Resumen 001 — Camino C

Cada cliente tiene su propio VPS, BD, dominio. Trade-off: mayor costo
operativo vs. cero blast-radius cruzado y simplicidad de troubleshooting.
Vigente hasta ~30 tenants estimado.

### Resumen 002 — Multi-tenant futuro

Cuando el costo de N VPS supere el de un single deployment con `tenantId`
en cada modelo, migrar. Plan documentado pero **NO implementado**. Disparador
estimado: ~30 tenants o cuando reuso de infra justifique la inversión de
ingeniería.

## Decisiones cerradas en Fase 0

| Tag | Decisión | Cierre |
|-----|----------|--------|
| F-0.1 | `editarVenta` debe mantener invariante `total === sum(pagos)` | Commit `ba2ec6b` + 8 regression tests |
| F-0.3 | Backup BD pre-deploy automático | `scripts/deploy.sh` fase 5a-bis |
| F-0.4 | CI corre en push a `main` + workflow_dispatch | `.github/workflows/ci.yml` |
| F-0.5 | nginx vhost `apk-dypos.zgamersa.com` + bind mount `/var/www/apks` | docker-compose + VPS nginx |
| reporte | `reporte.md` → `docs/audits/audit-2026-04-28.md` (SUPERSEDED) | Fase 1 |
| Fase 1 | Manual maestro técnico en `docs/architecture/` | Este doc |

## Gotchas closed

| # | Gotcha | Closure |
|---|--------|---------|
| G-M53 | Backup BD pre-deploy auto | F-0.3 |
| G-M54 | CI requiere env vars mock | F-0.4 |

## Decisiones pendientes — `DECISION_REQUIRED`

Items que necesitan veredicto de Pierre. Cada uno bloquea features o decisiones
mayores. Ordenados por prioridad estimada.

### DR-01 — Branch protection en `main` (alta)

GitHub Settings → Branches → `main`. Activar:

- Require PR reviews (1).
- Require status checks: `web`, `mobile`.
- No force push.
- Linear history.

**Bloquea:** trabajo en equipo y prevención de regresiones desde main directo.
**Quién:** Pierre (UI GitHub).

### DR-02 — Política de cobertura de tests (media)

¿Qué umbral mínimo de cobertura exigir en CI? Hoy no hay gate. Opciones:

- (a) Sin umbral, sólo "no romper tests existentes".
- (b) Mínimo 60% en `apps/web/app/(dashboard)/*/actions.ts`.
- (c) 80% global con excepciones documentadas.

**Recomendación agente:** (b) por ROI. Server Actions = lógica de negocio.

### DR-03 — Framework E2E mobile (media)

Detox vs Maestro (vs ninguno por ahora).

- **Detox:** más profundo, build nativo, integrable a CI con Android emulator.
- **Maestro:** YAML, rápido, menos cobertura de gestos complejos.
- **Skip:** confiar en smoke manual hasta SDK 55.

**Recomendación agente:** Maestro por velocidad de adopción dado el equipo.

### DR-04 — Push notifications mobile (baja)

Expo Push (gratis hasta cierto volumen) vs FCM directo. Necesario sólo cuando
haya feature que justifique (ej. alerta stock bajo al admin móvil).

### DR-05 — OTA updates (expo-updates) (baja)

Hoy distribución manual de APK vía nginx. OTA reduciría fricción para release
de bugfixes pero introduce complejidad de canal/branching.

**Recomendación agente:** mantener manual hasta tener >5 tenants activos.

### DR-06 — Monitoreo externo de health (alta)

UptimeRobot, BetterStack, o equivalente. Alertas a email/Slack/WhatsApp cuando
`/api/health` no responde.

**Bloquea:** SLA serio para clientes B2B.
**Quién:** Pierre debe elegir provider y registrarse.

### DR-07 — Smoke prod automatizado (media)

Hoy es manual con Claude_in_Chrome MCP. Automatizar con playwright sería
posible: tras `deploy.sh`, correr suite mínima (login admin, login cajero,
crear venta de prueba, eliminar) contra prod en headless.

**Riesgo:** ensuciar AuditLog prod con pruebas. Mitigar con flag o tenant
"staging" dedicado.

### DR-08 — Importación CSV de catálogo (media)

Onboarding rápido del cliente requiere subir productos en bulk. Hoy sólo CRUD
unitario via UI.

**Recomendación agente:** feature explícita en próxima fase comercial.

### DR-09 — Connection pooling Postgres (baja)

Hoy Prisma client default. Si un tenant escala >50 cajas concurrentes, evaluar
PgBouncer o Postgres `pgbouncer` mode. No urgente.

### DR-10 — Política de retención de backups BD (alta)

Hoy `deploy.sh` rota a 14 dumps pre-deploy. ¿Qué pasa con backups diarios
"out of deploy"? ¿Off-site copy a S3/Backblaze?

**Bloquea:** compliance + disaster recovery serio.
**Quién:** Pierre.

## Process — proponer una decisión nueva

1. Crear PR con un nuevo ADR en `docs/adr/NNN-titulo.md` (numeración continua).
2. Resumir trade-offs y opciones.
3. Marcar `DECISION_REQUIRED` aquí en `decision-log.md`.
4. Pierre aprueba/rechaza por escrito (PR comment o memory).
5. Al cerrar: mover de "pendientes" a "vigentes" y actualizar doc afectado.

## SUPERSEDED

Items superseded por Fase 0 / Fase 1, listados para trazabilidad histórica:

- Audit profesional 2026-04-27 (`docs/audits/audit-2026-04-28.md`) — superseded
  por `memory/projects/pos-chile-monorepo.md` y este `decision-log.md`.
- Hallazgos del audit reflejados en gotchas vivos quedan en
  `memory/projects/pos-chile-monorepo.md`.

---

_Última actualización: 2026-04-29 — Fase 1._
