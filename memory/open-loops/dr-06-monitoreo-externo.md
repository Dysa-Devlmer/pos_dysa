---
title: DR-06 — Monitoreo externo de health
date: 2026-05-03
status: active
priority: high
owner: Pierre
tags:
  - open-loop
  - operacion
  - sla
  - monitoreo
---

# DR-06 — Monitoreo externo de health

## Contexto

Hoy `/api/health` es funcional y responde JSON estable
(`{"status":"ok","database":"connected","version":"2.0.0"}` —
verificado en `apps/web/app/api/health/route.ts`). PERO **nadie lo
está observando externamente**. Si el VPS o el dominio caen, la
única forma de enterarse es:

- Que un cliente avise.
- Smoke manual posterior al hecho.
- Sentry (que solo dispara con errores en runtime — no captura
  "VPS apagado" o "DNS roto").

Eso impide ofrecer SLA serio a clientes B2B.

## Por qué es alta prioridad

- Ningún plan comercial (ver `docs/PRICING-STRATEGY.md`) puede
  prometer "uptime 99 %" sin una sonda externa que mida.
- El primer tenant pagante con uptime contractual lo va a exigir.
- Cuesta minutos de configuración (UptimeRobot free tier alcanza).
- Es **acción externa** de Pierre — ningún agente puede crear
  monitor sin credenciales.

## Estado actual de los artefactos

| Pieza | Estado | Ubicación |
|---|---|---|
| Endpoint `/api/health` que responde JSON estable | ✅ implementado | `apps/web/app/api/health/route.ts` |
| Cobertura del path por smoke automatizado | ✅ implementado (Fase 3D) | `scripts/smoke-prod.sh` (verifica body keyword) |
| Procedimiento UI exacto para crear monitor | ✅ documentado | `docs/operations/external-setup-checklist.md` §5 |
| Pre-check de latencia + status + keyword (10 muestras) | ✅ documentado (Fase 3D.2) | one-liner curl en `external-setup-checklist.md` §5.0. NO requiere script aparte — sirve para validar antes de pegar el monitor. |
| Provider elegido | ❌ pendiente | — |
| Cuenta creada en provider | ❌ pendiente | — |
| Monitor activo apuntando a prod | ❌ pendiente | — |
| Alerta validada (parar container y ver alerta llegar) | ❌ pendiente | — |

## Criterio de cierre

- [ ] Pierre eligió provider: UptimeRobot (recomendado) / BetterStack
  / Pingdom / equivalente.
- [ ] Cuenta creada con email del owner (no email personal cliente).
- [ ] Monitor HTTP creado con:
  - URL: `https://<dominio-prod>/api/health`
  - Interval: 5 min (free tier).
  - Method: GET.
  - Keyword check: `"status":"ok"` (string match).
  - Status considered up: 200.
  - Timeout: 30 s.
- [ ] Alert contact configurado: email del owner + (opcional) Slack
  webhook o canal WhatsApp Business.
- [ ] Validación end-to-end: SSH al VPS, `docker stop pos-web`,
  esperar < 10 min, confirmar email de alerta. Reanudar con
  `docker start pos-web` y confirmar email "back up".
- [ ] **Si el tenant tiene SLA contractual**, agregar el monitor a
  status page pública (UptimeRobot Public Status Pages, free).
- [ ] Pegar evidencia (captura del monitor activo + email de alerta
  recibido) al cerrar este open-loop.

## Acción concreta

Ver `docs/operations/external-setup-checklist.md` §5 para el
procedimiento UI exacto. Tiempo estimado: **10 min** por tenant.

## Estrategia multi-tenant

- UptimeRobot free permite 50 monitors → suficiente hasta 50
  tenants antes de upgrade.
- 1 monitor por tenant. Naming: `DyPos CL — <slug-tenant>`.
- Status page pública opcional por tenant si quieren mostrarla a
  sus clientes ("nuestro POS está arriba 99.95 %").

## Quién no puede cerrarlo

Ningún agente. Requiere creación de cuenta en provider externo y
custodia de credenciales por Pierre.

## Riesgo de no cerrarlo

Si DyPos CL cae fuera de horario y nadie lo detecta hasta el día
siguiente, un cliente con tienda activa pierde ventas reales.
SLA roto sin posibilidad de demostrar fault tolerance.

## Cierre

_Pendiente — agregar bloque cuando Pierre configure el provider y
valide la primera alerta._

## Evidencia 2026-05-03 — precheck Codex

Codex ejecutó 10 muestras read-only contra
`https://dy-pos.zgamersa.com/api/health`:

- 10/10 HTTP 200.
- 10/10 keyword `"status":"ok"` presente.
- 10/10 keyword `"database":"connected"` presente.
- Latencias `time_total`: 0.152s a 0.602s.

Esto valida que el endpoint está listo para UptimeRobot. Falta crear el
monitor externo y probar alerta real con caída controlada.
