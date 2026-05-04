---
title: Episodio — Fase 3D.4 patch RBAC urgente
date: 2026-05-04
status: resolved
phase: 3D.4
tags:
  - episode
  - rbac
  - seguridad
  - patch
---

# Episodio — Fase 3D.4 patch RBAC urgente

## Disparador

Smoke manual UI prod paso 5.2 (login CAJERO) ejecutado por Pierre el
2026-05-04 contra `dy-pos.zgamersa.com`. Reportó que el sidebar del
CAJERO mostraba items que el manual reserva para ADMIN.

Auditoría server-side detectó que el problema era más profundo:
**privilege escalation lateral** en productos / categorías /
devoluciones. Detalle completo en
`memory/problems/2026-05-04-rbac-h1-h2-privilege-escalation.md`.

Decisión Pierre 2026-05-04: GO al patch urgente RBAC sin esperar el
modelo profesional completo.

## Scope ejecutado

1. ✅ Server Actions web — 3 archivos migrados de `requireSession`
   a `requireAdmin` (10 call sites).
2. ✅ API REST `/api/v1/devoluciones` POST — agregado
   `requireAdmin(session)` después de `requireAuth`.
3. ✅ Page-level guards — productos, categorías, devoluciones,
   devoluciones/nueva.
4. ✅ Sidebar `nav-config.ts` — Productos, Categorías, Devoluciones
   marcadas `adminOnly: true`.
5. ✅ Tests — 14 tests nuevos en 4 archivos:
   - 5 productos (CAJERO/VENDEDOR denegados × 3 acciones + ADMIN
     happy + VENDEDOR explicit).
   - 5 categorías (mismo patrón).
   - 2 devoluciones actions (CAJERO + VENDEDOR denegados).
   - 2 API REST devoluciones (CAJERO + VENDEDOR → 403).
6. ✅ Memory — problem note creada con análisis completo.
7. ⏳ Manual web + checklist demo: pendientes update post-patch.
8. ⏳ Deploy: pendiente autorización Pierre.

## Lo verificado

| Gate | Resultado |
|---|---|
| `pnpm --filter web type-check` | ✅ |
| `pnpm --filter web lint` | ✅ |
| `pnpm --filter web test` | ✅ 279/279 (era 265, +14 nuevos RBAC) |
| `pnpm --filter web build` | ✅ |
| `pnpm --filter @repo/mobile type-check` | ✅ |
| `pnpm --filter @repo/mobile lint` | ✅ |
| `pnpm --filter @repo/mobile exec jest` | ✅ 74/74 |

## Drift cerrado en este patch

| Capa | Antes | Ahora |
|---|---|---|
| Manual `manual-web.md` | "Productos/Categorías/Devoluciones = ADMIN" | sin cambio (siempre estuvo bien) |
| Sidebar `nav-config.ts` | NO marcaba `adminOnly` | **marca `adminOnly: true`** |
| Page `productos/page.tsx` | sin guard | **redirect ADMIN** |
| Page `categorias/page.tsx` | sin guard | **redirect ADMIN** |
| Page `devoluciones/page.tsx` | sin guard | **redirect ADMIN** |
| Page `devoluciones/nueva/page.tsx` | sin guard | **redirect ADMIN** |
| Server Action `productos/actions.ts` | `requireSession` | **`requireAdmin`** |
| Server Action `categorias/actions.ts` | `requireSession` | **`requireAdmin`** |
| Server Action `devoluciones/actions.ts` | `requireSession` | **`requireAdmin`** |
| API REST `POST /api/v1/devoluciones` | solo `requireAuth` | **+ `requireAdmin(session)`** |
| API REST `POST /api/v1/productos` | ya tenía `requireAdmin` | sin cambio (estaba bien) |

## Lo NO tocado deliberadamente

Pierre dijo: "No expandir scope sin evidencia de agujero real."

| Página | Estado | Por qué no tocada |
|---|---|---|
| `/reportes` | sin guard | Solo lectura. Drift con manual pero NO hay mutación → no es agujero de seguridad. Vale revisar en 3D.5 con permisos `REPORTES_*`. |
| `/alertas` | sin guard | Lectura de stock bajo. Manual no es estricto, cajero verlas tiene sentido operativo. |
| `/clientes` | sin guard | Cajero crea clientes durante venta con RUT. Bloquear rompería flujo. Revisar en 3D.5 con `CLIENTES_CREAR` granular. |

## Impacto temporal mobile

`POST /api/v1/devoluciones` ahora retorna 403 para CAJERO. La app
móvil del cajero tiene botón "Crear devolución" que ahora dispara
error de permiso. Documentado en problem note.

Manual mobile actualizado para reflejar la limitación temporal:
"durante esta versión, devoluciones se hacen desde panel web ADMIN".

## Validación browser local — 2026-05-04 (Pierre + Codex/Playwright MCP)

Después de los gates verde, Pierre mandó smoke browser end-to-end con
sesión web nativa NextAuth (no JWT mobile). Codex usó Playwright MCP
oficial Microsoft para automatización; Pierre validó manual en
paralelo. Ambos reportes coincidieron.

### Setup

- Server: `pnpm --filter web dev` en localhost:3000.
- Repo: hash `299edc1`, working tree clean post-smoke (verificado).
- Browser: Chromium incógnito vía Playwright MCP.

### Resultados

| Fase | Verificación | Resultado |
|---|---|---|
| 1-2 | ADMIN login form + abrir `/productos`, `/categorias`, `/devoluciones` | ✅ los 3 retornan 200 con title correcto |
| 3 | Logout via `/api/auth/signout` → cookies limpiadas → `/login` | ✅ |
| 4-5 | Sidebar CAJERO: 8 items visibles (Dashboard, Caja, Movimientos, Ventas, Clientes, Alertas, Reportes, Mi Perfil) | ✅ |
| 4-5 | Sidebar CAJERO: 7 items ocultos (Productos, Categorías, Devoluciones, Usuarios, Cajas, Mobile APK, API Docs) | ✅ |
| 6 | CAJERO escribe `/productos` manual | ✅ redirect → `/?error=admin_required` |
| 6 | CAJERO escribe `/categorias` manual | ✅ redirect → `/?error=admin_required` |
| 6 | CAJERO escribe `/devoluciones` manual | ✅ redirect → `/?error=admin_required` |
| 6 | CAJERO escribe `/devoluciones/nueva?ventaId=1` manual | ✅ redirect → `/?error=admin_required` |

### Evidencia archivada (fuera del repo)

`/tmp/smoke-3d4-evidencia/`:
- `smoke-3d4-cajero-sidebar.png` (130KB)
- `smoke-3d4-cajero-blocked.png` (130KB)

### Observaciones menores no bloqueantes

Codex registró 3 hallazgos cosméticos / UX que NO afectan RBAC:

1. **Sidebar "Alertas1"**: el badge de count se renderiza pegado al
   texto sin espacio (accessible name concatenado). Visualmente OK por
   estilo del badge. Mejora UX, no bug RBAC.
2. **Bloqueo silencioso**: el redirect a `/?error=admin_required` deja
   la query en URL pero no hay toast/banner UI mostrando "No tenés
   permisos" al cajero. Mejora UX deseable. **El bloqueo de seguridad
   está, falta el feedback visual.**
3. **`/perfil` sin botón "Cerrar sesión" visible**: Codex tuvo que ir a
   `/api/auth/signout` directo. Puede estar en el dropdown del avatar
   superior derecho — no exploró. Verificar en próxima sesión UI; si
   no existe, agregar.

## Lección operativa documentada

**G-WEB-RBAC-REDIRECT-CHECK** — cómo validar redirects server-side de
Next.js desde herramientas automatizadas:

- `playwright.goto(url, { waitUntil: 'commit' })` + `page.url()` da
  **falso negativo**: captura la URL al primer byte de respuesta,
  ANTES de que `redirect()` server-side complete. La URL que ve es
  `/productos` (la solicitada), no `/?error=admin_required` (la
  resultante).
- `curl -L --max-redirs 0` también puede fallar porque NextAuth/Next
  streaming response embebe el redirect en el body.
- **Patrón correcto**: `playwright.goto(url)` con default
  `waitUntil: 'load'` + `evaluate(() => location.href)` post-render.
  Captura el estado real post-redirect.

Mi propio smoke con curl `--max-redirs 0` cayó en el mismo falso
negativo y por eso reporté antes "page guards no funcionan en dev".
Eran funcionales — el método de validación estaba mal.

## Estado al cierre

✅ **Fase 3D.4 PASA**:

- Server Actions productos/categorías/devoluciones: `requireAdmin`
  efectivo. Tests Vitest 14/14 verde.
- API REST `POST /api/v1/devoluciones`: `requireAdmin(session)`
  efectivo (smoke local 403 verificado).
- Page-level guards: redirect `?error=admin_required` confirmado
  con browser real para CAJERO en las 4 rutas.
- Sidebar `adminOnly`: confirmado con DOM enumeration cajero (8/8
  items correctos visibles, 7/7 ocultos).
- Manual mobile actualizado (devoluciones temporal solo web ADMIN).
- Checklist demo sección 5.2 actualizado con spec correcto.
- ADR-003 esqueleto creado para Fase 3D.5.

🟢 **Listo para deploy a `dy-pos.zgamersa.com`** vía
`scripts/deploy.sh` cuando Pierre dé GO explícito.

## Riesgos del deploy

- Cualquier flujo de cajero móvil que dependa de `POST /api/v1/devoluciones`
  recibirá 403. **Esperado y aceptado por Pierre** durante el patch.
- Cajero web que tenía bookmark a `/productos`, `/categorias` o
  `/devoluciones` será redirigido a `/?error=admin_required`. UX
  esperado, no es regresión. Posible mejora UX: toast de error al
  redirect (anotado en observaciones menores arriba).
- 14 tests nuevos en suite web, todos verde — no introducen flakiness.
