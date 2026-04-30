# Testing y CI

> **Web:** Vitest. **Mobile:** Jest + jest-expo. **CI:** GitHub Actions.
> **Workflow file:** `.github/workflows/ci.yml`.

## 1. Estrategia de tests

| Capa | Framework | Tipo dominante |
|------|-----------|----------------|
| `apps/web` | Vitest | Unit + integration de Server Actions con `prismaMock` |
| `apps/mobile` | Jest + jest-expo | Unit de stores, helpers, componentes (RN-specific) |
| Mobile e2e | (carpeta `e2e/`) | Pendiente — `DECISION_REQUIRED` (Detox vs Maestro) |
| Web e2e | — | No formal hoy; smoke prod manual con Claude_in_Chrome MCP |
| Audit cruzado | Codex | Verificación independiente sobre PRs y commits críticos |

## 2. Web — Vitest

Setup en `apps/web/test/setup.ts`:

- `vi.mock("@repo/db")` con factory que usa `vi.importActual` para mantener
  los enums reales (Prisma) pero mockea métodos del cliente.
- `prismaMock` exportado para que cada test configure `mockResolvedValue`.
- `mockSession({ id, rol })` para Server Actions con `await auth()`.
- `resetMocks()` en `beforeEach`.

Tests de Server Actions críticas:

```
apps/web/app/(dashboard)/ventas/__tests__/
├── editarVenta.test.ts       # 8 tests — invariante total === sum(pagos)
├── eliminarVenta.test.ts     # 7 tests — soft-delete + AuditLog + revert stock
└── restaurarVenta.test.ts    # 8 tests — RESTORE + admin gate

apps/web/app/(dashboard)/devoluciones/__tests__/
└── crearDevolucion.test.ts   # 10 tests — parcial / total / ratio
```

### Pattern test

```ts
beforeEach(() => {
  resetMocks();
  mockSession({ id: "1", rol: "ADMIN" });
  prismaMock.venta.findFirst.mockResolvedValue(ventaFixture as never);
  prismaMock.$transaction.mockImplementation(async (cb: any) => cb(prismaMock));
});

test("happy path", async () => {
  const result = await crearVenta(input);
  expect(result.ok).toBe(true);
  expect(prismaMock.venta.create).toHaveBeenCalledWith(...);
});
```

### Cómo correr

```bash
pnpm --filter web test                 # one-shot
pnpm --filter web test:watch           # interactive
pnpm --filter web test -- editarVenta  # filtrado
```

## 3. Mobile — Jest

Setup en `apps/mobile/jest.setup.js` con preset `jest-expo`. Mocks comunes:
`expo-secure-store`, `expo-sqlite`, NetInfo, AsyncStorage.

Suites grandes con muchos mocks pueden OOM-ear runners CI 4GB → flag
`NODE_OPTIONS=--max-old-space-size=4096` en CI.

```bash
pnpm --filter @repo/mobile test
pnpm --filter @repo/mobile test:ci
```

## 4. CI — GitHub Actions

`.github/workflows/ci.yml` gate de merge. Triggers actuales:

```yaml
on:
  pull_request:
    branches: [main]
  push:
    branches: [main, "feature/**", "fix/**"]
  workflow_call:        # reutilizable desde deploy-prod.yml
  workflow_dispatch:    # re-run manual desde UI
```

Concurrencia: cancela run anterior si llega push nuevo a la misma branch.

### Jobs

Dos jobs en paralelo (sin `needs:`):

**Job `web`** (timeout 15 min):

1. Checkout (action pinned por SHA).
2. Setup pnpm 10.6.0.
3. Setup Node 22 con cache pnpm.
4. `pnpm install --frozen-lockfile`.
5. `pnpm --filter @repo/db run db:generate` (Prisma client).
6. Type-check.
7. Lint.
8. Test — con env vars mock:
   - `PII_LOG_SALT=ci-deterministic-salt-not-for-prod`
   - `POS_DATABASE_URL=postgresql://ci-mock:ci-mock@localhost:5432/ci_mock_db`
   - `DATABASE_URL=` igual (gemini compat)
   - `NEXTAUTH_SECRET`, `NEXTAUTH_URL` mock.
9. Build — con `SENTRY_DSN=""` y mismas env vars mock.

**Job `mobile`** (timeout 15 min):

1. Checkout + pnpm + Node 22.
2. Install + Prisma generate (`@repo/api-client` re-exporta tipos de `@repo/db`).
3. Type-check (`tsc --noEmit`).
4. Lint (`expo lint`).
5. Test (`jest --ci --coverage --maxWorkers=2`) con `NODE_OPTIONS=--max-old-space-size=4096`.

### Por qué env vars mock en CI

`packages/db/src/client.ts` valida `POS_DATABASE_URL` al cargar el módulo.
Aunque tests usan `vi.mock("@repo/db")`, el factory de mock usa `vi.importActual`
para preservar los enums reales — eso ejecuta el módulo y dispara la validación.
Mock URL es OK porque el cliente Prisma real nunca conecta (todas las llamadas
pasan por el mock).

Esto fue closure del gotcha **G-M54**.

### Branch protection

`main` debe tener (Pierre administra en GitHub UI):

- [ ] Require pull request reviews (1).
- [ ] Require status checks: `web`, `mobile`.
- [ ] Require branches up to date.
- [ ] No force push.
- [ ] Linear history (recomendado).

Estado actual: **`DECISION_REQUIRED`** — verificar/configurar en GitHub.

## 5. Cobertura

- Web: focus en Server Actions críticas (ventas, devoluciones, caja).
  Componentes UI puros sin tests por costo/beneficio.
- Mobile: focus en stores (auth, sync, cart) y helpers (precio, version-check).
- No hay umbral de cobertura % aún (`DECISION_REQUIRED`).

## 6. Smoke prod (post-deploy)

Browser-based, no automatizado. Checklist en `deploy-ops.md §7`. Ejecutado con
Claude_in_Chrome MCP por agentes o manualmente por Pierre.

Plan futuro: automatizar smoke con un script playwright contra prod tras cada
`deploy.sh`. `DECISION_REQUIRED`.

## 7. Tests E2E mobile

Carpeta `e2e/` existe pero sin runner formal. Opciones:

- **Detox** — más maduro, requiere build nativo, costoso.
- **Maestro** — YAML, rápido de escribir, menos profundo.
- **Status:** `DECISION_REQUIRED`.

## 8. Tareas Pierre vs agentes (testing-ci)

| Tarea | Quién |
|-------|-------|
| Configurar branch protection en GitHub | **Pierre** |
| Aprobar PRs en `main` | **Pierre** o reviewer humano |
| Escribir tests | Agentes |
| Mantener `ci.yml` | Agentes con ADR si rompe gate |
| Decidir umbral de cobertura | **Pierre** |

## 9. Gotchas activos (testing-ci)

| ID | Gotcha |
|----|--------|
| G-M54 | CI requiere env vars mock por `vi.importActual` en setup. |
| ✦ | `actions/checkout`, `pnpm/action-setup`, `setup-node` pinned por SHA — Dependabot bumps. |
| ✦ | Mobile test:ci necesita `NODE_OPTIONS=--max-old-space-size=4096` para no OOM. |
