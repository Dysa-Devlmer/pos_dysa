---
title: Problema — Prisma migrate local devolvió Schema engine error sin detalle
date: 2026-05-01
status: active
severity: medium
tags:
  - prisma
  - migraciones
  - fase-3c1
  - verification-gap
---

# Problema — Prisma migrate local devolvió Schema engine error sin detalle

## Síntoma

Durante Fase 3C.1, `pnpm --filter @repo/db db:migrate` y
`prisma migrate status` fallaron contra PostgreSQL local con:

```text
Error: Schema engine error:
undefined
```

`prisma validate` sí pasó.

## Causa real

No determinada en esta sesión. La validación de Prisma schema fue verde,
pero el engine de migrate no entregó diagnóstico. La conexión directa
por `psql` y `docker exec` no pudo completarse desde el sandbox: Docker/
psql elevados quedaron bloqueados por límite de uso de la app.

## Impacto

La migración de `public_token` fue creada y el código compila, pero la
aplicación de la migración no quedó verificada localmente desde esta
sesión. Debe validarse antes de deploy productivo o durante el deploy
controlado con backup pre-migration.

## Evidencia

- `packages/db/prisma/schema.prisma` válido con `prisma validate`.
- Migración nueva: `20260501010000_public_receipt_tokens`.
- Gate de app:
  - web lint/type-check/test/build verde.
  - mobile lint/type-check/jest verde.

## Solución propuesta o aplicada

La migración SQL es autosuficiente:

1. agrega columnas nullable,
2. backfillea tokens existentes,
3. aplica `NOT NULL` + unique indexes.

También existe `packages/db/prisma/backfill-public-tokens.ts` como
herramienta idempotente de reparación si alguna instalación queda con
tokens nulos/vacíos.

## Cómo evitar repetirlo

Antes de deploy:

- Validar `prisma migrate deploy` en entorno con acceso real a DB.
- Confirmar:
  - `ventas.public_token` existe y es unique/not null.
  - `devoluciones.public_token` existe y es unique/not null.
  - filas existentes tienen token no vacío.

## Estado actual

Active hasta que una ejecución real de migración confirme la BD.
