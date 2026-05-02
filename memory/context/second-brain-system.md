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

---

## Gobernanza del segundo cerebro

Esta sección define cómo se mantiene el cerebro **vivo y sin
duplicación**. Aplica a todo agente que escriba en `memory/`.

### Principio anti-duplicación

Una pieza de información vive en **un solo lugar canónico**. Las
demás carpetas pueden referenciarla con un link relativo, pero no
copiar el contenido. La duplicación crea drift: dos copias divergen
con el tiempo y el lector no sabe cuál es verdad.

Si una nota encaja en dos carpetas, elegir la **más específica**
según la matriz de ruteo y dejar referencia cruzada desde la otra.

Ejemplos prohibidos:

- ❌ Mismo gotcha listado en `projects/pos-chile-monorepo.md` (G-NN)
  Y como nota completa en `problems/`.
- ❌ Decisión de Pierre en `decisions/` Y como bullet en
  `pos-chile-monorepo.md` Y como recommendation en
  `recommendations/`.
- ❌ Aprendizaje "no confiar en reportes" como `learnings/` Y como
  problem Y como gotcha en el README.

Patrón correcto:

- ✅ Gotcha vive como entrada `G-NN` en
  `projects/pos-chile-monorepo.md` (índice corto, 1–3 líneas).
- ✅ Si requiere análisis, vive como nota completa en `problems/`
  (síntoma, causa, evidencia) y en `solutions/` o `learnings/` si
  ya hay solución/regla.
- ✅ El registro corto (`G-NN`) referencia la nota completa por
  filename; nunca duplica el contenido.

### Matriz de ruteo

Si pasa esto → va aquí (carpeta canónica):

| Situación | Carpeta canónica | Ejemplo |
|---|---|---|
| Hecho concreto de una sesión (deploy, smoke, audit, validación) | `episodes/` | `2026-05-01-fase-3c1-smoke.md` |
| Bug vivo o no resuelto | `problems/` | `2026-05-01-middleware-comprobante.md` |
| Patrón replicable que resuelve un problema | `solutions/` | `cloudflare-flexible-loop-fix.md` |
| Regla nueva nacida de experiencia | `learnings/` | `nunca-confiar-reporte-agente.md` |
| Idea no implementada con valor potencial | `ideas/` | `pos-restaurante-mesas.md` |
| Análisis con propuesta de acción esperando veredicto | `recommendations/` | `migrar-a-detox-vs-maestro.md` |
| Decisión de Pierre o arquitectónica que cambia el sistema | `decisions/` | `2026-04-29-saas-pivot-decisions.md` |
| Pendiente que no debe perderse, con dueño y criterio de cierre | `open-loops/` | `dr-01-branch-protection.md` |
| Estado vivo del proyecto, fases, commits importantes | `projects/<nombre>.md` | `pos-chile-monorepo.md` |
| Conocimiento estable del stack/arquitectura/proceso | `context/` | `stack-tech.md` |
| Dato/aclaración técnica de negocio que aplica siempre | `context/business-logic.md` | IVA 19 %, RUT formato |

Casos límite:

- **Decisión vs. recommendation**: si Pierre ya dijo "sí" → `decisions/`. Si está en propuesta esperando veredicto → `recommendations/`.
- **Problem vs. learning**: el problema tiene síntoma + causa concreta. El aprendizaje es la regla derivada que aplica más allá del caso original. Pueden coexistir si la regla trasciende el bug puntual; en ese caso `learning` referencia al `problem` por filename.
- **Idea vs. recommendation**: la idea es un disparador sin análisis. La recommendation tiene trade-offs evaluados y una propuesta concreta.
- **Roadmap**: vive en `projects/pos-chile-monorepo.md` (sección Plan Maestro). NO duplicar en `decisions/` ni `recommendations/`. Ítems del roadmap pueden tener su propia idea/recommendation/decision asociada por filename.

### Regla de migración entre carpetas

Una nota cambia de carpeta cuando cambia su naturaleza:

| Origen → Destino | Cuándo | Acción |
|---|---|---|
| `recommendations/` → `decisions/` | Pierre aprueba la propuesta | Crear nota nueva en `decisions/`, marcar la `recommendation` como `status: superseded` con link al `decision`. |
| `recommendations/` → `open-loops/` | La propuesta requiere acción externa de Pierre (cuenta, credencial, branch protection) y no agente | Crear `open-loop`, marcar `recommendation` como `superseded`. |
| `recommendations/` → `rejected` | Pierre descarta | No mover; cambiar `status: rejected` en la propia nota con razón y fecha. |
| `ideas/` → `recommendations/` | Alguien analiza la idea con trade-offs | Crear `recommendation`, marcar `idea` como `status: superseded`. |
| `problems/` → `solutions/` o `learnings/` | Bug resuelto y/o regla derivada | Marcar `problem` como `resolved` con link a la nota destino. NO borrar el `problem`. |
| `open-loops/` → cerrado | Criterio de cierre cumplido con evidencia | Cambiar `status: resolved` o `superseded`, agregar bloque de evidencia (commit, captura, link a la decisión). El archivo se queda en `open-loops/` para trazabilidad. |

Reglas duras:

- **No borrar archivos**. Cambiar `status` y dejar redirección por filename.
- Toda migración deja **link bidireccional**: la nota vieja apunta a la nueva, y la nueva referencia el origen ("nace de la recommendation X").
- Si una decisión cambia algo del sistema, el archivo afectado en `context/` o `projects/` debe actualizarse en el mismo PR. Sin eso, el segundo cerebro miente.

### Regla de cierre de open-loops

Un `open-loop` solo se cierra con **evidencia verificable**. No
basta con "ya está hecho":

- ✅ Commit hash + archivo afectado (ej. `c6d4ad3`,
  `apps/web/middleware.ts:22`).
- ✅ Captura de configuración externa (GitHub Settings, Sentry
  dashboard, Cloudflare DNS).
- ✅ Smoke browser real con URL + fecha + resultado.
- ✅ Output de test verde (`pnpm --filter web test` →
  `250/250`).

Inválido:

- ❌ "Pierre dijo que ya lo hizo."
- ❌ "El agente Codex reportó que está OK."
- ❌ "Aparece en el plan."

Al cerrar:

1. Cambiar `status: active` → `resolved` o `superseded`.
2. Agregar al final de la nota un bloque `## Cierre` con:
   - Fecha.
   - Quién cerró (Pierre / agente / proceso).
   - Evidencia.
   - Link al artefacto (commit, ADR, archivo de config).
3. Si superseded, link a lo que reemplaza.

### Política de índices por carpeta

Por ahora **NO** crear `INDEX.md` en todas las carpetas. La
estructura actual es chica y `ls` basta.

**Disparador**: cuando una carpeta supere **10 notas**, crear
`INDEX.md` en esa carpeta con:

- Tabla de notas activas con link, status y 1 línea de descripción.
- Tabla de notas resolved/superseded en sección aparte (bajo).
- Última actualización del índice.

Esto evita el costo de mantenimiento prematuro y aparece solo
cuando el ruido lo justifica.

### Backlog de tooling (no implementar todavía)

Pendientes técnicos que mejorarían la salud del cerebro pero **NO
son urgentes**. Cuando alguno se priorice, crear su propio
`open-loop`:

- **`scripts/lint-memory.sh`** — verifica que cada `.md` en
  `memory/` (excepto `README.md` e `INDEX.md`) tenga frontmatter
  mínimo: `title`, `date` (donde aplica), `status`, `tags[]`.
  Falla CI si una nota nueva no cumple. Idempotente.
- **Archivado trimestral de `episodes/`** — episodios con más de 90
  días se mueven a `episodes/archive/YYYY-Q[1-4]/` para no
  saturar el listado vivo. Mantener accesible por filename.
- **Revisión quincenal de open-loops stale** — agente escanea
  `open-loops/` con `status: active` y `date` > 14 días sin
  actualización; reporta al inicio de la próxima sesión para que
  Pierre confirme que sigue vivo, lo cierra, o lo reprioriza.

Estos tres no se implementan en esta tarea — son backlog
deliberado. Si en alguna sesión Pierre prioriza uno, abrir su
propio open-loop con criterio de cierre.

