# docs/ — Documentación del proyecto DyPos CL

Esta carpeta es el manual técnico oficial de DyPos CL. No se despliega al VPS
(excluida del rsync en `scripts/deploy.sh`).

## Mapa rápido

```
docs/
├── architecture/             ← FUENTE DE VERDAD ARQUITECTÓNICA (Fase 1)
│   ├── README.md             # Visión técnica + diagrama Mermaid
│   ├── frontend.md           # Next.js 15, RSC, Tailwind v4, shadcn/ui
│   ├── backend.md            # Server Actions, API v1, NextAuth, contratos
│   ├── database.md           # Prisma 6, soft-delete, AuditLog, migrations
│   ├── mobile.md             # Expo SDK 54, stores, sync offline
│   ├── deploy-ops.md         # deploy.sh, backups, rollback, smoke
│   ├── tenant-provisioning.md # SaaS dedicado (Camino C)
│   ├── testing-ci.md         # Vitest + Jest + GitHub Actions
│   └── decision-log.md       # ADRs vigentes + DECISION_REQUIRED
│
├── adr/                      # Architecture Decision Records históricos
│   ├── 001-arquitectura-saas-deployment-dedicado.md
│   └── 002-multi-tenant-future-migration.md
│
├── audits/                   # Audits profesionales históricos (SUPERSEDED)
│   └── audit-2026-04-28.md   # Audit Codex/CLI 2026-04-27 (disparó Fase 0)
│
├── operations/               # Runbooks operacionales y checklists externos
│   └── external-setup-checklist.md  # Pasos que solo Pierre ejecuta (Fase 2A)
│
├── design/                   # Capturas UX y prototipos
│   ├── preview.html
│   └── screenshots/
│
├── privacy/                  # Política de privacidad y rollout
│   └── privacy-rollout-plan.md
│
├── setup/                    # Guías one-time
│   ├── obsidian-claude.md
│   └── nginx-apk-distribution.md
│
├── m7-runbook.md             # Runbook ops post-deploy (smoke, rollback)
├── mobile-release-runbook.md # Build APK + publicar release
├── audit-2026-04-25.md       # Audit anterior (referencia)
├── PRICING-STRATEGY.md       # Estrategia comercial
├── SALES-PHILOSOPHY.md       # Cómo vender DyPos CL
└── VISION.md                 # Visión de producto
```

## Cómo empezar

**Si sos un agente nuevo** (Claude Code Worktree, CLI, Codex):

1. Leer `CLAUDE.md` raíz (reglas absolutas).
2. Leer `memory/projects/pos-chile-monorepo.md` (estado vivo).
3. Leer `docs/architecture/README.md` (visión técnica oficial).
4. Según la tarea, leer el doc específico de `docs/architecture/`.

**Si sos Pierre o reviewer humano:**

- Estado del producto: `memory/projects/pos-chile-monorepo.md`.
- Decisiones que requieren tu input: `docs/architecture/decision-log.md`
  (sección `DECISION_REQUIRED`).
- Cómo deployar: `docs/architecture/deploy-ops.md`.
- Cómo onboardar un cliente: `docs/architecture/tenant-provisioning.md`.

**Si vas a tocar código:**

- UI web → `docs/architecture/frontend.md` + `backend.md`.
- API mobile → `docs/architecture/backend.md` + `mobile.md`.
- Schema BD → `docs/architecture/database.md` + nueva migration + ADR.
- Deploy → `docs/architecture/deploy-ops.md` (estricto).

## Notas

- Los archivos de `docs/architecture/` son **fuente de verdad** sobre cómo
  está construido el sistema. Si encontrás divergencia con el código,
  **arreglá el doc** en el mismo PR (no lo dejés desactualizado).
- Decisiones nuevas → crear ADR en `docs/adr/NNN-titulo.md` y registrarlas en
  `decision-log.md`.
- Audits viejos viven en `docs/audits/` con header SUPERSEDED para trazabilidad.
- `design/screenshots/` — imágenes del audit UX realizado en fase 19.
- `design/preview.html` — prototipo estático histórico.

---

_Última revisión del índice: 2026-04-29 — Fase 1 cerrada._
