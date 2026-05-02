---
title: Agents & Workflow — Roles, Reglas y Protocolo de Verificación
tags:
  - workflow
  - agentes
  - proceso
  - contexto
aliases:
  - Agents Workflow
  - Agent Roles
---

# Agents & Workflow — Roles, Reglas y Protocolo de Verificación

El monorepo [[pos-chile-monorepo]] se desarrolla en equipo entre múltiples agentes con roles específicos. Esta nota define quién hace qué, cómo se verifica el trabajo y cuál es el protocolo cuando una fase pasa de un agente a otro.

Relacionado: [[pos-chile-monorepo]] · [[security-owasp]] · [[business-logic]]

## Roster de agentes

| Agente | Rol | Herramientas |
|--------|-----|--------------|
| **Claude Cowork** (yo) | Coordinador, memoria, verificación independiente, redacción de instrucciones | Lectura repo, memoria, redacta prompts para otros agentes |
| **Claude Code CLI** | Infra, auth, fixes puntuales, API, deploy, hotfixes | Terminal, edición de archivos, Docker, pnpm scripts |
| **Claude Code Worktree** | Features grandes (1 worktree nuevo por tarea) | Git worktree aislado, merge `--no-ff` al finalizar |
| **Gemini** | Security audit, tests, code review, docs API | Análisis estático, generación de tests, reporte con evidencia |
| **Pierre** | Operador humano — copia instrucciones entre agentes | Puente entre Cowork ↔ CLI/Worktree/Gemini |

> [!info] Por qué Pierre existe
> Los agentes no se comunican entre sí. Cowork redacta la instrucción en formato estructurado (ver abajo) y Pierre la copia al prompt del agente destinatario. El reporte del agente vuelve por el mismo canal.

## Principios de trabajo

### 0. Snapshot real antes de cualquier brief o reporte

Todo brief que Cowork entregue y todo reporte que vuelva de un agente
debe empezar con un snapshot real del repo:

```bash
git fetch
git log origin/main..HEAD --oneline
git status -sb
```

Formato mínimo esperado al inicio del mensaje:

```markdown
## Snapshot repo
- `git fetch`: OK / error exacto
- `git log origin/main..HEAD --oneline`: <salida exacta o "(vacío)">
- `git status -sb`: <salida exacta>
```

Razón: con cuatro agentes, el modelo mental del estado git se desfasa
fácilmente. En Fase 3C.1 se observó una discrepancia real: Codex pensó
que `main` estaba ahead 2 cuando el estado efectivo incluía otro commit
de memoria (`420ebbe`). Este snapshot detecta automáticamente cambios
locales, commits ahead, commits no pusheados y trabajo de otro agente
antes de recomendar, verificar, commitear o reportar.

Regla operativa:

- Si `git fetch` falla, reportar el error y continuar solo con lectura
  local o pedir escalación si la tarea depende del remoto.
- Si `git log origin/main..HEAD --oneline` no está vacío, listar esos
  commits antes de decir "main está sincronizado".
- Si `git status -sb` muestra cambios locales, declarar si son propios,
  de otro agente o desconocidos. No tocarlos sin scope explícito.
- Esta regla aplica también a tareas "solo docs" y "solo memoria".

### 1. Toda instrucción indica el agente destinatario

La primera línea de cualquier prompt que Cowork redacta es:

```
AGENTE: Claude Code CLI
AGENTE: Claude Code Worktree
AGENTE: Gemini
```

Esto evita confusión cuando Pierre copia la instrucción y permite al agente activar el contexto apropiado (ej: Worktree debe crear worktree; CLI trabaja sobre la rama actual).

### 2. Verificación obligatoria antes de reportar

Cada instrucción incluye un bloque `## Verificación` que el agente debe ejecutar y reportar resultado:

- `pnpm type-check` — TypeScript sin errores
- `pnpm build` — Build producción limpio
- `pnpm test` (si aplica) — Suite vitest passing
- Prueba funcional manual descrita paso a paso
- Lectura de archivos modificados para confirmar cambios

Sin esto el agente NO puede decir "listo". Pierre rechaza el reporte si no incluye evidencia de los 5 pasos.

### 3. Cowork verifica independientemente

> [!warning] Regla sagrada: no confiar ciegamente en reportes
> Cuando el agente reporta "listo", Cowork **lee los archivos reales**, corre type-check/build propio si hay dudas, y solo entonces confirma. Si Cowork detecta un gap que el agente omitió, se redacta un follow-up con ID `fix-*` e instrucciones precisas.

Razón: los agentes a veces generan reportes optimistas ("todo OK") con bugs reales en el código. Verificar es barato; arreglar un bug en producción no lo es.

> [!warning] G-DOCS-VS-CODE — docs orientada a cliente
> Cuando un agente escribe documentación funcional (manuales, FAQ,
> onboarding) para usuario final, **cada afirmación se verifica contra
> el código real, no contra la visión/roadmap del producto**. Es fácil
> prometer features que existen en el plan pero no en el binario.
>
> Casos típicos de sobrepromesa detectados en Fase 3B (`b89b178`,
> `c6d4ad3`):
> - "el sistema te obliga a X" → verificar guard/redirect en código.
> - "podés compartir Y por Z" → verificar integración real, no solo el botón.
> - "el dispositivo abre Q automáticamente" → verificar driver/protocolo.
>
> Aplicar a `docs/product/`, `README.md` orientado a cliente,
> emails de onboarding, copy comercial. Lo que el código no hace
> hoy va en sección "Roadmap" o se elimina.

### 4. Gemini siempre reporta con evidencia

Formato obligatorio para hallazgos de Gemini:

```markdown
### Hallazgo Gn — <título>
**Archivo**: apps/web/<path>:<línea>
**Severidad**: CRÍTICO | ALTO | MEDIO | BAJO | INFO
**Código actual**:
```ts
// copy-paste exacto de las líneas relevantes
```
**Por qué es un problema**: 2-3 líneas
**Fix propuesto**:
```ts
// código sugerido
```
```

Cowork reproduce el hallazgo (lee la línea) antes de aceptarlo. Si no se puede reproducir → falso positivo, Cowork documenta por qué.

### 5. Worktree — flujo estricto

Cada feature grande (Fases 3-13) se hizo en un worktree separado. Protocolo:

1. **Cowork** redacta spec completa de la fase con todos los archivos esperados
2. **Pierre** crea el worktree: `git worktree add ../system_pos-fase-N claude/fase-N`
3. **Pierre** copia el prompt al CLI dentro del worktree
4. **Claude Code Worktree** implementa + verifica (type-check, build, prueba manual)
5. **Worktree** hace commit en su rama + reporta a Pierre
6. **Pierre** vuelve a main y ejecuta `git merge --no-ff claude/fase-N`
7. **Cowork** verifica el merge leyendo archivos clave
8. **Pierre** elimina el worktree: `git worktree remove ../system_pos-fase-N`
9. **Pierre** elimina la rama: `git branch -D claude/fase-N`

> [!danger] Nunca `rm -rf` worktree
> Eliminar el worktree con `rm -rf` en vez de `git worktree remove` deja referencias stale en `.git/worktrees/`. Solución si pasa: `git worktree prune`.

### 6. Conversión de fechas relativas a absolutas

Si el usuario dice "el jueves" o "la semana pasada", Cowork convierte a fecha absoluta ISO (`2026-04-19`) antes de guardar en memoria. Razón: memoria persiste entre sesiones, fechas relativas pierden sentido.

## Protocolo de cierre de fase (OBLIGATORIO)

Después de cada merge a `main` — sin excepción:

1. El agente que hizo el merge ejecuta `/session-end` inmediatamente
2. `/session-end` procesa `memory/.pending-notes` (commits acumulados por el hook post-commit)
3. Actualiza `memory/` con decisiones de la fase
4. Hace commit `chore(memory): session notes YYYY-MM-DD`
5. Recién entonces la fase está 100% cerrada

> [!warning] Sin `/session-end`, el conocimiento se pierde
> Este paso convierte cada merge en un punto de aprendizaje permanente.
> Los commits quedan capturados automáticamente en `.pending-notes`
> por el hook, pero sin `/session-end` NO se procesan en conocimiento estructurado.

### Cómo funciona el hook post-commit

`.git/hooks/post-commit` escribe una línea en `memory/.pending-notes` con cada commit:

```
- [YYYY-MM-DD HH:MM] `<hash>` (<branch>) — <subject>
```

Requisitos locales del repo:
- `git config --local core.hooksPath .git/hooks` (override del global)
- `.git/hooks/pre-commit` copiado del global (preserva protección anti-secretos)
- `memory/.pending-notes` ignorado en `.gitignore`

## Plan maestro — qué hizo cada agente

| Fase | Feature | Agente | Commit |
|------|---------|--------|--------|
| 1 | Setup monorepo + Docker + Prisma | CLI | `253f2c4` |
| fix-1 | dotenv-cli + Docker cleanup | CLI | `6e93c56` |
| 2 | NextAuth v5 + roles + layout | CLI | `063edfb` |
| fix-2 | E2E auth: env + Prisma resolution | CLI | `d25add8` |
| 3 | CRUD: Categorías, Productos, Clientes, Usuarios | **Worktree** | `23faa99` |
| 4 | Módulo Ventas + stock transaccional | **Worktree** | `60d5dd9` |
| 5 | POS Caja + IVA + boleta nanoid | **Worktree** | `fe13e63` |
| 6 | Dashboard KPIs + Recharts | **Worktree** | `bc89c09` |
| 7 | Reportes PDF @react-pdf + Excel | **Worktree** | `3c6f96d` |
| 8 | API REST + security + Vitest + Docker | CLI | `acdcbce` |
| audit-1 | Security audit 10 hallazgos | **Gemini** | integrado en `acdcbce` |
| fix-3 | Scalar reemplaza swagger-ui-react | CLI | `a3296ec` |
| 14 | Infra Pro: rate limit Upstash + health | CLI | `80543c6` |
| 9 | Perfil usuario + avatar base64 | **Worktree** | `4837a84` |
| 10 | Alertas stock bajo | **Worktree** | `c691b0c` |
| 11 | Descuentos en ventas + caja | **Worktree** | `33ae07e` |
| 12 | Devoluciones con lock pesimista | **Worktree** | `a4830e3` |
| audit-2 | Security audit fases 9-12 | **Gemini** | `7d36161` |
| 13 | UX Pro: dark mode + animaciones | **Worktree** | `30a2065` |
| audit-3 | OWASP Top 10 — GAP-1 headers + GAP-2 Sentry | CLI | `2b90ed8` |
| fix-4 | RBAC middleware edge (session callback compartido) | CLI | `81933a5` |
| audit-4 | GAP-PROD-1 checkEnv + GAP-PROD-2 rate-limit warn | CLI | `3bec5f5` |
| audit-5 | Gemini UX audit (chart/table/badges/icon-button) | CLI | `2d4f8ce` |
| 15 | UX Premium — sidebar + KPIs sparkline + skeletons + inputs formato | **Worktree** | `4c158df` |
| 16 | POS Caja premium — split 60/40 + category pills + shortcuts | **Worktree** | `cb44e3e` |
| 17 | Pages premium — login + 404/error + empty states + alertas urgency | **Worktree** | `50d047d` |
| 18 | Production hardening — PWA + metadata + health + README | CLI | `5234212` |
| 19 | Docs arquitecturales + tests edge (hydration + RUT + boundary) | CLI | `7e7444c` |

## Gotchas del workflow

> [!warning] Pierre no puede `git rebase -i`
> Los flags interactivos rompen en shells no-TTY. Todo lo que requiera editor: dividir en N commits por adelantado.

> [!warning] Claude Code CLI protege `rm -rf`
> La protección hardcoded rechaza `rm -rf`. Usar `rm -r` (sin `-f`) — si protestas un permiso, investigar en vez de forzar.

> [!warning] Pierre tiene `DATABASE_URL=postgres://...supabase...` en el shell
> Por eso todos los scripts Prisma usan `dotenv -e .env -o -- prisma ...` (`-o` = override del env shell). Sin esto, `prisma db:push` iría a Supabase en vez de localhost.

> [!info] Turbopack + Prisma resolution
> `apps/web/package.json` debe tener `@prisma/client` como dep directa (no solo transitivo de `@repo/db`) + `next.config.ts` debe declarar `serverExternalPackages: ["@prisma/client"]`. Sin ambas, Turbopack isolation rompe en dev.

## Checklist antes de iniciar una nueva fase

- [ ] Ejecutar y pegar snapshot repo:
      `git fetch`, `git log origin/main..HEAD --oneline`,
      `git status -sb`
- [ ] Leer `CLAUDE.md` en raíz — reglas absolutas del proyecto
- [ ] Leer `memory/projects/pos-chile-monorepo.md` — estado global
- [ ] Leer `memory/README.md` — mapa del segundo cerebro
- [ ] Leer nota de contexto relevante (`auth-patterns.md`, `security-owasp.md`, etc.)
- [ ] Si la tarea toca memoria, docs, proceso o roadmap: leer `memory/context/second-brain-system.md`
- [ ] Decidir agente destinatario (CLI vs Worktree vs Gemini)
- [ ] Redactar prompt con `AGENTE:` + `## Verificación` + lista de archivos esperados
- [ ] Al recibir reporte: verificar independientemente leyendo archivos
- [ ] Tras merge: actualizar `memory/projects/pos-chile-monorepo.md` con commit + estado
- [ ] Si hay gotcha nueva: documentar en `CLAUDE.md` + nota de contexto apropiada

## Segundo cerebro completo

Desde 2026-05-01, `memory/` no guarda solo estado técnico. Funciona como
un segundo cerebro completo y actualizable:

- `episodes/` — recuerdos de sesiones, deploys, builds, smokes e incidentes.
- `problems/` — bugs, riesgos, deudas y brechas entre docs y código.
- `solutions/` — soluciones reutilizables y patrones probados.
- `learnings/` — aprendizajes que cambian reglas de trabajo.
- `ideas/` — mejoras y features candidatas, sin tratarlas como promesas.
- `recommendations/` — recomendaciones vigentes con criterio y prioridad.
- `open-loops/` — pendientes, bloqueos y decisiones que no deben perderse.

Regla: si una experiencia deja aprendizaje reutilizable, no basta con
contarla en el chat. Debe quedar en la carpeta correcta de `memory/`.
