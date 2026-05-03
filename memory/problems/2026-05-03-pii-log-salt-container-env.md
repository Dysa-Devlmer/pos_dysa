---
title: Problema — PII_LOG_SALT estaba en .env.docker pero no en el contenedor web
date: 2026-05-03
status: resolved
severity: high
tags:
  - prod
  - env
  - privacy
  - docker
  - deploy
---

# Problema — PII_LOG_SALT estaba en .env.docker pero no en el contenedor web

## Síntoma

Durante el smoke de producción de Fase 3C.2, el login de un usuario
temporal devolvió HTTP 500 en lugar del 403 esperado para mobile.

Los logs de `pos-web` mostraron:

```text
PII_LOG_SALT es requerido en producción
```

## Causa raíz

`PII_LOG_SALT` existía en `.env.docker`, pero `docker-compose.yml` no la
inyectaba en `services.web.environment`.

Esto crea una trampa operativa: revisar el archivo de entorno no basta.
Hay que verificar también qué variables recibe realmente el contenedor.

## Impacto

- Los caminos de error que usan sanitización/pseudonimización podían
  fallar en producción.
- El problema apareció al intentar responder correctamente un login
  mobile bloqueado por `mustChangePassword=true`.
- No expuso secretos ni PII; el fallo fue fail-closed con 500.

## Solución aplicada

Commit `a2872af`:

```yaml
PII_LOG_SALT: ${PII_LOG_SALT:?PII_LOG_SALT requerido en producción}
```

en `docker-compose.yml`, servicio `web`.

Luego se redeployó con `./scripts/deploy.sh`.

## Evidencia de cierre

- `docker compose --env-file .env.docker config` confirmó que la
  variable queda en la configuración efectiva. No volver a pegar el
  valor en reportes.
- Verificación dentro del contenedor sin exponer secreto:
  `test -n "$PII_LOG_SALT"` → `container_pii_salt_set`.
- Deploy `a2872af` completado con health OK.
- Smoke API mobile posterior devolvió HTTP 403 esperado:
  `"Debes cambiar tu contraseña temporal en el panel web antes de usar la app móvil."`
- Smoke browser prod de `/cambiar-password` completado.

## Regla

Para cualquier variable requerida en runtime:

1. Confirmar que existe en `.env.docker`.
2. Confirmar que `docker-compose.yml` la pasa al servicio correcto.
3. Confirmar dentro del contenedor con una verificación booleana, nunca
   imprimiendo el valor.

Ejemplo seguro:

```bash
docker compose --env-file .env.docker exec -T web \
  sh -lc 'test -n "$PII_LOG_SALT" && echo container_pii_salt_set'
```
