---
title: Problema — Prisma migrate local devolvió Schema engine error sin detalle
date: 2026-05-01
status: resolved
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

La migración de `public_token` fue creada y el código compila. Al inicio
existía una brecha de verificación porque `prisma migrate dev/status`
fallaba localmente con error opaco. Esa brecha quedó cerrada por
consulta directa a PostgreSQL local y por deploy productivo controlado.

## Evidencia

- `packages/db/prisma/schema.prisma` válido con `prisma validate`.
- Migración nueva: `20260501010000_public_receipt_tokens`.
- Verificación directa PostgreSQL local 2026-05-02:
  - `_prisma_migrations` contiene
    `20260501010000_public_receipt_tokens` con `finished_at`.
  - `ventas.public_token` y `devoluciones.public_token` existen y son
    `NOT NULL`.
  - Índices unique existentes: `ventas_public_token_key`,
    `devoluciones_public_token_key`.
  - Conteo local: ventas 24/24 con token y 24 tokens únicos;
    devoluciones 11/11 con token y 11 tokens únicos.
- Gate de app:
  - web lint/type-check/test/build verde.
  - mobile lint/type-check/jest verde.
- Verificación producción 2026-05-02:
  - `scripts/deploy.sh` ejecutó `prisma migrate deploy`.
  - `_prisma_migrations` prod contiene
    `20260501010000_public_receipt_tokens` con `finished_at`.
  - `ventas.public_token` y `devoluciones.public_token` aplicados en prod.
  - Conteo prod: ventas 5/5 con token y 5 tokens únicos; devoluciones 1/1
    con token y 1 token único.
  - Smoke público HTTPS y browser prod verde.

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

Resuelto para Fase 3C.1: la migración quedó verificada local y en
producción. La anomalía opaca de `prisma migrate dev/status` queda como
señal de tooling a vigilar si se repite, pero ya no bloquea ni compromete
los comprobantes públicos.
