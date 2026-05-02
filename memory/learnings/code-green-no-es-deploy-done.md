---
title: Aprendizaje — Code green no equivale a feature terminada
date: 2026-05-02
status: active
tags:
  - aprendizaje
  - verificacion
  - deploy
  - producto
---

# Aprendizaje — Code green no equivale a feature terminada

## Lo que aprendimos

Una feature puede compilar y pasar tests, pero seguir rota en el flujo
real. El caso 3C.1 pasó tests, pero `/comprobante/*` era interceptado
por middleware auth hasta que se excluyó explícitamente.

## Qué lo provocó

Fase 3C.1 agregó rutas públicas nuevas, migración y UI de compartir. Los
tests de helpers pasaron, pero faltaba validar el contrato operativo:
link público sin sesión.

## Regla nueva

Para features con migración, rutas públicas, mobile nativo o deploy:

1. Código verde.
2. Migración verificada en DB real/local.
3. Smoke real del flujo principal.
4. Smoke incógnito si la ruta es pública.
5. Deploy solo por `scripts/deploy.sh`.

## Dónde aplica

Comprobantes públicos, APIs externas, auth/RBAC, mobile, deploy, pagos,
backups y cualquier flujo que el cliente use directamente.

## Dónde NO aplica

Cambios puramente documentales o refactors internos sin superficie
runtime. Aun así, deben tener `git diff --check` y lectura de archivos.
