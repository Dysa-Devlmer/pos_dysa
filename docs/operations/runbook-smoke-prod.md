# Runbook — Smoke prod (DyPos CL)

> Checklist post-deploy. Ejecutar cada vez que `scripts/deploy.sh`
> termina, antes de considerar el deploy "cerrado". Cubre la
> verificación que el script automatizado `scripts/smoke-prod.sh` no
> puede hacer (interacciones de UI reales).
> Relacionado: DR-07 en `docs/architecture/decision-log.md`.

---

## Parte A — Smoke automatizado (script)

Esto lo corre cualquier agente o Pierre desde su máquina. Read-only,
no ensucia AuditLog, no muta datos.

### A.1 — Smoke básico (sin credenciales)

```bash
./scripts/smoke-prod.sh https://<dominio-tenant>
```

Verifica:
- `GET /api/health` retorna 200 con `status:"ok"` + `database:"connected"`.
- `GET /login` retorna 200.
- `GET /privacidad` retorna 200 (requisito Apple/Google Play).
- `GET /perfil` sin sesión redirige (302/307) — gate funcionando.

Exit code 0 = todo OK. Exit code 1 = al menos un check falló.

**Cuándo usar**: monitoreo simple, CI post-deploy, primer chequeo
después de provisión nueva.

### A.2 — Smoke con auth (recomendado tras cada deploy)

Setea credenciales del tenant en variables de ambiente y agrega
`--with-auth`:

```bash
export SMOKE_ADMIN_EMAIL='admin@<tenant>.cl'
export SMOKE_ADMIN_PASSWORD='<password>'
./scripts/smoke-prod.sh https://<dominio-tenant> --with-auth
```

Suma a la lista anterior:
- `POST /api/v1/auth/login` retorna 200 + JWT en body.
- `GET /api/v1/dashboard` con Bearer retorna 200.
- `GET /api/v1/productos` con Bearer retorna 200.
- Header `Authorization: NotBearer` retorna 401 (sanity).

**Cuándo usar**: tras cada deploy a tenant operativo.

> ⚠️ NO hardcodear credenciales en el repo o en scripts. Usa solo
> env vars. NO pasarlas por `--password=...` (queda visible en
> `ps aux`). Si necesitás guardarlas para uso recurrente, usar
> `op` (1Password CLI) o `pass` con scope al usuario admin.

---

## Parte B — Smoke manual UI (browser)

Cosas que el script no puede verificar porque requieren render del
HTML compilado, cookies de sesión, o flujos con Server Actions
(`$ACTION_ID` cambia por build).

### B.1 — Login admin web

1. Browser incógnito → `https://<dominio>/login`.
2. Email + password admin → submit.
3. Esperado: redirect a `/`.
4. Dashboard renderiza con KPIs reales (no estado vacío "Aún no hay
   ventas" si el tenant ya operó hoy).

### B.2 — Login cajero web

1. Logout.
2. Browser incógnito → `https://<dominio>/login`.
3. Email + password cajero.
4. Esperado: redirect a `/`. Dashboard renderiza. Sidebar muestra
   secciones de cajero (sin Usuarios).

### B.3 — Gate de cambio de contraseña inicial (Fase 3C.2)

> Solo aplica si en este deploy se creó un usuario nuevo o se
> reseteó password.

1. Logout.
2. Login con el usuario reseteado/nuevo (email + temporal).
3. Esperado: redirect automático a `/cambiar-password` (no llega al
   dashboard).
4. Llenar formulario con nueva password distinta a la temporal.
5. Esperado: redirect a `/` y dashboard normal.

### B.4 — Comprobante público compartible (Fase 3C.1)

1. Logueado como admin → `/ventas` → entrar a una venta.
2. Click "Compartir" → debe aparecer link `/comprobante/[token]`.
3. Copiar el link, abrir en browser incógnito (sin sesión).
4. Esperado: 200, render del comprobante. RUT enmascarado tipo
   `12.***.***-9`. Nombre tipo `Pierre B.`. Sin datos del cajero.
5. Probar con devolución (`/comprobante/devolucion/[token]`):
   - Sin campo "motivo" visible (lo removimos en patch 3C.1).

### B.5 — POS móvil (APK)

Solo si el deploy incluyó nueva versión APK.

1. En device de prueba, instalar APK nueva sobre la vieja.
2. Login con cajero del tenant.
3. Crear una venta de prueba con stock real → cobrar efectivo →
   confirmar.
4. Verificar que aparece en `/ventas` del web.
5. Eliminar la venta de prueba desde web (admin).

### B.6 — Reportes y exports

1. `/reportes` → seleccionar rango de fechas.
2. Click "Descargar PDF" → debe bajar archivo válido.
3. Click "Descargar Excel" → debe bajar `.xlsx` válido.

---

## Parte C — Frecuencia recomendada

| Trigger | Smoke A.1 | Smoke A.2 | Smoke B.1–B.4 | Smoke B.5 | Smoke B.6 |
|---|---|---|---|---|---|
| Deploy hotfix prod | ✅ | ✅ | B.1 | — | — |
| Deploy feature web | ✅ | ✅ | ✅ | — | — |
| Deploy con APK nueva | ✅ | ✅ | ✅ | ✅ | — |
| Provisión tenant nuevo | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mensual (uptime check) | ✅ | — | — | — | — |
| Tras restore de backup | ✅ | ✅ | ✅ | — | ✅ |

---

## Parte D — Si algo falla

### D.1 — `/api/health` retorna 503

Causa típica: BD caída o sin migrar.

```bash
ssh root@<IP_VPS>
docker logs pos-postgres --tail 50
docker logs pos-web --tail 50
docker exec pos-postgres pg_isready -U pos_admin
```

Si BD caída:
```bash
docker compose restart pos-postgres
# Esperar 10s, reintentar /api/health.
```

Si BD up pero `/api/health` 503: el `prisma.$queryRaw` falla. Migración
incompleta o credenciales rotas en `.env.docker`. Investigar logs.

### D.2 — Login retorna 200 pero sin token (response sin `"token":"..."`)

Probable: `NEXTAUTH_SECRET` falta o cambió en este deploy.

```bash
ssh root@<IP_VPS>
grep NEXTAUTH_SECRET /opt/pos-chile/.env.docker
# Debe ser >32 chars, no placeholder.
```

Si rotó el secret entre deploys, todos los JWT viejos quedan
inválidos pero el login nuevo debería funcionar. Si tampoco funciona,
revisar `apps/web/lib/check-env.ts` (debería rechazar deploy con
secret inválido en runtime).

### D.3 — `/perfil` retorna 200 sin sesión (regresión grave)

⚠️ **Brecha de auth.** El middleware no está gateando. Verificar:

```bash
grep matcher apps/web/middleware.ts
# Debe excluir solo: api/auth, api/health, api/docs, api/v1, api/mobile,
# _next/static, _next/image, manifest, favicon, icon-*, privacidad,
# comprobante. NADA MÁS.
```

Si /perfil aparece en la exclusión → revertir el deploy
inmediatamente y crear `memory/problems/<fecha>-middleware-leak.md`.

### D.4 — Smoke falla post-restore

Patrón típico tras restore:
- conteos `audit_logs` y `ventas` MENOR que en prod (es esperado:
  faltan los registros entre el dump y "ahora").
- Si `productos.count = 0` o `categorias.count = 0` → restore
  incompleto. Reintentar §4 / §5 del runbook de backup.

---

## Parte E — Reportar al cierre del deploy

Tras smoke OK, el agente / Pierre reporta en chat con:

```
Snapshot repo: <git log/status>
Smoke A.1: PASS=N FAIL=0 (o detalle del fallo)
Smoke A.2: PASS=N FAIL=0 (si aplica)
Smoke manual: B.1✓ B.2✓ ... (marcar los aplicables)
Tiempo total deploy + smoke: NN min
Anomalías: <ninguna / detalle>
```

Si todo OK → registrar en
`memory/episodes/YYYY-MM-DD-deploy-<tag>.md`.

---

_Última actualización: 2026-05-03 — Fase 3D._
