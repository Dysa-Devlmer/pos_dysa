# Obsidian + Claude — Segundo Cerebro para Proyectos

> Guía completa y replicable. Todo lo que se hizo en POS Chile para que
> cualquier proyecto futuro tenga memoria persistente desde el día 1.

---

## ¿Qué es y por qué funciona?

Claude Code olvida todo al cerrar una sesión. Este sistema resuelve eso
externalizando el conocimiento del proyecto en archivos `.md` que los agentes
leen automáticamente al inicio de cada sesión.

**Sin este sistema:** re-explicar el stack, los gotchas y las decisiones en cada sesión.  
**Con este sistema:** el agente abre el proyecto y ya sabe todo — sin que digas nada.

Obsidian actúa como interfaz visual del mismo conocimiento. Los archivos son
idénticos — solo `.md` en una carpeta del repo. No hay sincronización especial
ni dependencia de Obsidian para que funcione con Claude.

---

## Arquitectura completa

```
proyecto/
├── memory/                          ← Segunda cerebro (leer al inicio)
│   ├── projects/
│   │   └── nombre-proyecto.md       ← Estado completo, fases, commits, gotchas
│   └── context/
│       ├── stack-tech.md            ← Stack exacto con versiones
│       ├── auth-patterns.md         ← Patrones de autenticación
│       ├── security-owasp.md        ← Seguridad, gaps, audits
│       ├── business-logic.md        ← Lógica de negocio crítica
│       ├── infra-docker.md          ← Infraestructura, Docker, env vars
│       └── agents-workflow.md       ← Roles del equipo, protocolos
├── .claude/
│   └── commands/
│       └── session-end.md           ← Comando que actualiza memory/ al cerrar
├── .git/
│   └── hooks/
│       └── post-commit              ← Hook que captura commits automáticamente
├── .obsidian/
│   └── app.json                     ← Filtros del vault (excluye node_modules etc)
├── CLAUDE.md                        ← Instrucciones raíz — auto-leído por Claude Code
└── memory/.pending-notes            ← Buffer temporal (gitignored, procesado por /session-end)
```

---

## Paso a paso — Instalación desde cero

### PASO 1 — Crear estructura de memory/

```bash
mkdir -p memory/projects
mkdir -p memory/context
```

### PASO 2 — Crear las notas con contenido real

Cada nota debe tener **frontmatter YAML + wikilinks cruzados + callouts**.
No placeholders — contenido real del proyecto desde el primer día.

**Plantilla base para cada nota:**

```markdown
---
title: Nombre de la nota
tags:
  - tag1
  - tag2
aliases:
  - Alias 1
---

# Título

Descripción corta. Relacionado: [[otra-nota]] · [[stack-tech]]

> [!warning] Advertencia importante
> Texto del callout.

## Sección principal

Contenido real...
```

**Notas mínimas para cualquier proyecto:**

| Archivo | Contenido |
|---------|-----------|
| `memory/projects/<nombre>.md` | Estado del proyecto, fases, commits importantes, gotchas |
| `memory/context/stack-tech.md` | Stack con versiones exactas, dependencias clave |
| `memory/context/agents-workflow.md` | Roles del equipo, quién hace qué, protocolos |

**Notas opcionales según el proyecto:**

| Archivo | Cuándo crearlo |
|---------|---------------|
| `memory/context/auth-patterns.md` | Si hay autenticación compleja |
| `memory/context/security-owasp.md` | Si hay requerimientos de seguridad |
| `memory/context/business-logic.md` | Si hay lógica de negocio crítica |
| `memory/context/infra-docker.md` | Si hay Docker/infra específica |

### PASO 3 — Configurar CLAUDE.md

Agregar esta sección al inicio del `CLAUDE.md` del proyecto:

```markdown
## 🧠 Segundo Cerebro — Carga automática obligatoria

**Antes de cualquier tarea, leer SIEMPRE en este orden:**

1. `memory/projects/<nombre-proyecto>.md` — estado completo
2. `memory/context/stack-tech.md` — stack exacto con versiones

**Según la tarea, leer el contexto específico:**

| Si la tarea involucra... | Leer también... |
|--------------------------|-----------------|
| Auth, login, sesiones | `memory/context/auth-patterns.md` |
| Seguridad, OWASP | `memory/context/security-owasp.md` |
| Lógica de negocio | `memory/context/business-logic.md` |
| Docker, infra, env vars | `memory/context/infra-docker.md` |
| Equipo, workflow | `memory/context/agents-workflow.md` |

**Al cerrar sesión:** ejecutar `/session-end` para actualizar memory/
con decisiones nuevas y hacer commit.

> ⚡ El hook post-commit captura todos los commits automáticamente
> en `memory/.pending-notes`. `/session-end` los procesa y los
> convierte en conocimiento estructurado. Sin este paso final,
> los commits quedan capturados pero sin procesar.
```

### PASO 4 — Crear el comando /session-end

Crear `.claude/commands/session-end.md`:

```markdown
---
description: Cierra la sesión actualizando el segundo cerebro del proyecto
---

Al ejecutar este comando:

1. Leer memory/.pending-notes si existe — son los commits
   auto-capturados desde el último session-end.
   Incorporarlos al contexto antes de escribir las notas.

2. Resumir decisiones técnicas nuevas de la sesión (máx 10 bullets)
   usando los commits de .pending-notes como base.

3. Identificar gotchas nuevos descubiertos.

4. Actualizar los archivos memory/ relevantes (enriquecer, no sobreescribir).

5. Ejecutar:
   git add memory/
   git commit -m "chore(memory): session notes $(date +%Y-%m-%d)"

6. Eliminar memory/.pending-notes:
   rm -f memory/.pending-notes

7. Confirmar archivos actualizados y secciones cambiadas.
```

Commitear con `-f` porque `.claude/commands/` puede estar en `.gitignore`:

```bash
git add -f .claude/commands/session-end.md
git commit -m "chore(claude): agregar comando /session-end"
```

### PASO 5 — Hook post-commit (captura automática)

Crear `.git/hooks/post-commit`:

```bash
#!/bin/bash
# Auto-captura cada commit en memory/.pending-notes
# /session-end lo procesa y limpia al final de sesión

COMMIT_HASH=$(git log -1 --pretty="%h")
COMMIT_MSG=$(git log -1 --pretty="%s")
COMMIT_DATE=$(date +"%Y-%m-%d %H:%M")
BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "- [$COMMIT_DATE] \`$COMMIT_HASH\` ($BRANCH) — $COMMIT_MSG" >> memory/.pending-notes
```

```bash
chmod +x .git/hooks/post-commit
```

**⚠️ GOTCHA CRÍTICO — core.hooksPath global:**

Si el usuario tiene un `core.hooksPath` global en `~/.gitconfig` apuntando a
`~/.config/git/hooks`, el hook local `.git/hooks/post-commit` será ignorado.

Verificar si existe el problema:
```bash
git config --global core.hooksPath
# Si devuelve algo → el hook local no funcionará
```

Fix (solo para este repo):
```bash
git config --local core.hooksPath .git/hooks

# Si el usuario tiene un pre-commit global de seguridad, preservarlo:
cp ~/.config/git/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

Agregar `memory/.pending-notes` al `.gitignore`:
```bash
echo "memory/.pending-notes" >> .gitignore
git add .gitignore
git commit -m "chore: gitignore memory/.pending-notes"
```

### PASO 6 — Verificar que el hook funciona

```bash
# Hacer un commit de prueba
touch memory/.test-hook
git add memory/.test-hook
git commit -m "test: verificar hook post-commit"

# Verificar que se capturó
cat memory/.pending-notes
# Debe mostrar la línea del commit de prueba

# Limpiar
git rm memory/.test-hook
git commit -m "test: cleanup"
rm -f memory/.pending-notes
```

---

## Configurar Obsidian

### PASO 7 — Abrir el vault

En Obsidian: **File → Open folder as vault** → seleccionar la **raíz del proyecto**.

> El vault debe apuntar a la raíz del repo, no a `memory/`.
> Obsidian indexa todo, pero los filtros del siguiente paso limpian el ruido.

El nombre del vault en Obsidian será el nombre de la carpeta del proyecto.

### PASO 8 — Configurar filtros del vault

Crear o editar `.obsidian/app.json`:

```json
{
  "userIgnoreFilters": [
    "node_modules",
    ".next",
    ".turbo",
    "zip",
    "packages",
    "apps",
    "screenshots",
    ".worktrees",
    ".claude",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "turbo.json",
    "docker-compose.yml",
    "package.json"
  ]
}
```

Adaptar según el proyecto — excluir todo lo que no sea documentación relevante.

> `.obsidian/` debe estar en `.gitignore` — es configuración local, no del equipo.

Verificar que esté ignorado:
```bash
grep ".obsidian" .gitignore || echo "memory/.obsidian/" >> .gitignore
```

### PASO 9 — Reiniciar Obsidian

Cerrar y volver a abrir Obsidian. El grafo debe mostrar solo los nodos de
`memory/` con sus wikilinks cruzados — limpio y navegable.

---

## El flujo completo día a día

```
━━━ INICIO DE SESIÓN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Claude Code abre el proyecto
  → Lee CLAUDE.md automáticamente
  → Ve la sección "Segundo Cerebro"
  → Lee memory/projects/<nombre>.md
  → Lee memory/context/stack-tech.md
  → Lee el contexto específico según la tarea
  → Ya sabe todo — sin que digas nada
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━ DURANTE LA SESIÓN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Cada commit que hace el agente
  → hook post-commit dispara automáticamente
  → escribe en memory/.pending-notes
  → acumula sin interrumpir el trabajo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━ CIERRE DE SESIÓN (después de cada merge) ━━━━━━━━━━━
  Tú le dices al agente: /session-end
  → Lee memory/.pending-notes (commits acumulados)
  → Resume decisiones técnicas de la sesión
  → Actualiza los archivos memory/ relevantes
  → Commit: chore(memory): session notes YYYY-MM-DD
  → Borra memory/.pending-notes
  → Working tree limpio, memoria actualizada
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Protocolo de cierre de fase (OBLIGATORIO)

Después de cada merge a main — sin excepción:

1. El agente que hizo el merge ejecuta `/session-end` inmediatamente
2. `/session-end` procesa `memory/.pending-notes` (commits acumulados)
3. Actualiza `memory/` con decisiones de la fase
4. Hace commit `chore(memory)`
5. Recién entonces la fase está 100% cerrada

> Sin `/session-end`, el conocimiento de la fase se pierde aunque
> el código esté mergeado.

---

## Checklist de instalación completa

```
□ memory/projects/<nombre>.md creado con contenido real
□ memory/context/stack-tech.md creado
□ memory/context/agents-workflow.md creado
□ CLAUDE.md tiene sección "Segundo Cerebro" con tabla de contexto
□ .claude/commands/session-end.md creado y commiteado con -f
□ .git/hooks/post-commit creado con chmod +x
□ core.hooksPath local configurado si es necesario
□ memory/.pending-notes en .gitignore
□ Hook verificado con commit de prueba
□ Obsidian abierto con vault en raíz del proyecto
□ .obsidian/app.json con userIgnoreFilters configurados
□ .obsidian/ en .gitignore
□ Grafo de Obsidian muestra solo nodos de memory/
```

---

## Gotchas conocidos

| # | Problema | Causa | Fix |
|---|----------|-------|-----|
| 1 | Hook post-commit no dispara | `core.hooksPath` global sobreescribe el local | `git config --local core.hooksPath .git/hooks` |
| 2 | Pre-commit de seguridad desaparece | Al cambiar hooksPath, el hook global ya no corre | Copiar `~/.config/git/hooks/pre-commit` a `.git/hooks/` |
| 3 | Obsidian muestra miles de nodos | Vault apunta a raíz sin filtros | Configurar `userIgnoreFilters` en `.obsidian/app.json` |
| 4 | `.pending-notes` crece indefinidamente | Nunca se corre `/session-end` | Correr `/session-end` después de cada merge — no se pierde info, solo queda sin procesar |
| 5 | Obsidian no actualiza el grafo | Los filtros se aplicaron con Obsidian abierto | Cerrar y volver a abrir Obsidian |
| 6 | session-end.md no aparece como comando | `.claude/commands/` está en `.gitignore` | `git add -f .claude/commands/session-end.md` |

---

## Qué resuelve y qué NO resuelve

| ✅ Resuelve | ❌ No resuelve (aún) |
|------------|---------------------|
| Re-explicar el stack en cada sesión | Recuperar conversaciones completas |
| Olvidar gotchas ya descubiertos | Estado en tiempo real del servidor |
| Re-descubrir bugs ya solucionados | Lo que nunca se escribió en los archivos |
| Descoordinación entre agentes del equipo | Sesiones muy largas (usar `/compact`) |

El sistema falla si nunca se corre `/session-end`. Los commits se capturan
automáticamente, pero el conocimiento estructurado requiere ese paso de procesamiento.

---

## Replicar en un proyecto nuevo — Tiempo estimado

| Paso | Tiempo |
|------|--------|
| Crear estructura memory/ + notas iniciales | 30-45 min |
| Configurar CLAUDE.md | 5 min |
| Crear /session-end | 5 min |
| Configurar hook post-commit | 10 min |
| Configurar Obsidian vault + filtros | 10 min |
| **Total** | **~1 hora** |

La mayor parte del tiempo es escribir el contenido real de las notas.
Las plantillas de esta guía reducen ese tiempo a la mitad.

---

*Implementado originalmente en POS Chile — Abril 2026*  
*Equipo: Claude Cowork (coordinador) · Claude Code CLI · Claude Code Worktree · Gemini*
