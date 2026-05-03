---
title: Problema — Docker build cache consumió 30 GB en VPS
date: 2026-05-03
status: resolved
severity: medium
tags:
  - prod
  - docker
  - disk
  - deploy
---

# Problema — Docker build cache consumió 30 GB en VPS

## Síntoma

Antes de reintentar el deploy de Fase 3C.2, el VPS tenía cerca de 15 GB
libres y `docker system df` mostraba **30.35 GB** en build cache.

El deploy previo había quedado incompleto y el volumen de cache hacía
que cualquier build posterior fuera más frágil y lento.

## Causa raíz

Los builds Docker sucesivos de Next.js acumulan layers/cache pesados en
el VPS. `scripts/deploy.sh` limpia backups de app, pero no limpia
automáticamente el build cache de Docker.

## Solución aplicada

Se ejecutó:

```bash
docker builder prune -af
```

Resultado: **30.35 GB reclaimed**. Después, `docker system df` mostró
build cache en 0 y el deploy pudo continuar.

## Evidencia de cierre

- Deploy Fase 3C.2 completado después de la limpieza.
- `prisma migrate deploy` aplicó la migración
  `20260502010000_user_must_change_password`.
- Health prod OK post-deploy.

## Regla

Antes de reintentar un deploy que quedó colgado o lento:

1. Revisar `df -h`.
2. Revisar `docker system df`.
3. Si build cache es alto y no hay build en curso, limpiar con
   `docker builder prune -af`.

No usar `docker system prune -af --volumes` en producción sin una
revisión explícita: puede borrar volúmenes o artefactos no esperados.
