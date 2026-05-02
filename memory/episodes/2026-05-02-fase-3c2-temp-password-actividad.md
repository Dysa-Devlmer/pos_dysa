---
title: Episodio — Fase 3C.2 contraseña temporal + actividad real
date: 2026-05-02
status: needs-verification
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
     `app/cambiar-password/actions.ts`: pide la contraseña temporal de
     nuevo, valida que sea correcta con `bcrypt.compare`, valida que la
     nueva sea distinta a la temporal, hashea, setea
     `mustChangePassword: false`, invalida tag y redirige a `/`.
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
- **Ruta pide contraseña temporal/actual**: el primer diseño no la
  pedía, pero revisión independiente detectó un trade-off innecesario.
  La versión vigente repite la verificación en el momento de cambio
  para reducir riesgo ante sesión abierta o cookie robada.
- **Verificación "nueva != actual"**: defense-in-depth. Si admin
  asignó "temp123" y usuario tipea "temp123" en el formulario
  obligatorio, lo rechazamos. El usuario debe elegir algo distinto.
- **Source de actividad cambia de `venta` a `auditLog`**: cubre
  ADMINs que no venden (creaban productos/categorías y veían vacío),
  imports CSV, devoluciones, ediciones. Cuando se sume audit a
  productos/clientes/categorías individuales, aparecen automáticamente.
- **Mobile no puede saltarse el gate**: `/api/v1/auth/login` devuelve
  403 si `mustChangePassword=true`. La app muestra el mensaje y no
  persiste token. El cambio obligatorio se realiza en el panel web.

## Gates ejecutados

- `pnpm --filter @repo/db db:generate` ✓
- `pnpm --filter web type-check` ✓
- `pnpm --filter web lint` ✓
- `pnpm --filter web test` → **265/265** (antes 250)
- `pnpm --filter web build` ✓ (ruta `/cambiar-password` en output, 3.55 kB)
- `pnpm --filter @repo/mobile type-check` ✓
- `pnpm --filter @repo/mobile lint` ✓
- `pnpm --filter @repo/mobile exec jest --watchman=false` → **74/74**
- Migración aplicada local con `prisma migrate deploy`: clean, no
  errores.

## Pendiente explícito (NO hecho en este patch)

- **Smoke browser local end-to-end**: ejecutado por Codex con dev
  server local. Flujo verificado: ADMIN crea usuario temporal →
  logout → login usuario temporal → redirect a `/cambiar-password` →
  error con temporal incorrecta → éxito con temporal correcta →
  dashboard CAJERO → `/cambiar-password` manual redirige a `/perfil`
  porque el flag ya quedó en false.
- **Manuales**: actualizados después de verificar código real. Web y
  onboarding describen el redirect obligatorio. Mobile documenta que
  la app bloquea el login si la contraseña sigue temporal.
- **Pendiente operacional**: deploy por `scripts/deploy.sh`,
  migración en prod y smoke browser prod. Hasta eso, la fase queda
  `needs-verification`, no `resolved` operativo.

## Patch Codex 2026-05-02 — defense-in-depth

- `cambiarPasswordObligatorio` ahora exige campo `actual`.
- `/api/v1/auth/login` bloquea mobile con 403 si el usuario debe
  cambiar contraseña.
- Tests agregados:
  - API login temporal → 403 sin JWT.
  - Auth store mobile preserva mensaje 403 y no guarda token.
  - Cambio obligatorio rechaza temporal incorrecta.

## Observación de smoke (NO scope)

En el smoke local con dev server, una request a
`/comprobante/[token-real]` retornó HTTP 302 una vez. Pude haber
sido una transient de Next dev compilando lazily (segunda request
no se pudo repetir por restricciones del sandbox). NO toqué
middleware ni 3C.1 — Pierre dijo que solo lo haga si hay regresión
verificada. Anotado para que Codex/Pierre lo confirmen en una
próxima verificación de 3C.1.
