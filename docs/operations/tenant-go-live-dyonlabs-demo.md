# Go-live tenant — Dyon Labs demo (`dy-pos.zgamersa.com`)

> **Tipo de tenant**: ambiente principal de Dyon Labs.
> **Decisión Pierre + Codex 2026-05-03**:
> - GO como demo interna y validación comercial.
> - NO-GO temporal para cliente pagante hasta cerrar smoke manual UI
>   prod + DR-06 + DR-10.
>
> Este documento es **copia evidenciada** de
> `docs/operations/tenant-go-live-checklist.md` (plantilla base, no
> editar). Cualquier verificación o pendiente vive acá, no en la
> plantilla.

---

## 0. Regla de uso (heredada de plantilla)

Estados permitidos:

| Estado | Significado |
|---|---|
| `[x]` | Verificado con evidencia objetiva |
| `[ ]` | Pendiente |
| `[n/a]` | No aplica al plan/tenant actual |
| `[defer]` | Diferido explícitamente, no bloquea go-live |

---

## 1. Datos del tenant

| Campo | Valor |
|---|---|
| Nombre comercial | Dyon Labs (demo interna) |
| Razón social | n/a — ambiente propio Dyon Labs |
| RUT empresa | n/a |
| Contacto principal | Pierre Benites Solier |
| Email owner/admin | (admin del seed local: `admin@pos-chile.cl` en demo) |
| Plan contratado | n/a — demo interna, no se cobra |
| Fecha objetivo go-live | 2026-05-03 (demo) · cliente pagante = sin fecha hasta cerrar bloqueantes |
| Dominio/subdominio | `dy-pos.zgamersa.com` |
| VPS / IP | `64.176.21.229` |
| Ambiente | Producción (uso interno) |

### Alcance vendido / habilitado en este ambiente

- [x] Panel web para ADMIN (verificado en código + smoke prod).
- [x] Panel web para CAJERO.
- [x] APK Android para cajero (firmada release, distribuida via
  `apk-dypos.zgamersa.com`).
- [x] Importación CSV de productos (Fase 3A cerrada,
  `apps/web/app/(dashboard)/productos/import-actions.ts`).
- [x] Comprobantes internos compartibles por link
  (`/comprobante/[token]` y `/comprobante/devolucion/[token]`,
  Fase 3C.1 cerrada).
- [x] Devoluciones (Fase 12 implementada).
- [x] Reportes PDF/Excel (Fase 7 implementada).
- [ ] Monitoreo externo incluido — **DR-06 pendiente Pierre**.
- [ ] Backup off-site incluido — **DR-10 pendiente Pierre**.
- [n/a] Soporte primer turno incluido — no hay cliente real.

### No prometido en este go-live

- [defer] Emisión de e-boleta SII (Sprint F-8, ~6–8 semanas).
- [defer] Impresora térmica Bluetooth nativa.
- [defer] Cajón de dinero automático.
- [defer] WhatsApp Business API.
- [defer] iOS app móvil.
- [defer] Multi-sucursal.

---

## 2. Readiness de producto

Estado al 2026-05-03. Lo verificable en código/repo está cerrado;
la verificación UI con sesión real queda pendiente del smoke manual
(sección 5).

| Área | Criterio | Estado | Evidencia |
|---|---|---|---|
| Login web | ADMIN puede iniciar sesión en browser incógnito | [ ] | Pendiente smoke manual UI |
| Login web cajero | CAJERO puede iniciar sesión y no ve Administración | [ ] | Pendiente smoke manual UI |
| Password temporal | Usuario nuevo/reseteado entra a `/cambiar-password` antes del dashboard | [x] (código) / [ ] (UI) | Código: `apps/web/app/cambiar-password/` + gate en `app/(dashboard)/layout.tsx`. UI sin verificar end-to-end |
| Caja | Existe una caja operativa y se puede abrir turno | [ ] | Pendiente smoke manual UI |
| Productos | Hay categorías y productos cargados | [ ] | Pendiente smoke manual UI (seed local existe, prod desconocido) |
| CSV | Si hay >30 productos, import CSV probado con plantilla | [n/a] | Demo no tiene catálogo extenso |
| Clientes | Clientes frecuentes cargados si aplica | [n/a] | Demo no requiere |
| Venta web | Venta de prueba creada y luego anulada/eliminada según procedimiento | [ ] | Pendiente smoke manual UI |
| Stock | Stock baja al vender y se recupera al eliminar/anular según flujo | [ ] | Pendiente smoke manual UI (lógica cubierta por 8 regression tests F-0.1) |
| Devolución | Devolución de prueba creada y verificada | [ ] | Pendiente smoke manual UI |
| Comprobante público | Link `/comprobante/[token]` abre sin sesión y muestra PII enmascarada | [ ] | Pendiente smoke manual UI. Código verificado: middleware excluye `/comprobante`, `maskNombre`/`maskRut` aplicados en `apps/web/lib/public-receipts.ts` |
| Reportes | PDF y Excel descargan correctamente | [ ] | Pendiente smoke manual UI |
| Alertas stock | Productos bajo stock aparecen en Alertas | [ ] | Pendiente smoke manual UI |
| Perfil | Usuario puede cambiar password y datos permitidos | [ ] | Pendiente smoke manual UI |

Referencia:
- Manual web: `docs/product/manual-web.md`.
- Smoke UI: sección 5 de este documento + `docs/operations/runbook-smoke-prod.md` Parte B.

---

## 3. Readiness mobile

| Área | Criterio | Estado | Evidencia |
|---|---|---|---|
| APK | Versión instalada coincide con release publicada | [ ] | Pendiente smoke device |
| Firma | APK instala con `adb install -r` preservando datos | [x] | Validado en releases anteriores; mismo keystore |
| Login mobile | CAJERO puede iniciar sesión en el device físico | [ ] | Pendiente smoke device |
| Password temporal | Mobile bloquea login si el usuario aún debe cambiar password | [x] | `apps/web/app/api/v1/auth/login/route.ts` retorna 403 con mensaje "Debes cambiar tu contraseña temporal en el panel web" cuando `usuario.mustChangePassword=true` |
| Catálogo | Productos sincronizan al device | [ ] | Pendiente smoke device |
| Venta mobile | Venta de prueba creada desde mobile y aparece en web | [ ] | Pendiente smoke device |
| Offline | Venta offline de prueba queda en cola y sincroniza al volver internet | [ ] | Pendiente smoke device |
| Idempotency | Retry no duplica venta sincronizada | [x] (tests) / [ ] (smoke) | Cubierto por tests 73/73 mobile + contract test web |
| Sentry mobile | Error controlado llega a Sentry | [x] | issue `POS-CHILE-MOBILE-1` registrado, validado en Fase 3C |
| Versioning | `/api/mobile/manifest` retorna release vigente | [x] | endpoint público confirmado en middleware exclusion + tests |

Referencia:
- Manual mobile: `docs/product/manual-mobile.md`.
- Release APK: `docs/mobile-release-runbook.md`.

---

## 4. Readiness operativa

| DR | Control | Estado go-live | Evidencia / link |
|---|---|---|---|
| DR-01 | Branch protection enforced en `main` | [ ] **Pendiente Pierre** (gobernanza interna) | `memory/open-loops/dr-01-branch-protection.md` — push warnings observados |
| DR-06 | Monitor externo `/api/health` + alerta validada | [ ] **Pendiente Pierre — bloqueante cliente pagante** | `memory/open-loops/dr-06-monitoreo-externo.md`. Pre-check: 10/10 HTTP 200, 152–602 ms (Codex 2026-05-03) |
| DR-07 | Smoke prod básico en deploy + runbook UI | [x] Verificado | `docs/operations/runbook-smoke-prod.md`. 2 deploys reales con paso 7/7 PASS=6 / FAIL=0 (commits `9d49b7e`, `f87fb10`). Refactor `ef6d218` cambió rollback agresivo a opt-in (`SMOKE_ROLLBACK_ON_FAIL=1`) |
| DR-07 | Smoke prod con auth | [defer] | Pendiente decisión Pierre — no bloquea cliente pagante |
| DR-10 | Backup local pre-deploy | [x] Activo | `scripts/deploy.sh` paso 5a-bis. Última muestra: `pre-deploy-20260503-214359.sql.gz` |
| DR-10 | AWS CLI / entorno VPS listo para off-site | [x] Verificado | Codex instaló AWS CLI v2 (`aws-cli/2.34.41`) en VPS prod. Precheck: PASS=9 / WARN=0 / FAIL=0 / INFO=11 (commit `618e776`) |
| DR-10 | Bucket + key + cron off-site + restore test | [ ] **Pendiente Pierre — bloqueante cliente pagante** | `docs/operations/runbook-backup-restore.md` §3 |

### Decisión de operación (Pierre + Codex 2026-05-03)

- Para `dy-pos.zgamersa.com` como **demo interna**:
  - DR-01 / DR-06 / DR-10 pueden quedar abiertos (riesgo aceptado).
  - GO confirmado.
- Para **primer cliente pagante**:
  - **NO-GO** hasta cerrar DR-06 + DR-10 + smoke manual UI prod.
  - DR-01 = bloqueo de gobernanza interna, no bloqueo funcional del cliente.

---

## 5. Smoke manual UI prod (Pierre o agente con sesión browser)

Esta sección reemplaza la sección 5 "Deploy y smoke" de la plantilla
con instrucciones EJECUTABLES — pasos exactos en browser para cubrir
lo que el smoke automatizado no toca. Pegar evidencia (URL, hora,
captura, conteo) bajo cada subsección al ejecutar.

> **Antes de empezar**: usar **Chrome o Edge en modo incógnito**
> para evitar contaminación de sesiones previas. Tener a mano email
> + contraseña del admin del tenant.

### 5.0 — Sanity smoke automatizado pre-flight

```bash
./scripts/smoke-prod.sh https://dy-pos.zgamersa.com
```

Esperado: `PASS=6 · FAIL=0` · exit 0.

- [ ] Ejecutado · resultado: ___________ · hora: ___________

### 5.1 — Login ADMIN

1. Navegador incógnito → `https://dy-pos.zgamersa.com/login`.
2. Email + contraseña del ADMIN.
3. Click "Iniciar sesión".

Esperado:
- Redirect a `/`.
- Dashboard renderiza con KPIs (no pantalla vacía).
- Sidebar muestra: Inicio, POS Caja, Ventas, Devoluciones, Productos,
  Categorías, Clientes, Cajas, Alertas, Reportes, Usuarios,
  Mi perfil, Mobile Releases, Docs.

- [ ] OK · evidencia: ___________

### 5.2 — Login CAJERO

1. Logout (avatar arriba derecha → "Cerrar sesión").
2. Navegador incógnito → `/login` con cajero.

Esperado:
- Redirect a `/`.
- Sidebar SIN: Productos, Categorías, Usuarios, Mobile Releases.
  (Cajero solo ve operación, no configuración.)

- [ ] OK · evidencia: ___________

### 5.3 — Gate `/cambiar-password` con usuario temporal

> Pre-requisito: ADMIN crea o resetea un usuario CAJERO de prueba
> (Usuarios → "+ Nuevo" o "Resetear password"). Eso debe setear
> `mustChangePassword=true` automáticamente.

1. Logout.
2. Login con email del cajero temporal + contraseña recién asignada.

Esperado:
- Redirect inmediato a `/cambiar-password`. **NO** llega al dashboard.
- Form pide contraseña actual (la temporal) + nueva + confirmar.
- Submit con nueva password distinta → redirect a `/`.
- Logout y re-login con la nueva contraseña → entra al dashboard
  normal (gate ya no dispara).

- [ ] OK · evidencia: ___________

### 5.4 — Apertura de caja

1. Logueado como CAJERO o ADMIN → sidebar **Cajas** o **POS Caja**.
2. Si no hay caja abierta, el sistema redirige a `/caja/abrir`
   (verificado en `apps/web/app/(dashboard)/caja/`).
3. Ingresar monto inicial (ej. `10000`).
4. Confirmar.

Esperado:
- Redirect a `/caja/<aperturaId>` o `/caja` con caja activa.
- POS Caja queda accesible.

- [ ] OK · evidencia: ___________ · monto inicial: ___________

### 5.5 — Venta de prueba

1. **POS Caja** → buscar producto por nombre o código.
2. Agregar 2 unidades de algún producto.
3. (Opcional) aplicar descuento.
4. Cobrar:
   - Método: EFECTIVO.
   - Monto recibido > total.
5. **Finalizar venta**.

Esperado:
- Modal de comprobante muestra: número boleta `B-YYYYMMDD-XXXXXXXX`,
  items, IVA 19 %, total, vuelto.
- Stock del producto baja por la cantidad vendida (verificar en
  Productos).
- Venta aparece en `/ventas`.

- [ ] OK · numeroBoleta: ___________ · stock antes/después: ___________

### 5.6 — Comprobante público en incógnito

1. Desde el modal o desde `/ventas/<id>`, copiar el link
   "Compartir" → debe ser de la forma
   `https://dy-pos.zgamersa.com/comprobante/<token-22-chars>`.
2. Abrir el link en **otra ventana incógnita SIN sesión**.

Esperado:
- HTTP 200.
- Render del comprobante con los items y totales.
- **PII enmascarada**: si la venta tiene cliente con RUT, el RUT
  aparece como `12.***.***-9` y el nombre como `Pierre B.`.
- **NO** debe mostrar: nombre del cajero, IDs internos, email o
  teléfono del cliente, motivo (en devoluciones).
- Footer aclaratorio "Comprobante interno — no es boleta SII".

- [ ] OK · token usado: ___________ · masking confirmado

### 5.7 — Devolución de prueba

1. Volver a sesión ADMIN.
2. `/ventas/<id>` → botón "Devolver" o `/devoluciones`.
3. Devolución parcial: 1 unidad del producto vendido.
4. Confirmar con motivo.

Esperado:
- Aparece en `/devoluciones`.
- Stock del producto vuelve a subir por 1 unidad.
- Comprobante de devolución accesible en `/comprobante/devolucion/<token>`
  (incógnito) sin mostrar `motivo` (texto libre interno).

- [ ] OK · stock recuperado: ___________ · token devolución: ___________

### 5.8 — Reportes PDF/Excel

1. `/reportes` → seleccionar rango "Hoy" o "Esta semana".
2. Click "Descargar PDF".
3. Click "Descargar Excel".

Esperado:
- PDF descarga válido (abre en visor sin error, contiene la venta
  de prueba).
- Excel descarga `.xlsx` (abre en Excel/LibreOffice/Numbers, columnas
  legibles).

- [ ] PDF OK · evidencia: ___________
- [ ] Excel OK · evidencia: ___________

### 5.9 — APK mobile (si Pierre tiene device a mano)

1. En device Android, abrir app DyPos CL del tenant.
2. Login como cajero.
3. Crear venta de prueba (igual que 5.5 pero desde mobile).
4. Verificar que aparece en `/ventas` del web.
5. Eliminar la venta de prueba desde web.

- [n/a] / [ ] OK · evidencia: ___________

### 5.10 — Cierre de caja

1. **Cajas** → caja activa → "Cerrar caja".
2. El sistema muestra monto teórico esperado en efectivo.
3. Ingresar monto real contado (puede ser igual al teórico para
   cuadrar 0).
4. Confirmar.

Esperado:
- Caja queda cerrada con diferencia 0 (o el delta correspondiente).
- No se puede vender sin reabrir.

- [ ] OK · diferencia: ___________

### 5.11 — Limpieza post-smoke

- [ ] Venta de prueba eliminada (Ventas → ... → Eliminar).
- [ ] Devolución de prueba eliminada (si aplica).
- [ ] Usuario CAJERO temporal desactivado o eliminado.
- [ ] AuditLog revisado: las acciones de prueba están registradas
  (esperado, no es bug).

---

## 6. Datos iniciales del cliente

Para `dy-pos.zgamersa.com` (demo Dyon Labs), no aplican como ítems
de cliente comercial — es ambiente propio.

| Item | Estado | Evidencia |
|---|---|---|
| Logo recibido y aplicado | [n/a] | Demo usa branding default |
| Color/marca confirmados | [n/a] | Demo usa default |
| ADMIN inicial creado | [x] | seed local + admin de prod |
| Password temporal entregada por canal seguro | [n/a] | Pierre custodia |
| Cajeros iniciales creados | [n/a] | Demo no requiere |
| Caja inicial creada | [ ] | Pendiente smoke 5.4 |
| Categorías iniciales creadas | [ ] | Pendiente smoke 5.4/5.5 o verificación UI prod. (Seed local incluye "Almacén" pero NO es evidencia del tenant prod.) |
| Productos cargados/importados | [ ] | Pendiente smoke 5.4/5.5 o verificación UI prod. (Seed local crea `DEMO-7800001..5` pero NO es evidencia del tenant prod.) |
| Clientes frecuentes cargados si aplica | [n/a] | — |
| APK publicada | [x] | Release pública en `apk-dypos.zgamersa.com` (verificado en Fase 2A — DNS + SSL + nginx + manifest) |
| APK instalada/probada en device | [ ] | Pendiente smoke 5.9 con device real |

---

## 7. Capacitación y primer turno

[n/a] — no aplica para demo interna. Se completará en una copia
nueva del checklist cuando se capte primer cliente pagante real.

---

## 8. Go / No-Go

### Go (demo interna)

- [x] Producto core verificado **en código y gates locales**: login,
  password temporal, caja, venta, stock, devolución, comprobante,
  reportes — type-check, lint, tests y build verde. **NO equivale a
  smoke UI con sesión real en prod**, eso vive en sección 5.
- [x] Deploy + smoke prod **automatizado** (read-only) OK
  (2 deploys reales 2026-05-03 con paso 7/7 PASS=6 / FAIL=0).
  Cubre `/api/health`, `/login`, `/privacidad`, gate `/perfil`. **NO
  cubre** flujos UI con sesión.
- [ ] Smoke manual UI prod (sección 5) — pendiente ejecución por
  Pierre en browser.
- [x] Riesgos abiertos aceptados explícitamente por Pierre (DR-01,
  DR-06, DR-10) como "demo interna sin SLA".

### No-Go (cliente pagante real)

- [ ] Smoke manual UI prod NO ejecutado contra `dy-pos.zgamersa.com`
  con sesión real (sección 5 vacía).
- [ ] DR-06 sin monitor externo activo.
- [ ] DR-10 sin off-site backup ni restore-test ejercitado.

### Decisión final

| Campo | Valor |
|---|---|
| Decisión | **GO (demo interna Dyon Labs)** + **NO-GO (cliente pagante)** |
| Fecha/hora | 2026-05-03 |
| Responsable Dyon Labs | Pierre Benites Solier |
| Riesgos aceptados (demo) | DR-01, DR-06, DR-10 abiertos como riesgo temporal interno |
| Próximo check-in | Cuando Pierre cierre DR-06 + DR-10 + ejecute sección 5 contra prod |

---

## 9. Evidencia de cierre — para llenar al ejecutar smoke manual

```text
Snapshot repo:
git fetch:
git log origin/main..HEAD --oneline:
git status -sb:

Smoke manual UI prod (sección 5):
5.0 sanity automatizado:
5.1 login ADMIN:
5.2 login CAJERO:
5.3 gate /cambiar-password:
5.4 apertura de caja:
5.5 venta de prueba — numeroBoleta:
5.6 comprobante público incógnito — token:
5.7 devolución — token:
5.8 reportes PDF / Excel:
5.9 APK mobile:
5.10 cierre de caja:
5.11 limpieza post-smoke:

Riesgos abiertos aceptados (demo):
- DR-01: pendiente Pierre — gobernanza interna
- DR-06: pendiente Pierre — bloqueante cliente pagante
- DR-07 auth: defer
- DR-10: pendiente Pierre — bloqueante cliente pagante
```

---

## 10. Notas de auditoría 2026-05-03

- Plantilla base `tenant-go-live-checklist.md` NO se modificó.
- Esta copia es la primera evidenciada según política de la sección 0
  (no editar plantilla, copiar por tenant).
- Si Pierre cierra DR-06 + DR-10 + ejecuta sección 5: actualizar este
  documento con evidencia y cambiar la decisión final a "GO comercial".
- Si Pierre capta primer cliente pagante real: copiar nuevamente la
  plantilla a `docs/operations/tenant-go-live-<slug-cliente>.md` y
  rellenar con datos del cliente real, NO reusar este archivo.

---

_Última actualización: 2026-05-03 — Fase 3D.3 (auditoría CEO Pierre)._
