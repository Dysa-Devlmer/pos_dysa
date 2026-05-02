---
title: Aprendizaje — Forward-fix antes que force-push
date: 2026-05-02
status: active
tags:
  - aprendizaje
  - git
  - trazabilidad
  - agentes
---

# Aprendizaje — Forward-fix antes que force-push

## Lo que aprendimos

Si un commit problemático ya fue empujado a `origin/main`, la opción
por defecto es corregir hacia adelante con commits pequeños y mensajes
claros. Reescribir historia requiere autorización explícita y una razón
superior al costo operativo.

## Qué lo provocó

El commit `117f46e` mezcló Fase 3C.1 completa con notas de memoria bajo
mensaje `chore(memory)`. Cuando se detectó, ya estaba en `origin/main`.

## Regla nueva

- Antes de push: si el commit está local, preferir split limpio.
- Después de push a `main`: preferir forward-fix.
- Force-push a `main`: prohibido salvo instrucción explícita de Pierre.

## Dónde aplica

Commits ya publicados en ramas compartidas o `main`.

## Dónde NO aplica

Commits locales sin push. En ese caso, `git reset --soft HEAD~1` y split
siguen siendo la mejor higiene.
