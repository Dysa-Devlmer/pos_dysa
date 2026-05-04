---
title: Episodio — Fase 3D.4 patch RBAC urgente
date: 2026-05-04
status: in-progress
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

## Pendiente

- Update manual web (`docs/product/manual-web.md`) post-patch para
  consolidar el lenguaje "ADMIN-only" donde corresponde.
- Update manual mobile (`docs/product/manual-mobile.md`) sobre
  devoluciones temporal.
- Update checklist demo (`tenant-go-live-dyonlabs-demo.md`) sección
  5.2 con el resultado correcto del sidebar CAJERO esperado.
- Ajustar el checklist plantilla base para que la próxima auditoría
  no caiga en el mismo error de espec del cajero.
- Crear ADR esqueleto `docs/adr/003-rbac-roles-permisos.md` (Fase 3D.5).
- Commit + push + deploy + retomar smoke 5.x desde el principio.

## Riesgos del deploy

- Cualquier flujo de cajero móvil que dependa de `POST /api/v1/devoluciones`
  recibirá 403. **Esperado y aceptado por Pierre** durante el patch.
- Cajero web que tenía bookmark a `/productos`, `/categorias` o
  `/devoluciones` será redirigido a `/?error=admin_required`. UX
  esperado, no es regresión.
- 14 tests nuevos en suite web, todos verde — no introducen flakiness.
