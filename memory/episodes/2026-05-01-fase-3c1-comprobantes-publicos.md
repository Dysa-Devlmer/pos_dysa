---
title: Episodio — Fase 3C.1 comprobantes públicos compartibles
date: 2026-05-01
status: resolved
tags:
  - fase-3c1
  - comprobantes
  - mobile
  - web
  - privacidad
---

# Episodio — Fase 3C.1 comprobantes públicos compartibles

## Resumen

Se implementó el plan 3C.1: comprobantes públicos para ventas y
devoluciones, con `publicToken` dedicado, PII enmascarada y acciones de
compartir en web/mobile.

## Evidencia

- Rutas nuevas:
  - `/comprobante/[token]`
  - `/comprobante/devolucion/[token]`
- Helper: `apps/web/lib/public-receipts.ts`.
- Mobile: `apps/mobile/lib/publicReceipt.ts`.
- Tests web: 250/250.
- Tests mobile: 73/73.
- Build web: verde; rutas públicas aparecen como dinámicas en output.
- Smoke local 2026-05-02:
  - DB local registra migración `20260501010000_public_receipt_tokens`.
  - `ventas.public_token` y `devoluciones.public_token` son `NOT NULL`.
  - Índices unique existen: `ventas_public_token_key`,
    `devoluciones_public_token_key`.
  - Backfill local: ventas 24/24 con token único; devoluciones 11/11
    con token único.
  - `GET /comprobante/<token-venta>` → 200 OK sin login.
  - `GET /comprobante/devolucion/<token-devolucion>` → 200 OK sin login.
  - `GET /comprobante/token-invalido` → 404.
  - HTML no contiene RUT completo `12.345.678-5`, nombre completo
    `Cliente de Prueba`, motivo interno de devolución ni texto de login.
- Cierre producción 2026-05-02:
  - Push a `origin/main` completado con bypass temporal DR-01 autorizado
    por Pierre. GitHub volvió a advertir que faltan PR obligatorio y
    status check `web`.
  - Deploy ejecutado por `scripts/deploy.sh`.
  - Backup DB pre-migrations:
    `/var/backups/dypos-cl-db/pre-deploy-20260502-011419.sql.gz`.
  - `prisma migrate deploy` aplicó
    `20260501010000_public_receipt_tokens`.
  - Health prod OK: `status=ok`, `database=connected`, `version=2.0.0`.
  - DB prod: ventas 5/5 con token único; devoluciones 1/1 con token único.
  - HTTPS prod:
    `/comprobante/<token-venta>` → 200,
    `/comprobante/devolucion/<token-devolucion>` → 200,
    `/comprobante/token-invalido` → 404.
  - Browser MCP prod: venta y devolución renderizan sin login. Devolución
    verificada con PII enmascarada (`Pierre S.`, `25.***.***-0`) y sin
    motivo interno.

## Impacto

El manual de dueño/cajero puede prometer compartir comprobantes internos
por link con verdad. El link no expone RUT completo, email, teléfono,
cajero ni IDs internos.

## Decisiones

- PII enmascarada siempre.
- Estado vivo, no snapshot.
- Ventas y devoluciones en el mismo alcance.
- Soft-delete → 404 silencioso.
- Sin impresora térmica ni WhatsApp Business API en esta fase.

## Pendientes

- Ninguno para Fase 3C.1.
- DR-01 branch protection queda abierto como deuda de gobernanza, no como
  bloqueo de esta feature.
- Warning Docker build ESLint `react-hooks` queda registrado como problema
  activo separado para hardening.
