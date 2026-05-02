---
title: Episodio — Fase 3C.2 contraseña temporal + actividad real
date: 2026-05-02
status: resolved
phase: 3C.2
tags:
  - episode
  - security
  - audit-log
  - usuarios
  - perfil
---

# Episodio — Fase 3C.2 contraseña temporal + actividad real

## Hechos verificados

1. **Schema**: agregado `Usuario.mustChangePassword Boolean @default(false)` en
   `packages/db/prisma/schema.prisma`. Migración en
   `migrations/20260502010000_user_must_change_password/migration.sql` —
   `NOT NULL DEFAULT false`. Aplicada a BD local con `prisma migrate
   deploy`. Usuarios existentes (admin/cajero/vendedor del seed) quedan
   con flag=false → no rompe producción ni el flujo de login normal.
2. **Server Actions**:
   - `crearUsuario` ahora setea `mustChangePassword: true`.
   - `actualizarUsuario` setea el flag a true SOLO si admin envía nueva
     password; si no, NO toca el flag.
   - `cambiarPassword` (perfil propio) limpia el flag a false al
     éxito + `revalidateTag('usuario:${id}')`.
   - Nuevo `cambiarPasswordObligatorio` en
     `app/cambiar-password/actions.ts`: NO pide password actual
     (usuario la conoce porque ADMIN la entregó), valida que la
     nueva sea distinta a la actual con `bcrypt.compare`, hashea,
     setea `mustChangePassword: false`, invalida tag y redirige a `/`.
3. **Gate**: en `app/(dashboard)/layout.tsx`, después del session check,
   `getPerfilCacheado` ahora incluye `mustChangePassword`. Si true →
   `redirect('/cambiar-password')`. La ruta queda fuera del grupo
   `(dashboard)` → no genera loop. Cache TTL 5 min, invalidado vía
   tag al cambiar.
4. **Ruta dedicada**: `app/cambiar-password/{page,form,actions}.tsx`.
   Layout standalone. Si flag=false al llegar, redirige a `/perfil`
   (cero fricción si llegan manualmente). Sin sesión → `/login`.
5. **Actividad reciente real**: reemplazado origen de
   `app/(dashboard)/perfil/actividad-reciente.tsx`. Antes leía sólo
   `prisma.venta` (ADMIN sin ventas veía vacío); ahora lee
   `prisma.auditLog` filtrado por `usuarioId`, ordenado por fecha
   desc, take 15. Mapeo tabla+accion→label+icono+href cubre ventas
   (CREATE/UPDATE/DELETE/RESTORE), devoluciones, productos
   (incluyendo `PRODUCTOS_IMPORT_CSV` con conteo creados/actualizados),
   clientes, usuarios, categorías. Fallback genérico para tablas no
   mapeadas.
6. **Tests**: 4 archivos nuevos con 11 tests:
   - `usuarios/__tests__/mustChangePassword.test.ts` (3 tests).
   - `perfil/__tests__/cambiarPassword.test.ts` (3 tests).
   - `perfil/__tests__/actividadReciente.test.tsx` (1 test contract).
   - `cambiar-password/__tests__/cambiarPasswordObligatorio.test.ts` (5 tests).

## Decisiones técnicas tomadas

- **Flag NO va en JWT**: si lo metiéramos habría que reemitir cookie en
  cada cambio, lo que complica la pipeline NextAuth v5 beta de Pattern
  4bis. En cambio, gate Node-side en el layout hace una query
  cacheada de 5 min — costo despreciable.
- **`/cambiar-password` fuera de `(dashboard)`**: garantiza no-loop
  con el gate. Sí requiere auth (no público).
- **Ruta no pide password actual**: el usuario la conoce porque
  ADMIN se la entregó hace minutos y bcrypt.compare en login ya
  validó. Pedirla otra vez es fricción innecesaria. El perfil
  voluntario sí la pide porque puede ser sesión vieja.
- **Verificación "nueva != actual"**: defense-in-depth. Si admin
  asignó "temp123" y usuario tipea "temp123" en el formulario
  obligatorio, lo rechazamos. El usuario debe elegir algo distinto.
- **Source de actividad cambia de `venta` a `auditLog`**: cubre
  ADMINs que no venden (creaban productos/categorías y veían vacío),
  imports CSV, devoluciones, ediciones. Cuando se sume audit a
  productos/clientes/categorías individuales, aparecen automáticamente.

## Gates ejecutados

- `pnpm --filter @repo/db db:generate` ✓
- `pnpm --filter web type-check` ✓
- `pnpm --filter web lint` ✓
- `pnpm --filter web test` → **262/262** (antes 250)
- `pnpm --filter web build` ✓ (ruta `/cambiar-password` en output, 3.55 kB)
- `pnpm --filter @repo/mobile type-check` ✓
- `pnpm --filter @repo/mobile lint` ✓
- `pnpm --filter @repo/mobile exec jest --watchman=false` → **73/73**
- Migración aplicada local con `prisma migrate deploy`: clean, no
  errores.

## Pendiente explícito (NO hecho en este patch)

- **Smoke browser end-to-end real**: levantar dev, login como admin,
  crear usuario test, logout, login como test, verificar redirect a
  `/cambiar-password`, cambiar password, verificar que entra al
  dashboard. NO se pudo desde CLI sin browser (Server Actions exigen
  el `$ACTION_ID` compilado). Verificación parcial vía dev server +
  curl confirmó:
    - `/cambiar-password` sin sesión → 302 a /login (gate OK).
    - `/perfil` sin sesión → 302 a /login.
    - 262 unit tests cubren el contrato de las 4 actions.
  Pierre o Codex deben hacer smoke browser real antes de deploy a
  prod.
- **Manuales**: no se actualizaron en este commit. Pierre pidió
  hacerlo "solo después de que el código exista". El código existe;
  los manuales del usuario deberían actualizarse en un patch
  separado (ej: agregar paso "primer login te lleva a cambiar
  contraseña" en `docs/product/manual-web.md` y onboarding).

## Observación de smoke (NO scope)

En el smoke local con dev server, una request a
`/comprobante/[token-real]` retornó HTTP 302 una vez. Pude haber
sido una transient de Next dev compilando lazily (segunda request
no se pudo repetir por restricciones del sandbox). NO toqué
middleware ni 3C.1 — Pierre dijo que solo lo haga si hay regresión
verificada. Anotado para que Codex/Pierre lo confirmen en una
próxima verificación de 3C.1.

