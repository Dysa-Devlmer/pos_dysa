---
title: Episodio — Fase 3C.1 comprobantes públicos compartibles
date: 2026-05-01
status: active
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

- Verificar aplicación de migración en BD local/prod.
- Smoke browser real post-migration.
- Si se despliega a prod: usar `scripts/deploy.sh` con backup automático
  y smoke incógnito.
