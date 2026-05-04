# Checklist go-live — primer tenant DyPos CL

> Audiencia: Pierre / Dyon Labs antes de habilitar un negocio real.
> Proposito: decidir si un tenant esta listo para operar con clientes,
> sin recorrer todos los runbooks uno por uno.
>
> Este checklist NO reemplaza los runbooks. Es el tablero de decision:
> cada item apunta al documento que contiene el procedimiento completo.

---

## 0. Regla de uso

Antes de declarar un tenant como "listo para venta real", completar
este documento con evidencia. No basta con que el codigo exista: debe
haber verificacion local, deploy, smoke y cierre de los pendientes
externos que apliquen al plan vendido.

Usar estos estados:

| Estado | Significado |
|---|---|
| `[x]` | Verificado con evidencia objetiva |
| `[ ]` | Pendiente |
| `[n/a]` | No aplica al plan/tenant actual |
| `[defer]` | Diferido explicitamente, no bloquea go-live |

---

## 1. Datos del tenant

| Campo | Valor |
|---|---|
| Nombre comercial |  |
| Razon social |  |
| RUT empresa |  |
| Contacto principal |  |
| Email owner/admin |  |
| Plan contratado | Starter / Pro / Business |
| Fecha objetivo go-live |  |
| Dominio/subdominio |  |
| VPS / IP |  |
| Ambiente | Produccion |

### Alcance vendido

- [ ] Panel web para ADMIN.
- [ ] Panel web para CAJERO.
- [ ] APK Android para cajero.
- [ ] Importacion CSV de productos.
- [ ] Comprobantes internos compartibles por link.
- [ ] Devoluciones.
- [ ] Reportes PDF/Excel.
- [ ] Monitoreo externo incluido.
- [ ] Backup off-site incluido.
- [ ] Soporte primer turno incluido.

### No prometido en este go-live

Marcar como `defer` si no fue vendido o no esta en alcance:

- [defer] Emision de e-boleta SII.
- [defer] Impresora termica Bluetooth nativa.
- [defer] Cajon de dinero automatico.
- [defer] WhatsApp Business API.
- [defer] iOS.
- [defer] Multi-sucursal.

---

## 2. Readiness de producto

| Area | Criterio | Estado | Evidencia |
|---|---|---|---|
| Login web | ADMIN puede iniciar sesion en browser incognito | [ ] |  |
| Login web cajero | CAJERO puede iniciar sesion y no ve Administracion | [ ] |  |
| Password temporal | Usuario nuevo/redeseteado entra a `/cambiar-password` antes del dashboard | [ ] |  |
| Caja | Existe una caja operativa y se puede abrir turno | [ ] |  |
| Productos | Hay categorias y productos cargados | [ ] |  |
| CSV | Si hay >30 productos, import CSV probado con plantilla | [ ] |  |
| Clientes | Clientes frecuentes cargados si aplica | [ ] |  |
| Venta web | Venta de prueba creada y luego anulada/eliminada segun procedimiento | [ ] |  |
| Stock | Stock baja al vender y se recupera al eliminar/anular segun flujo | [ ] |  |
| Devolucion | Devolucion de prueba creada y verificada | [ ] |  |
| Comprobante publico | Link `/comprobante/[token]` abre sin sesion y muestra PII enmascarada | [ ] |  |
| Reportes | PDF y Excel descargan correctamente | [ ] |  |
| Alertas stock | Productos bajo stock aparecen en Alertas | [ ] |  |
| Perfil | Usuario puede cambiar password y datos permitidos | [ ] |  |

Referencia:
- Manual web: `docs/product/manual-web.md`.
- Onboarding cliente: `docs/product/onboarding-cliente.md`.
- Smoke UI: `docs/operations/runbook-smoke-prod.md` Parte B.

---

## 3. Readiness mobile

| Area | Criterio | Estado | Evidencia |
|---|---|---|---|
| APK | Version instalada coincide con release publicada | [ ] |  |
| Firma | APK instala con `adb install -r` preservando datos | [ ] |  |
| Login mobile | CAJERO puede iniciar sesion en el device fisico | [ ] |  |
| Password temporal | Mobile bloquea login si el usuario aun debe cambiar password | [ ] |  |
| Catalogo | Productos sincronizan al device | [ ] |  |
| Venta mobile | Venta de prueba creada desde mobile y aparece en web | [ ] |  |
| Offline | Venta offline de prueba queda en cola y sincroniza al volver internet | [ ] |  |
| Idempotency | Retry no duplica venta sincronizada | [ ] | Cubierto por tests; smoke opcional |
| Sentry mobile | Error controlado llega a Sentry o issue existente validado | [ ] | POS-CHILE-MOBILE-1 u otro |
| Versioning | `/api/mobile/manifest` retorna release vigente | [ ] |  |

Referencia:
- Manual mobile: `docs/product/manual-mobile.md`.
- Release APK: `docs/mobile-release-runbook.md`.

---

## 4. Readiness operativa

| DR | Control | Estado go-live | Evidencia / link |
|---|---|---|---|
| DR-01 | Branch protection enforced en `main` | [ ] Pendiente Pierre | `memory/open-loops/dr-01-branch-protection.md` |
| DR-06 | Monitor externo `/api/health` + alerta validada | [ ] Pendiente Pierre | `memory/open-loops/dr-06-monitoreo-externo.md` |
| DR-07 | Smoke prod basico en deploy + runbook UI | [x] Basico verificado | `docs/operations/runbook-smoke-prod.md` |
| DR-07 | Smoke prod con auth | [ ] Pendiente decision | `memory/open-loops/dr-07-smoke-prod-automatizado.md` |
| DR-10 | Backup local pre-deploy | [x] Activo | `scripts/deploy.sh` |
| DR-10 | AWS CLI / entorno VPS listo para off-site | [x] Verificado | `memory/open-loops/dr-10-backup-offsite.md` |
| DR-10 | Bucket + key + cron off-site + restore test | [ ] Pendiente Pierre | `docs/operations/runbook-backup-restore.md` |

### Politica de decision

- Para un piloto sin SLA contractual: DR-01/DR-06/DR-10 pueden quedar
  abiertos si Pierre los acepta explicitamente como riesgo temporal.
- Para un cliente pagante con operacion diaria: DR-06 y DR-10 deben
  estar cerrados antes del go-live.
- Para trabajo con mas agentes o contractor externo: DR-01 debe estar
  cerrado antes de seguir acumulando cambios en `main`.

---

## 5. Deploy y smoke

### Pre-deploy

- [ ] `git fetch` ejecutado.
- [ ] `git log origin/main..HEAD --oneline` revisado.
- [ ] `git status -sb` limpio.
- [ ] Gates locales verdes:
  - [ ] `pnpm --filter web type-check`
  - [ ] `pnpm --filter web lint`
  - [ ] `pnpm --filter web test`
  - [ ] `pnpm --filter web build`
  - [ ] `pnpm --filter @repo/mobile type-check`
  - [ ] `pnpm --filter @repo/mobile lint`
  - [ ] `pnpm --filter @repo/mobile exec jest --watchman=false`
- [ ] Commit + push hechos.

### Deploy

- [ ] Deploy ejecutado solo con:

```bash
./scripts/deploy.sh
```

- [ ] Health post-deploy OK.
- [ ] Smoke prod automatico paso 7/7 OK.
- [ ] Backup app generado.
- [ ] Backup DB pre-deploy generado.
- [ ] Sin rollback.

### Smoke manual obligatorio

- [ ] Browser incognito: login ADMIN.
- [ ] Browser incognito: login CAJERO.
- [ ] Gate `/cambiar-password` probado con usuario temporal.
- [ ] Comprobante publico abierto sin sesion.
- [ ] Reportes PDF/Excel.
- [ ] APK mobile si aplica.

Referencia: `docs/operations/runbook-smoke-prod.md`.

---

## 6. Datos iniciales del cliente

| Item | Estado | Evidencia |
|---|---|---|
| Logo recibido y aplicado | [ ] |  |
| Color/marca confirmados | [ ] |  |
| ADMIN inicial creado | [ ] |  |
| Password temporal entregada por canal seguro | [ ] |  |
| Cajeros iniciales creados | [ ] |  |
| Caja inicial creada | [ ] |  |
| Categorias iniciales creadas | [ ] |  |
| Productos cargados/importados | [ ] |  |
| Clientes frecuentes cargados si aplica | [ ] |  |
| APK entregada/instalada | [ ] |  |

---

## 7. Capacitacion y primer turno

| Momento | Criterio | Estado |
|---|---|---|
| Dia 1 | Owner/admin hizo primer login y cambio password | [ ] |
| Dia 2 | Catalogo cargado y revisado por el cliente | [ ] |
| Dia 3 | Cajeros capacitados 1 hora | [ ] |
| Dia 4 | Primer turno real con soporte disponible | [ ] |
| Dia 4 | Cierre de caja revisado con owner | [ ] |
| Dia 7 | Check-in semanal agendado | [ ] |

Referencia: `docs/product/onboarding-cliente.md`.

---

## 8. Go / No-Go

### Go

El tenant puede operar si:

- [ ] Producto core verificado: login, caja, venta, stock, devolucion,
  comprobante, reportes.
- [ ] Deploy + smoke prod OK.
- [ ] Al menos un admin y un cajero funcionan.
- [ ] Cliente entiende que DyPos CL emite comprobante interno y NO
  reemplaza e-boleta SII.
- [ ] Riesgos abiertos aceptados explicitamente por Pierre.

### No-Go

No habilitar venta real si:

- [ ] Login/admin/cajero falla.
- [ ] Caja no abre o no permite vender.
- [ ] Stock se descuenta mal.
- [ ] Comprobante publico expone RUT completo, email, telefono,
  cajero o IDs internos.
- [ ] Deploy no paso health o smoke.
- [ ] Hay migracion pendiente sin aplicar.
- [ ] Cliente compro SLA/backup y DR-06/DR-10 siguen abiertos.

### Decision final

| Campo | Valor |
|---|---|
| Decision | GO / NO-GO |
| Fecha/hora |  |
| Responsable Dyon Labs |  |
| Riesgos aceptados |  |
| Proximo check-in |  |

---

## 9. Evidencia de cierre

Pegar aqui el resumen final:

```text
Snapshot repo:
git fetch: OK
git log origin/main..HEAD --oneline: <vacio / commits>
git status -sb: <estado>

Deploy:
commit:
backup app:
backup DB:
health:
smoke automatico:
smoke manual:

Cliente:
admin:
cajeros:
productos:
APK:

Riesgos abiertos aceptados:
- DR-01:
- DR-06:
- DR-07 auth:
- DR-10:
```

---

_Ultima actualizacion: 2026-05-03 — Fase 3D.3._
