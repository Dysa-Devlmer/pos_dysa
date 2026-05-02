---
title: Segundo Cerebro — Sistema Operativo de Memoria
tags:
  - memory
  - segundo-cerebro
  - sistema-operativo
  - conocimiento
aliases:
  - Segundo Cerebro
  - Memory OS
---

# Segundo Cerebro — Sistema Operativo de Memoria

Este directorio es el **cerebro vivo** de DyPos CL. No es solo un archivo
de notas: es el sistema donde se guardan recuerdos, decisiones, errores,
soluciones, aprendizajes, ideas, recomendaciones y asuntos pendientes.

La regla central:

> Si una persona o agente futuro necesitaría saberlo para no repetir un
> error, tomar una mejor decisión o entender el proyecto, debe quedar en
> `memory/`.

## Capas del cerebro

| Capa | Carpeta | Qué guarda |
|------|---------|------------|
| Identidad del proyecto | `projects/` | Estado global, roadmap, producto, móvil, visión operativa. |
| Memoria semántica | `context/` | Conocimiento estable: stack, auth, negocio, seguridad, infra, workflow. |
| Decisiones | `decisions/` | Decisiones que cambian el rumbo del producto o arquitectura. |
| Recuerdos episódicos | `episodes/` | Sesiones, incidentes, auditorías, despliegues, pruebas reales. |
| Problemas | `problems/` | Bugs, riesgos, deuda, brechas funcionales y operativas. |
| Soluciones | `solutions/` | Fixes reutilizables, patrones probados, runbooks cortos. |
| Aprendizajes | `learnings/` | Lecciones generales que deben cambiar cómo trabajamos. |
| Ideas | `ideas/` | Mejoras, features futuras, hipótesis comerciales y producto. |
| Recomendaciones | `recommendations/` | Consejos técnicos/comerciales vigentes con criterio y prioridad. |
| Asuntos abiertos | `open-loops/` | Decisiones, tareas externas y preguntas que no deben perderse. |

## Qué se guarda

### Recuerdos

Guardar hechos concretos, con fecha absoluta:

- Qué se hizo.
- Quién lo hizo.
- Qué se verificó.
- Qué salió mal.
- Qué quedó pendiente.
- Qué evidencia existe: commit, archivo, test, deploy, screenshot, issue.

### Errores y problemas

Guardar todo error que costó tiempo o pudo afectar producción:

- Síntoma.
- Causa real.
- Archivos o comandos involucrados.
- Solución aplicada.
- Cómo detectarlo antes la próxima vez.
- Gotcha relacionado si existe.

### Soluciones

Guardar soluciones que puedan repetirse:

- Patrón recomendado.
- Anti-patrón evitado.
- Comandos exactos.
- Condiciones donde aplica.
- Condiciones donde NO aplica.

### Ideas y mejoras

Guardar ideas sin inflarlas a promesas:

- Problema que resuelve.
- Valor para dueño/cajero/Dyon Labs.
- Complejidad esperada.
- Dependencias.
- Riesgos.
- Estado: `idea`, `candidate`, `approved`, `deferred`, `rejected`, `implemented`.

### Recomendaciones

Guardar recomendaciones con dueño y prioridad:

- Recomendación concreta.
- Por qué importa.
- Riesgo si se posterga.
- Quién decide.
- Fecha de revisión sugerida.

## Reglas de actualización

Actualizar `memory/` cuando ocurra cualquiera de estos eventos:

1. Se cierra una fase.
2. Se encuentra un bug real.
3. Se corrige un bug con aprendizaje reutilizable.
4. Se toma una decisión de arquitectura/producto/operación.
5. Se descubre una promesa falsa entre docs y código.
6. Se ejecuta deploy, build, APK, smoke o prueba en device.
7. Se crea o cambia un procedimiento operativo.
8. Se pospone una tarea importante.
9. Pierre toma una decisión externa: DNS, backups, branch protection, proveedor.
10. Un agente deja un reporte que fue aceptado o rechazado tras verificación.

## Formato mínimo por nota

Cada nota nueva debe incluir:

```markdown
---
title: Título claro
date: YYYY-MM-DD
status: active | resolved | superseded | deferred
tags:
  - ...
---

# Título

## Resumen

## Evidencia

## Impacto

## Decisión o solución

## Pendientes
```

## Verdad sobre promesas

La memoria debe distinguir siempre entre:

- **Existe en código y fue verificado**.
- **Existe en roadmap**.
- **Está documentado pero no existe**.
- **Está decidido pero no implementado**.
- **Está implementado pero no desplegado**.
- **Está desplegado pero no validado por browser/device real**.

Una función no se considera real hasta tener evidencia suficiente:

- Código.
- Tests o verificación manual.
- Build/gate si aplica.
- Smoke real si toca UX.
- Deploy si se promete como producción.

## Índices principales

- [[projects/pos-chile-monorepo]] — estado global del proyecto.
- [[context/stack-tech]] — stack exacto y versiones.
- [[context/agents-workflow]] — protocolo de agentes.
- [[context/second-brain-system]] — reglas detalladas de memoria viva.
- [[projects/roadmap]] — roadmap técnico/comercial.

