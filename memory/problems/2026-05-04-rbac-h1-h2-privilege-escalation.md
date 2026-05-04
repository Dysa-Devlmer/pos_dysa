---
title: H1+H2 — Privilege escalation lateral en productos / categorías / devoluciones
date: 2026-05-04
status: resolved
severity: high
tags:
  - problema
  - seguridad
  - autorizacion
  - rbac
---

# Problema — Privilege escalation lateral en productos / categorías / devoluciones

## Síntoma

Durante el smoke manual UI prod del paso 5.2 (login CAJERO), Pierre
detectó que el cajero veía en el sidebar items que el manual reserva
para ADMIN: Productos, Categorías, Devoluciones.

Yo verifiqué contra código y detecté que el problema era más serio
que el sidebar — las **Server Actions** y la **API REST** que respaldan
esas vistas no chequeaban rol, solo sesión presente.

## Causa real

3 archivos de Server Actions usaban un helper `requireSession()` que
solo verificaba `session?.user`, NO chequeaba `rol === "ADMIN"`:

- `apps/web/app/(dashboard)/productos/actions.ts` — `crearProducto`,
  `actualizarProducto`, `eliminarProducto`.
- `apps/web/app/(dashboard)/categorias/actions.ts` — `crearCategoria`,
  `actualizarCategoria`, `eliminarCategoria`.
- `apps/web/app/(dashboard)/devoluciones/actions.ts` — `crearDevolucion`
  + 2 acciones secundarias.

Adicionalmente: `POST /api/v1/devoluciones` (consumido por la app
móvil) tampoco invocaba `requireAdmin(session)` después de
`requireAuth`, mientras que `POST /api/v1/productos` sí lo hacía.

El `nav-config.ts` no tenía `adminOnly: true` en esos 3 items, por lo
que el sidebar los mostraba a CAJERO/VENDEDOR. El page-level tampoco
gateaba — drift completo entre 4 capas (manual, sidebar, page, server).

## Impacto

- **CAJERO o VENDEDOR podían:**
  - Crear, editar y eliminar productos (precios, stock, catálogo
    entero) desde la UI web.
  - Crear, editar y eliminar categorías.
  - Crear devoluciones desde web y desde la app móvil.
- **Vector de fraude posible:** un cajero malicioso podía manipular
  precios, registrar productos fantasma o emitir devoluciones falsas
  sin aprobación de ADMIN.
- **Severidad:** alta. Privilege escalation lateral con potencial
  impacto financiero y contable.

## Evidencia

- Smoke manual UI prod 5.2 ejecutado por Pierre 2026-05-04 contra
  `dy-pos.zgamersa.com` — capturas en chat de la sesión.
- `grep "requireSession" apps/web/app/(dashboard)/productos/actions.ts`
  → 3 ocurrencias (helper local sin chequeo de rol).
- Drift verificado contra `docs/product/manual-web.md` que listaba
  Productos/Categorías/Devoluciones como ADMIN pero código permitía
  cualquier sesión.

## Solución aplicada — Patch RBAC Fase 3D.4 (commit pendiente)

### Server Actions (web)

Reemplazado `requireSession` por `requireAdmin` en los 3 archivos:

```ts
async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  if (session.user.rol !== "ADMIN") {
    throw new Error("Permiso denegado: solo ADMIN puede ...");
  }
  return session;
}
```

10 call sites migrados (3 productos + 3 categorías + 1 crearDevolucion +
2 helpers internos de devoluciones + 1 que ya existía).

### API REST

`POST /api/v1/devoluciones` ahora invoca `requireAdmin(session)`
después de `requireAuth`. Mismo patrón que ya tenía
`POST /api/v1/productos`.

### Page-level guards

Agregadas redirecciones en:

- `apps/web/app/(dashboard)/productos/page.tsx`
- `apps/web/app/(dashboard)/categorias/page.tsx`
- `apps/web/app/(dashboard)/devoluciones/page.tsx`
- `apps/web/app/(dashboard)/devoluciones/nueva/page.tsx`

```ts
const session = await auth();
if (!session?.user) redirect("/login");
if (session.user.rol !== "ADMIN") {
  redirect("/?error=admin_required");
}
```

Cubre el caso de URL directa por bookmark / link viejo.

### Sidebar

`nav-config.ts` ahora marca `adminOnly: true` en Productos,
Categorías y Devoluciones. Cajero/Vendedor no las ven en el sidebar.
**Defensa en profundidad**: el server bloquea aunque el sidebar
mostrara el item.

### Tests

14 tests nuevos en 4 archivos:

- `productos/__tests__/rbac-admin-only.test.ts` — 5 tests.
- `categorias/__tests__/rbac-admin-only.test.ts` — 5 tests.
- `devoluciones/__tests__/rbac-admin-only.test.ts` — 2 tests.
- `api/v1/devoluciones/__tests__/rbac-admin-only.test.ts` — 2 tests.

Cada uno valida CAJERO + VENDEDOR + ADMIN happy path donde aplica.

## Impacto temporal mobile

`POST /api/v1/devoluciones` ahora retorna **403** para cajeros. La app
móvil tiene UI de "Crear devolución" en `app/(tabs)/ventas/[id].tsx`
que dispara el flujo a este endpoint. Hasta Fase 3D.5:

- Cajero mobile recibe 403 al intentar devolver.
- Manual mobile actualizado: devoluciones solo desde web ADMIN
  durante este patch.
- Esto es **decisión deliberada** de Pierre, no regresión: el mismo
  manual web siempre listó devoluciones como ADMIN.

## Cómo evitar repetirlo

1. **Patrón único de auth helper** por archivo: nunca usar
   `requireSession()` plano en una Server Action que muta — siempre
   debe ser un helper que chequee rol/permiso.
2. **Defensa en profundidad obligatoria** para acciones admin-only:
   sidebar (`adminOnly`) + page-level redirect + Server Action guard +
   API REST guard. Las 4 capas, no 3.
3. **Tests de matriz rol × acción** son requisito al introducir un
   Server Action que muta data crítica. CAJERO/VENDEDOR/ADMIN deben
   estar cubiertos.
4. Cuando llegue **Fase 3D.5 RBAC profesional**, todos los
   `requireAdmin` se reemplazan por `requirePermission(permiso)`.
   Eso elimina el patrón "rol fijo" y deja un único helper auditado.

## Estado actual

`resolved` — todas las capas gateadas, gates verde (279 tests web,
74 tests mobile, type-check, lint, build), pendiente deploy.

## Siguiente bloque

Fase 3D.5 — modelo RBAC profesional con OWNER/ADMIN/MANAGER/CAJERO/
VENDEDOR/ACCOUNTANT/STOCK/SUPPORT + permisos granulares + helper
`requirePermission`. ADR pendiente.
