---
title: DR-01 — Branch protection en `main`
date: 2026-05-02
status: active
priority: high
owner: Pierre
tags:
  - open-loop
  - github
  - governance
  - ci
---

# DR-01 — Branch protection en `main`

## Contexto

El repo `Dysa-Devlmer/pos_dysa` tiene CI con check `web (type-check
+ lint + test + build)` y check `mobile`, pero **GitHub no exige**
que esos checks pasen antes de mergear/pushear a `main`. Eso hace
que cualquier commit (humano o agente) pueda ir directo a `main`
sin que la red de seguridad lo bloquee.

Los pushes recientes lo evidencian: GitHub responde con la
advertencia inline:

```
remote: - Required status check "web (type-check + lint + test + build)" is expected.
```

…pero acepta el push. La advertencia sin enforcement es
decorativa.

## Origen y estado real (no es un loop fresco)

Registrado originalmente como `DR-01` en
`docs/architecture/decision-log.md:50` desde Fase 0
(≈2026-04-29). Hay también historia operativa en
`memory/projects/pos-chile-monorepo.md`:

- Línea 559 lista F-5 como ✅ con texto "branch protection".
- Línea 667 menciona configuración vía `gh api PUT
  /repos/.../branches/main/protection` desde Cowork con admin
  scope.
- Gotcha `G-M49` dice "Branch protection main bloquea push directo
  si hay status".
- Línea 964 declara "branch protection se cumple".

Pero la **evidencia observable hoy** (pushes recientes en sesiones
3B y 3C.1) muestra el mensaje `Required status check ... is
expected` sin que el push falle. Eso indica que la regla está en
modo **advisory, no enforcing**, o que algún campo crítico
(`enforce_admins`, `required_status_checks.strict`) regresó al
default después de la configuración inicial de F-5.

Promueve este open-loop **no para configurar de cero**, sino para
**verificar el estado actual y endurecer lo que esté en advisory**.
Aplicar gobernanza correctamente: cuando una decisión histórica
regresa a estado activo, no duplicar — referenciar el origen y
documentar qué cambió.

Diferencia con DR-01 original:
- DR-01 en `decision-log.md`: configuración inicial.
- Este open-loop: **regresión / verificación post-F-5**.

## Por qué es alta prioridad

- Hoy un agente puede pushear directo a `main` saltándose review.
- Si un cambio rompe build/test pero el push pasa, no hay
  bloqueador automático antes de prod.
- A medida que el equipo crece (Codex, agentes Claude, futuro
  contractor), el blast radius crece.
- Es una **acción externa** de Pierre — ningún agente puede
  configurar branch protection desde el repo. Sin el dueño
  marcado, queda flotando.

## Evidencia del problema

- Pushes con bypass observados en sesiones recientes (la
  advertencia "Required status check ... is expected" aparece en
  el output de `git push` pero el push se completa).
- Commits que llegan a `main` sin PR ni review: revisar `git log
  --merges main` vs `git log main` para ver el ratio de
  fast-forward directos.
- `docs/architecture/decision-log.md` lo lista como pendiente
  desde Fase 0 (≈2026-04-29).

## Criterio de cierre

GitHub Settings → Branches → Branch protection rule for `main`,
con todos los siguientes activos:

- [ ] **Require a pull request before merging** (1 reviewer mínimo).
- [ ] **Require status checks to pass before merging**, marcando
  como required: `web (type-check + lint + test + build)` y el
  check de `mobile`.
- [ ] **Require branches to be up to date before merging**.
- [ ] **Do not allow bypassing the above settings** (incluido para
  admins, salvo emergencia documentada).
- [ ] **Restrict who can push to matching branches** vacío o solo
  Pierre (sin agentes con write directo).
- [ ] **No force push** activado.
- [ ] **Linear history** activado (opcional pero recomendado para
  mantener `git log` limpio).

## Acción concreta

Pierre, en GitHub:

1. Repo → Settings → Branches → revisar la regla existente para
   `main` (puede haber sido creada en F-5 vía `gh api`).
2. Si existe, completar las casillas faltantes (ver criterio de
   cierre arriba). Especialmente verificar **"Do not allow
   bypassing"** y que los status checks estén marcados como
   *required* (no solo *expected*).
3. Si no existe, crear una nueva con todos los campos.
4. Guardar.
5. Verificar con un push de prueba que el bloqueo funciona (push
   directo a `main` debe **fallar** ahora, no solo emitir warning).

Tiempo estimado: **5 minutos**.

## Quién no puede cerrarlo

Ningún agente. Es UI de GitHub web, requiere sesión humana
autenticada como owner del repo.

## Riesgo de no cerrarlo

Cualquier sesión futura puede romper `main` sin bloqueo. La red
de seguridad existe (CI corre) pero es **advisory**, no
enforced. Una regresión que pasa los hooks locales pero no la
CI llega a prod si nadie mira el resultado del workflow antes
de deployar.

## Cierre

_Pendiente — agregar bloque cuando Pierre aplique la
configuración con captura de Settings → Branches → rule activa._
