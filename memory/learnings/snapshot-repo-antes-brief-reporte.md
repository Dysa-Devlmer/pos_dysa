---
title: Aprendizaje — Snapshot repo antes de brief o reporte
date: 2026-05-02
status: active
tags:
  - aprendizaje
  - git
  - agentes
  - coordinacion
---

# Aprendizaje — Snapshot repo antes de brief o reporte

## Lo que aprendimos

En un flujo con varios agentes, el estado mental del repo se desfasa más
rápido que el chat. Cada brief y cada reporte debe empezar con evidencia
git real, no con memoria conversacional.

## Qué lo provocó

Durante el cierre de Fase 3C.1 hubo una discrepancia verificable:
Codex reportó un estado `ahead` menor al real porque no había empezado
con snapshot de remoto/local. El commit de memoria `420ebbe` ya existía
en el flujo y el modelo mental quedó desfasado.

## Regla nueva

Todo brief y todo reporte comienza con:

```bash
git fetch
git log origin/main..HEAD --oneline
git status -sb
```

La salida se pega o se resume explícitamente. Si algún comando falla, el
error exacto se reporta antes de seguir.

## Dónde aplica

- Briefs de Codex/Cowork hacia Worktree, CLI o Gemini.
- Reportes de Worktree, CLI o Gemini hacia Pierre/Codex.
- Sesiones de memoria, docs y coordinación, no solo cambios de código.
- Antes de `git add`, `git commit`, `git push`, deploy o revisión de
  reporte de otro agente.

## Dónde NO aplica

No exime de leer archivos ni correr gates. El snapshot solo responde
"dónde está el repo"; no prueba que el código sea correcto.
