---
title: Segundo Cerebro — Protocolo de Memoria Viva
tags:
  - memory
  - segundo-cerebro
  - protocolo
  - agentes
aliases:
  - Memory Protocol
  - Protocolo Segundo Cerebro
---

# Segundo Cerebro — Protocolo de Memoria Viva

Este protocolo define cómo DyPos CL guarda conocimiento como un cerebro
real: memoria semántica, memoria episódica, aprendizajes, errores,
soluciones, ideas, recomendaciones y asuntos abiertos.

Relacionado: [[../README]] · [[agents-workflow]] · [[../projects/pos-chile-monorepo]]

## Principio rector

La memoria no es decoración. Es una herramienta de continuidad operativa.

Un agente nuevo debe poder leer `memory/` y entender:

- Qué es el proyecto.
- Qué se decidió.
- Qué está terminado.
- Qué falta.
- Qué no debe repetirse.
- Qué riesgos siguen vivos.
- Qué prometemos al cliente y qué aún no.

## Tipos de memoria

### 1. Memoria semántica

Conocimiento estable del sistema:

- Stack.
- Arquitectura.
- Patrones de auth.
- Lógica de negocio.
- Infraestructura.
- Seguridad.
- Workflow de agentes.

Ubicación: `memory/context/`.

### 2. Memoria episódica

Hechos concretos ocurridos en una sesión:

- Deploys.
- Builds APK.
- Incidentes.
- Audits.
- Smoke tests.
- Validaciones reales.
- Rechazos de reportes.

Ubicación: `memory/episodes/`.

Nombre sugerido:

```text
YYYY-MM-DD-<tema>.md
```

### 3. Memoria de problemas

Problemas vivos o resueltos que importan:

- Bugs.
- Brechas entre docs y código.
- Riesgos de seguridad.
- Deuda técnica.
- Deuda operativa.
- Fallas de proceso.

Ubicación: `memory/problems/`.

### 4. Memoria de soluciones

Soluciones y patrones probados:

- Cómo resolver un error recurrente.
- Cómo desplegar sin romper trazabilidad.
- Cómo verificar una feature.
- Cómo manejar gotchas del stack.

Ubicación: `memory/solutions/`.

### 5. Memoria de aprendizajes

Reglas nuevas nacidas de experiencia real:

- "No basta curl para Server Actions."
- "Docs de cliente se validan contra código."
- "DSN no se pasa por chat si no hace falta."
- "Un reporte de agente no es evidencia."

Ubicación: `memory/learnings/`.

### 6. Ideas y recomendaciones

Ideas no implementadas y recomendaciones razonadas:

- Features candidatas.
- Mejoras de UX.
- Cambios comerciales.
- Automatizaciones.
- Roadmap de producto.

Ubicaciones:

- `memory/ideas/`.
- `memory/recommendations/`.

### 7. Asuntos abiertos

Cosas que no deben perderse:

- Decisiones de Pierre.
- Tareas externas.
- Credenciales/proveedores pendientes.
- Riesgos aceptados temporalmente.
- Bloqueos.

Ubicación: `memory/open-loops/`.

## Evidencia obligatoria

Cada recuerdo importante debe indicar evidencia. Ejemplos válidos:

- Commit: `abc1234`.
- Archivo y línea: `apps/web/app/(dashboard)/ventas/actions.ts:709`.
- Test: `pnpm --filter web test` → `243/243`.
- Smoke: browser admin/cajero, ruta, fecha.
- Device: modelo Android, versión APK, resultado.
- Deploy: URL, health, backup generado.

Ejemplos inválidos como única evidencia:

- "El agente dijo que..."
- "Parece funcionar."
- "Debería estar."
- "Está en el plan."

## Estados permitidos

Usar estados explícitos:

| Estado | Significado |
|--------|-------------|
| `active` | Vivo y relevante. |
| `resolved` | Resuelto y verificado. |
| `superseded` | Reemplazado por una decisión o implementación nueva. |
| `deferred` | Postergado con razón. |
| `rejected` | Evaluado y descartado. |
| `needs-verification` | Reportado pero no verificado. |

## Plantilla para problemas

```markdown
---
title: Problema — <nombre>
date: YYYY-MM-DD
status: active
severity: critical | high | medium | low
tags:
  - problema
---

# Problema — <nombre>

## Síntoma

## Causa real

## Impacto

## Evidencia

## Solución propuesta o aplicada

## Cómo evitar repetirlo

## Estado actual
```

## Plantilla para aprendizajes

```markdown
---
title: Aprendizaje — <nombre>
date: YYYY-MM-DD
status: active
tags:
  - aprendizaje
---

# Aprendizaje — <nombre>

## Lo que aprendimos

## Qué lo provocó

## Regla nueva

## Dónde aplica

## Dónde NO aplica
```

## Plantilla para ideas

```markdown
---
title: Idea — <nombre>
date: YYYY-MM-DD
status: candidate
tags:
  - idea
---

# Idea — <nombre>

## Problema que resuelve

## Valor para cliente/dueño/cajero

## Valor para Dyon Labs

## Alcance tentativo

## Dependencias

## Riesgos

## Recomendación
```

## Regla de lectura al iniciar tarea

Además de `projects/pos-chile-monorepo.md` y `context/stack-tech.md`, leer:

- `context/second-brain-system.md` si la tarea toca memoria, docs, proceso o coordinación.
- `open-loops/README.md` si se va a decidir próxima fase.
- `problems/README.md` si se va a corregir deuda o bugs.
- `ideas/README.md` si se va a priorizar roadmap.

## Regla de cierre

Al cerrar una fase:

1. Registrar resumen en `projects/pos-chile-monorepo.md`.
2. Registrar decisiones en `decisions/` si cambian arquitectura/producto.
3. Registrar bugs/gotchas en `problems/`, `solutions/` o `learnings/`.
4. Registrar pendientes en `open-loops/`.
5. Ejecutar `/session-end` o equivalente del repo.

