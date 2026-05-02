---
title: Problema — Docker build advierte que eslint-plugin-react-hooks no resuelve
date: 2026-05-02
status: needs-verification
severity: medium
tags:
  - docker
  - eslint
  - deploy
  - hardening
---

# Problema — Docker build advierte que eslint-plugin-react-hooks no resuelve

## Síntoma

Durante el deploy productivo de Fase 3C.1, el build Docker de Next.js
mostró:

```text
ESLint: Failed to load plugin 'react-hooks' declared in
eslint-config-next/core-web-vitals...
Cannot find module 'eslint-plugin-react-hooks'
```

El build continuó y producción quedó healthy, pero el warning indica que
la verificación ESLint dentro del contenedor puede estar degradada.

## Impacto

- No bloqueó Fase 3C.1.
- Puede ocultar problemas de hooks durante builds Docker si el entorno de
  producción no resuelve el plugin que localmente sí queda disponible.
- Rompe la expectativa de "build productivo limpio" aunque el deploy pase.

## Evidencia

- Deploy 2026-05-02 completado por `scripts/deploy.sh`.
- Health prod posterior OK.
- El warning apareció en la fase de build Docker antes de que el
  contenedor arrancara correctamente.

## Solución propuesta

Aplicado por Codex en hardening post-3C.1:

- `apps/web/package.json` declara `eslint-plugin-react-hooks` como
  devDependency directa.
- `pnpm-lock.yaml` actualiza el importer de `apps/web` apuntando a la
  versión ya presente en el lockfile (`5.2.0`).

Verificado:

- `pnpm --filter web lint` ✅
- `pnpm --filter web type-check` ✅
- `pnpm --filter web test` → 251/251 ✅
- `pnpm --filter web build` ✅
- `pnpm --filter @repo/mobile type-check` ✅
- `pnpm --filter @repo/mobile lint` ✅
- `pnpm --filter @repo/mobile exec jest --watchman=false` → 73/73 ✅
- `pnpm --store-dir /Users/devlmer/Library/pnpm/store/v10 install --frozen-lockfile --offline` ✅

No verificado todavía:

- Docker build real. Se intentó `docker build -f apps/web/Dockerfile
  --target builder .`, pero quedó bloqueado esperando metadata de Docker
  Hub (`node:22-alpine`) y se canceló. No hubo evidencia de fallo del
  fix, sólo limitación de red/cache.

Si se repite:

1. Inspeccionar `apps/web/package.json`, lockfile y `eslint.config.mjs`.
2. Confirmar si `eslint-plugin-react-hooks` debe ser dependencia directa
   de `apps/web` o del workspace raíz.
3. Aplicar el mínimo cambio de dependencias.
4. Re-ejecutar:
   - `pnpm --filter web lint`
   - `pnpm --filter web build`
   - build Docker o deploy dry-run si existe.

## Criterio de cierre

Un build Docker de `apps/web` no emite el warning de plugin faltante y el
gate local `lint/build` sigue verde.
