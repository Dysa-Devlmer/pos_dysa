---
title: Problema — Comprobantes públicos interceptados por middleware auth
date: 2026-05-02
status: resolved
severity: high
tags:
  - problema
  - middleware
  - comprobantes
  - fase-3c1
---

# Problema — Comprobantes públicos interceptados por middleware auth

## Síntoma

Las rutas públicas de Fase 3C.1 (`/comprobante/[token]` y
`/comprobante/devolucion/[token]`) estaban implementadas y pasaban tests,
pero el matcher de `apps/web/middleware.ts` no excluía `/comprobante`.
En ejecución real, NextAuth podía redirigir a login antes de renderizar el
comprobante.

## Causa real

La feature creó rutas públicas nuevas, pero el listado de rutas públicas
del middleware solo contemplaba rutas anteriores (`/privacidad`,
`/api/mobile`, manifest, assets, etc.). El gate unitario no cubría el
contrato "ruta pública no pasa por auth".

## Impacto

La función central de 3C.1 — compartir un comprobante por link a un cliente
sin sesión — quedaba rota end-to-end aunque el código compilara y los tests
de helpers fueran verdes.

## Evidencia

- `apps/web/middleware.ts` no tenía `comprobante` en el negative lookahead.
- Reporte de verificación de Worktree detectó redirect 302 a login.
- Fix aplicado en `apps/web/middleware.ts` excluyendo `/comprobante`.
- Test de regresión: `apps/web/__tests__/middleware-public-routes.test.ts`.

## Solución aplicada

Excluir `comprobante` del matcher de NextAuth y agregar test de regresión
source-level para que futuras ediciones del matcher no borren la exclusión
sin romper CI.

## Cómo evitar repetirlo

Toda ruta pública nueva debe actualizar:

1. `apps/web/middleware.ts`.
2. Robots/sitemap si corresponde.
3. Smoke incógnito real.
4. Test/regresión mínima de contrato público.

## Estado actual

Resolved en código local. Requiere gate y, antes de producción, smoke
browser real del link público.
