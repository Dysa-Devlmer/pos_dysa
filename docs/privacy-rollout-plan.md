# Privacy Compliance Rollout — Plan de ejecución multi-agente

> **Propósito**: coordinar el trabajo de implementación de privacy compliance en POS Chile distribuido entre 5 agentes (CLI, Worktree, Cowork, Gemini, Pierre). Alineado con el skill `.claude/skills/privacy-compliance/` y el runbook M7.
>
> **Motivación directa**: cerrar el gap ❌ que el CEO/Pierre identificó: *"Privacy Policy URL pública — borrador legal + página /privacidad en Next.js"*, expandido a todos los blockers adyacentes de M7 (store submit) y Ley 21.719 vigente Dic 2026.
>
> **Fecha de inicio**: 2026-04-23
> **Fecha objetivo de cierre Fase A-C (técnico)**: 2026-04-30
> **Fecha objetivo de cierre Fase D (legal/governance)**: 2026-05-15

---

## 📋 Resumen ejecutivo

Dividimos el trabajo en **5 fases** paralelizables donde se pueda. Cada fase tiene tareas numeradas, agente responsable, prerequisitos y criterio de verificación. El resultado final es:

1. **Política de privacidad pública** en `https://dy-pos.zgamersa.com/privacidad`.
2. **Endpoints ARCOP+** operativos (`/api/v1/me/data-export`, `/erase`, `/consent`).
3. **Consent banner** en web y mobile con opt-in granular.
4. **Registro de Actividades de Tratamiento (RAT)** documentado.
5. **DPAs verificados** con Sentry, PostHog, Vultr, Upstash.
6. **App Privacy (iOS) + Data Safety (Android)** completos para submit.

**Sin esto → M7 bloqueado.** Play Store y App Store rechazan el submit por falta de política pública. Esto se arregla en la Fase A.

---

## 🗂 Estructura del equipo

| Agente | Rol en este rollout |
|---|---|
| **Claude Code CLI** | Infra, endpoints API, migrations Prisma, `pseudonymize()`, deploy a prod cuando corresponda |
| **Claude Code Worktree** | Integración frontend (consent banner en layout, privacy link en login/perfil, mobile privacy tab) |
| **Claude Cowork** | Coordinador del rollout, verifica cada fase antes de dar luz verde a la siguiente, mantiene memory/ |
| **Gemini** | Audit independiente post-implementación (penetration test de endpoints ARCOP+, policy review contra Ley 21.719) |
| **Pierre** | Interface con abogado Dysa, firma DPAs, decisiones de negocio (nombre DPO, razón social en policy), coordinación con stores |

---

## 📐 Prerequisitos antes de arrancar

Checkpoints que deben estar ✅ antes de la primera línea de código:

- [ ] `memory/projects/pos-chile-privacy-rat.md` creado (vacío, solo estructura) — **Pierre**
- [ ] Pierre/CEO confirma razón social legal + RUT + dirección legal de Dysa → necesario para el template de policy
- [ ] Pierre confirma email DPO dedicado: `privacidad@dysa.cl` o equivalente (crear si no existe)
- [ ] Pierre designa un DPO (nombre real) o acepta "equipo de privacidad" como placeholder
- [ ] Abogado especializado identificado (Carey, Claro & Cía, Urenda Rencoret, PrivacyBox, AIA Chile) — Pierre confirma antes del final de Fase A

---

## Fase A — Foundation (1-2 días) · sin bloqueadores externos

**Objetivo**: construir los bloques técnicos básicos que todo lo demás necesita. Totalmente local, no requiere cuentas, no toca prod.

### A.1 — Auditoría inicial con `pii_scanner.py`

- **Agente**: CLI
- **Esfuerzo**: 15 min
- **Entregable**: `docs/privacy/pii-scan-2026-04-23.md` (reporte commiteado)

**Pasos**:
```bash
python3 .claude/skills/privacy-compliance/scripts/pii_scanner.py . \
  --output docs/privacy/pii-scan-$(date +%F).md

# Commit
mkdir -p docs/privacy
git add docs/privacy/pii-scan-*.md
git commit -m "docs(privacy): baseline PII scan antes de rollout compliance"
```

**Verificación Cowork**: revisar que el reporte tiene 0 findings "critical" y documentar cada "high" con plan de remediación (en issue o comentario del commit).

### A.2 — Helper `pseudonymize()`

- **Agente**: CLI
- **Esfuerzo**: 30 min
- **Entregable**: `apps/web/lib/privacy.ts` + entry en `apps/web/.env.example` + test unitario

**Qué implementar**:

```typescript
// apps/web/lib/privacy.ts
import { createHash } from "crypto";

const LOG_SALT = process.env.PII_LOG_SALT;

if (process.env.NODE_ENV === "production" && !LOG_SALT) {
  throw new Error("PII_LOG_SALT requerido en producción");
}

export function pseudonymize(value: string | null | undefined): string | null {
  if (!value) return null;
  const salt = LOG_SALT ?? "dev-salt-not-for-prod";
  return createHash("sha256").update(salt + value).digest("hex").slice(0, 16);
}
```

**Env:**
```bash
# apps/web/.env.example
PII_LOG_SALT="<openssl rand -base64 32>"  # rotar anualmente, coordinar con equipo
```

**Test:**
```typescript
// apps/web/lib/privacy.test.ts
import { describe, it, expect } from "vitest";
import { pseudonymize } from "./privacy";

describe("pseudonymize", () => {
  it("same input → same hash", () => {
    expect(pseudonymize("12345678-9")).toBe(pseudonymize("12345678-9"));
  });
  it("different inputs → different hashes", () => {
    expect(pseudonymize("12345678-9")).not.toBe(pseudonymize("12345679-K"));
  });
  it("null/undefined → null", () => {
    expect(pseudonymize(null)).toBeNull();
    expect(pseudonymize(undefined)).toBeNull();
  });
  it("returns 16-char hex", () => {
    const h = pseudonymize("test");
    expect(h).toMatch(/^[a-f0-9]{16}$/);
  });
});
```

**Commit**: `feat(privacy): helper pseudonymize + env PII_LOG_SALT + tests`

### A.3 — Privacy Policy draft + página `/privacidad`

- **Agente**: CLI
- **Esfuerzo**: 2h
- **Entregables**:
  1. `docs/privacy/privacidad-v1.0-draft.md` (para abogado)
  2. `apps/web/app/privacidad/page.tsx` (página pública)
  3. Ajuste a `middleware.ts` para excluir ruta pública
  4. Link desde footer web

**Pasos**:

1. **Copiar template** → reemplazar placeholders con datos reales de Dysa (Pierre provee):
```bash
cp .claude/skills/privacy-compliance/templates/privacy-policy.es-CL.md \
   docs/privacy/privacidad-v1.0-draft.md

# Editar: reemplazar {{RAZÓN_SOCIAL}}, {{RUT}}, {{DIRECCIÓN_LEGAL}}, etc.
```

2. **Validar draft antes de seguir**:
```bash
python3 .claude/skills/privacy-compliance/scripts/privacy_policy_validator.py \
  docs/privacy/privacidad-v1.0-draft.md

# Objetivo: score ≥ 90
```

3. **Crear página Next.js**:
```tsx
// apps/web/app/privacidad/page.tsx
import type { Metadata } from "next";
import { promises as fs } from "fs";
import path from "path";

export const metadata: Metadata = {
  title: "Política de Privacidad — POS Chile",
  description: "Política de Privacidad y tratamiento de datos personales de POS Chile",
  robots: { index: true, follow: true },
};

export default async function PrivacidadPage() {
  const draftPath = path.join(process.cwd(), "../../docs/privacy/privacidad-v1.0-draft.md");
  // En producción el markdown se importa estáticamente o vía lector de fs
  // Alternativa: contenido hardcoded como JSX para evitar dependencia fs
  // ...
  return (
    <article className="prose prose-neutral dark:prose-invert mx-auto max-w-3xl px-4 py-12">
      {/* Markdown renderizado — usar react-markdown o contenido directo */}
    </article>
  );
}
```

**Alternativa recomendada**: convertir el MD a JSX estático para evitar dependencia en `fs` (ver `references/store-policies-apple-google.md#ubicación-en-app-store-connect`).

4. **Middleware**: asegurar que `/privacidad` sea pública:
```typescript
// apps/web/middleware.ts — matcher ya excluye rutas públicas, pero verificar
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|privacidad|manifest).*)'],
};
```

5. **Link desde footer global** (agregar `<Link href="/privacidad">` en layout).

**Verificación**:
- [ ] `curl -I https://dy-pos.zgamersa.com/privacidad` → 200 OK (post-deploy)
- [ ] Desde browser incógnito sin sesión → página carga y es legible
- [ ] `lighthouse` sobre la URL → accesibilidad ≥ 95
- [ ] `privacy_policy_validator.py https://dy-pos.zgamersa.com/privacidad` → score ≥ 90
- [ ] Robots.txt no la bloquea

**Commit**: `feat(privacy): página pública /privacidad + draft v1.0 para legal`

### A.4 — `PII_LOG_SALT` en `.env.docker` del VPS

- **Agente**: CLI + Pierre
- **Esfuerzo**: 10 min
- **Entregable**: prod tiene la env var seteada (sin commitear el valor).

**Pasos** (ejecutado por Pierre en su turno, con guía de CLI):
```bash
# En el VPS
NEW_SALT=$(openssl rand -base64 32)
echo "PII_LOG_SALT=\"$NEW_SALT\"" >> /root/pos-chile/.env.docker

# Restart para aplicar
cd /root/pos-chile
docker compose up -d --force-recreate
```

**Verificación**: ver logs Sentry después de deploy → `clienteHash` debe aparecer en vez de RUTs crudos.

---

## Fase B — Backend compliance (2-3 días)

**Objetivo**: endpoints ARCOP+ operativos + migration AuditLog.

### B.1 — Migration Prisma `AuditLog`

- **Agente**: CLI
- **Esfuerzo**: 45 min
- **Entregable**: `packages/db/prisma/migrations/YYYYMMDD_add_audit_log/` + schema actualizado

**Schema adición**:
```prisma
// packages/db/prisma/schema.prisma
model AuditLog {
  id             Int      @id @default(autoincrement())
  action         String   @db.VarChar(64)
  requesterEmail String?  @db.VarChar(255) @map("requester_email")
  requesterHash  String?  @db.VarChar(64)  @map("requester_hash")
  targetUserId   Int?     @map("target_user_id")
  actorUserId    Int?     @map("actor_user_id")
  legalBasis     String   @db.VarChar(128) @map("legal_basis")
  metadata       Json?
  status         String   @db.VarChar(32)  @default("PENDING")
  requestedAt    DateTime @default(now())   @map("requested_at")
  fulfilledAt    DateTime? @map("fulfilled_at")
  dueAt          DateTime @map("due_at")
  ipHash         String?  @db.VarChar(64)   @map("ip_hash")

  targetUser Usuario? @relation("AuditTarget", fields: [targetUserId], references: [id], onDelete: SetNull)
  actorUser  Usuario? @relation("AuditActor",  fields: [actorUserId],  references: [id], onDelete: SetNull)

  @@index([requesterHash])
  @@index([requestedAt])
  @@index([dueAt, status])
  @@map("audit_logs")
}

// En Usuario: agregar las back-references
model Usuario {
  // ...existentes
  auditAsTarget AuditLog[] @relation("AuditTarget")
  auditAsActor  AuditLog[] @relation("AuditActor")
}
```

**Pasos**:
```bash
cd packages/db
pnpm prisma migrate dev --name add_audit_log
# Verificar que la migration aplica sin errores sobre la DB local

# Commit
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): tabla AuditLog para ARCOP+ compliance (Ley 21.719 art. 15 ter)"
```

**Verificación Cowork**: schema sigue typecheckeando (`pnpm typecheck` 2/2), migration reversible.

### B.2 — Helper `apps/web/lib/audit.ts`

- **Agente**: CLI
- **Esfuerzo**: 30 min
- **Entregable**: función `auditLog()` reusable

Ver código completo en `.claude/skills/privacy-compliance/references/data-subject-rights.md#helper-central`.

### B.3 — Endpoint `GET /api/v1/me/data-export`

- **Agente**: CLI
- **Esfuerzo**: 1h
- **Entregable**: endpoint funcional + test integración

Ver implementación completa en `data-subject-rights.md#51-acceso-art-6`.

**Verificación con curl** (post-deploy local):
```bash
JWT=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pos-chile.cl","password":"admin123"}' | jq -r .token)

curl -H "Authorization: Bearer $JWT" http://localhost:3000/api/v1/me/data-export \
  | jq .data | head -20
```

### B.4 — Endpoint `DELETE /api/v1/me/erase`

- **Agente**: CLI
- **Esfuerzo**: 1.5h (incluye lógica de pseudonimización con SII 6 años)
- **Entregable**: endpoint + test integración + documentación inline

Ver implementación en `data-subject-rights.md#53-cancelación--supresión-art-8`.

**Verificación Cowork**: no se debe poder borrar ventas asociadas (SII retention). Confirmar que después del DELETE:
- `Cliente.nombre = "[Eliminado por solicitud del titular]"` si había ventas
- `Cliente` se elimina si no había ventas
- `Usuario` se desactiva o elimina según ventasAsociadas
- Entry en `audit_logs` con status=FULFILLED

### B.5 — Endpoint `POST /api/v1/me/consent`

- **Agente**: CLI
- **Esfuerzo**: 30 min
- **Entregable**: endpoint para que el consent banner pueda auditar server-side

```typescript
// apps/web/app/api/v1/me/consent/route.ts
const ConsentSchema = z.object({
  categories: z.object({
    necessary: z.boolean(),
    analytics: z.boolean(),
    preferences: z.boolean(),
  }),
  timestamp: z.number(),
});

export async function POST(request: Request) {
  const { session, error } = await requireAuth(request);
  if (error) return error;

  const body = await request.json();
  const parsed = ConsentSchema.safeParse(body);
  if (!parsed.success) return jsonError("Body inválido");

  await auditLog({
    action: parsed.data.categories.analytics ? "CONSENT_GIVEN" : "CONSENT_REVOKED",
    actorUserId: Number(session.user.id),
    legalBasis: "Ley 21.719 art. 5",
    metadata: parsed.data,
    status: "FULFILLED",
  });

  return NextResponse.json({ acknowledged: true });
}
```

**Commit conjunto B.3+B.4+B.5**: `feat(api-v1): endpoints ARCOP+ (/me/data-export, /erase, /consent)`

---

## Fase C — Frontend integration (2 días, paralelizable con B)

**Objetivo**: consent banner visible + privacy link en lugares clave.

### C.1 — Consent banner en layout web

- **Agente**: Worktree (clara competencia frontend)
- **Esfuerzo**: 1h
- **Entregable**: banner visible en primer visit, persiste decisión, hook `useConsent()` disponible

**Pasos**:
1. Copiar `templates/consent-banner.tsx` a `apps/web/components/consent-banner.tsx`
2. Mover `useConsent` hook a `apps/web/lib/consent.ts`
3. Montar en `apps/web/app/layout.tsx` antes de `{children}`
4. Gate PostHog init con `useConsent().hasConsent('analytics')`

**Verificación**:
- [ ] Fresh visit → banner aparece en bottom
- [ ] Click "Rechazar opcionales" → banner desaparece + cookie `pos-chile-consent` seteada con `analytics:false`
- [ ] Reload → banner NO vuelve a aparecer
- [ ] Click "Aceptar todas" desde banner → PostHog SDK inicializa (ver Network tab)

### C.2 — `ConsentSettingsPanel` en `/perfil`

- **Agente**: Worktree
- **Esfuerzo**: 45 min
- **Entregable**: sección en `/perfil` que permite revocar consentimientos post-hoc

Ver componente en `templates/consent-banner.tsx` (está al final del archivo).

### C.3 — Privacy policy link en superficies clave

- **Agente**: Worktree
- **Esfuerzo**: 30 min
- **Entregables**: links `<a href="/privacidad">` en:
  - Footer del `app/layout.tsx`
  - `app/login/page.tsx` (texto legal bajo el formulario)
  - `app/(dashboard)/clientes/crear-cliente-form.tsx` (al capturar RUT del cliente)
  - Mobile: tab "Más" — nueva sección "Privacidad"

**Verificación Cowork**: cada superficie auditada manualmente.

### C.4 — Mobile privacy tab

- **Agente**: Worktree
- **Esfuerzo**: 1.5h
- **Entregables**:
  - `apps/mobile/app/(tabs)/mas/privacidad.tsx` — pantalla dedicada
  - Toggles para Analytics + Error tracking + Push
  - Link a la política web en WebView o browser externo
  - Botón "Solicitar acceso a mis datos" → hit `/api/v1/me/data-export` y descarga JSON
  - Botón "Solicitar eliminación" → confirm modal → hit `/api/v1/me/erase`

---

## Fase D — Governance + legal (1-2 semanas, con Pierre)

**Objetivo**: artefactos de gobernanza que requieren input humano / legal.

### D.1 — RAT inicial

- **Agente**: Cowork redacta + Pierre aprueba
- **Esfuerzo**: 2h redacción + 1h revisión
- **Entregable**: `memory/projects/pos-chile-privacy-rat.md`

Usar plantilla del skill (`SKILL.md#registro-de-actividades-de-tratamiento-rat`). Mínimo 5 entries:
1. Registro de cajeros (empleados)
2. Registro de clientes retail
3. Historial de ventas
4. Telemetría de errores (Sentry)
5. Analytics de uso (PostHog)

### D.2 — Privacy Policy → abogado

- **Agente**: Pierre coordina, abogado Dysa ejecuta
- **Esfuerzo**: 3-5 días calendario (revisión externa)
- **Entregable**: `docs/privacy/privacidad-v1.0-aprobada.md` con firma digital del abogado

**Proceso**:
1. Pierre envía `docs/privacy/privacidad-v1.0-draft.md` + link a `.claude/skills/privacy-compliance/` al abogado.
2. Abogado edita → devuelve versión firmada.
3. CLI actualiza `apps/web/app/privacidad/page.tsx` con la versión aprobada.
4. Commit: `docs(privacy): privacy policy v1.0 aprobada por legal`.

### D.3 — Designación formal del DPO

- **Agente**: Pierre
- **Esfuerzo**: decisión + documentación
- **Entregable**: entry en `memory/projects/pos-chile-privacy-rat.md` con nombre + email + responsabilidades del DPO

### D.4 — Configurar Sentry con scrubber

- **Agente**: CLI
- **Esfuerzo**: 45 min
- **Entregable**: `apps/web/sentry.server.config.ts` + `apps/mobile/lib/telemetry.ts` con `beforeSend` que scrubb PII

Ver código completo en `subprocessors-dpa.md#sentry--el-más-expuesto-a-pii-accidental`.

### D.5 — Verificar DPAs con subprocesadores

- **Agente**: Pierre ejecuta, Cowork audita
- **Esfuerzo**: 2h × 5 proveedores = 10h total (distribuido en 1 semana)
- **Entregables**:
  - `docs/privacy/dpas/2026/vultr-dpa-signed.pdf` (Pierre descarga y firma)
  - Idem Sentry, PostHog, Upstash, Cloudflare
  - Tabla actualizada en `memory/projects/pos-chile-privacy-rat.md` con "✅ Vigente 2026" para cada uno

---

## Fase E — Store compliance (día de M7)

**Objetivo**: llenar App Privacy (iOS) + Data Safety (Android) con los declaraciones correctas. **Bloqueante del submit.**

### E.1 — App Privacy iOS

- **Agente**: Pierre ejecuta en App Store Connect, CLI provee values
- **Esfuerzo**: 30 min
- **Entregable**: App Privacy section completa en ASC

Usar campo-a-campo de `references/store-policies-apple-google.md#ios--app-store-connect--app-privacy`.

### E.2 — Data Safety Android

- **Agente**: Pierre en Play Console, CLI provee values
- **Esfuerzo**: 30 min

Usar `references/store-policies-apple-google.md#android--play-console--data-safety`.

### E.3 — Privacy Manifest iOS (`PrivacyInfo.xcprivacy`)

- **Agente**: CLI genera, EAS Build aplica
- **Esfuerzo**: 45 min
- **Entregable**: archivo XML committeado en `apps/mobile/ios/PrivacyInfo.xcprivacy`

Template en `store-policies-apple-google.md#ios--privacy-manifest-privacyinfoxcprivacy`.

### E.4 — Link policy en configuración stores

- **Agente**: Pierre
- Agregar `https://dy-pos.zgamersa.com/privacidad` en:
  - ASC → App Information → Privacy Policy URL
  - Play Console → Store settings → Privacy policy URL

---

## 🗓 Timeline sugerido

```
Semana 1 (2026-04-23 → 2026-04-29):
├── Día 1 (Jue 23): Fase A — CLI ejecuta A.1, A.2, A.3
├── Día 2 (Vie 24): Fase A termina + Fase B.1 (migration)
├── Día 3 (Sáb 25): Fase B (B.2, B.3, B.4, B.5) — CLI
├── Día 4 (Dom 26): Cowork verifica Fase A+B
├── Día 5 (Lun 27): Fase C arranca — Worktree (C.1, C.2)
├── Día 6 (Mar 28): Fase C termina — Worktree (C.3, C.4)
└── Día 7 (Mié 29): Cowork verifica Fase C

Semana 2 (2026-04-30 → 2026-05-06):
├── Día 8-9: Fase D.1 (RAT) + D.4 (Sentry scrubber) — CLI/Cowork
├── Día 10-12: Fase D.2 (abogado revisa policy) — PIERRE bloquea aquí
└── Día 13-14: Fase D.5 (DPAs verificados) — Pierre

Semana 3+ (2026-05-07 → M7):
├── Abogado retorna policy aprobada → actualizar /privacidad
├── Gemini: security audit de endpoints ARCOP+ + policy review
└── Cuando Pierre tenga cuentas Apple + Google → Fase E + M7 submit
```

---

## 🎯 Criterios de éxito (Definition of Done)

El rollout está completo cuando:

- [ ] `https://dy-pos.zgamersa.com/privacidad` responde 200 con política firmada por abogado
- [ ] `pii_scanner.py` sobre main → 0 findings critical, 0 high sin justificación
- [ ] `privacy_policy_validator.py https://dy-pos.zgamersa.com/privacidad --strict` → score ≥ 95
- [ ] Endpoints `/api/v1/me/data-export`, `/erase`, `/consent` operativos en prod con 0 errores en 7 días
- [ ] Consent banner visible para nuevos visitantes, no para returning con decisión
- [ ] `memory/projects/pos-chile-privacy-rat.md` con 5+ entries aprobadas por Pierre
- [ ] 5 DPAs con status "Vigente" en la tabla de subprocesadores
- [ ] Sentry en prod con `beforeSend` scrubber activo (verificar con evento de test)
- [ ] App Privacy (iOS) + Data Safety (Android) completos en ASC + Play Console
- [ ] Drill DSAR: Pierre o Cowork simula una solicitud real → respuesta en < 10 min (no < 10 días, porque es un drill automatizado)
- [ ] Drill breach: Pierre ejecuta mentalmente el playbook → 0 pasos confusos en el hora 0-6

---

## 🛡 Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Abogado tarda > 1 semana en revisar policy | Alta | M7 atrasado | Tener backup de 2-3 abogados; enviar draft ya con score 90+ para minimizar cambios |
| Worktree introduce regresiones en consent banner | Media | UX rota | Cowork verifica cada commit antes de merge |
| Migration `AuditLog` choca con worktree de Worktree | Media | Schema conflict | CLI avisa en Slack/channel antes de correr migrate; Worktree rebaseado post-merge |
| Pierre no encuentra Apple Dev Program a tiempo | Media | E bloqueado | Empezar A-D sin depender de E; Pierre compra cuenta en paralelo |
| PII_LOG_SALT se leakea en commit | Baja | Alto (salt comprometido → hashes revertibles por ataque de diccionario) | `.env.docker` en `.gitignore`, pre-commit hook detecta secrets |

---

## 📞 Handoff entre agentes

Cada fase termina con un handoff explícito:

**Cuando CLI termina Fase B** → abre PR/rama con todos los endpoints + `Cowork` toma el PR y verifica con la checklist de `data-subject-rights.md#checklist-de-revisión-antes-de-merge-a-main`.

**Cuando Worktree termina Fase C** → `Cowork` ejecuta smoke test:
```bash
curl -I https://dy-pos.zgamersa.com/privacidad  # 200
# Fresh browser → banner aparece
# Rechazo → Posthog NO se carga
```

**Cuando Pierre termina Fase D.2** → `CLI` actualiza la página `/privacidad` con la versión aprobada y bumpea versión a 1.0-final.

**Cuando Gemini termina su audit** → retorna reporte `docs/privacy/gemini-audit-2026-05-XX.md` con findings clasificados por severidad. `Cowork` traduce findings a PRs para `CLI` / `Worktree`.

---

## 📎 Referencias al skill

Todo el contenido técnico detallado vive en:

- **Skill root**: `.claude/skills/privacy-compliance/SKILL.md`
- **Marco legal**: `references/chile-ley-19628-21719.md`
- **Implementación técnica ARCOP+**: `references/data-subject-rights.md`
- **Consent patterns**: `references/consent-management.md`
- **Tabla DPAs**: `references/subprocessors-dpa.md`
- **Runbook breach**: `references/breach-response-playbook.md`
- **Apple/Google forms**: `references/store-policies-apple-google.md`
- **Privacy policy guía**: `references/privacy-policy-template-cl.md`
- **Template policy**: `templates/privacy-policy.es-CL.md`
- **Template banner**: `templates/consent-banner.tsx`
- **Template emails DSAR**: `templates/dsar-response-email.md`
- **Scripts ejecutables**: `scripts/{pii_scanner,privacy_policy_validator,dsar_exporter}.py`

---

## ✅ Quién aprueba qué

| Item | Quién aprueba | Criterio |
|---|---|---|
| Código técnico (endpoints, migrations) | Cowork | Typecheck + tests + smoke manual |
| Contenido de la Privacy Policy | **Abogado Dysa** | Revisión legal formal |
| Decisiones de negocio (retention, DPO) | Pierre/CEO | Criterio comercial |
| DPAs firmados | Pierre | Firma digital vigente |
| Submit a stores (M7) | Pierre + Cowork | Fase E completa |
| Deploy a prod | **CEO manual** | Regla prod-intocable M1-M6 vigente hasta M7 |

---

**Última actualización**: 2026-04-23
**Responsable del documento**: Claude Cowork
**Próxima revisión**: cada milestone de fase completado
