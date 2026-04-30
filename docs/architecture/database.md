# Base de datos — Prisma 6 + PostgreSQL 16

> **Schema:** `packages/db/prisma/schema.prisma`
> **Cliente:** `packages/db/src/client.ts` (export `prisma`)
> **Engine:** PostgreSQL 16-alpine (Docker)
> **Modelos vigentes:** 17 (más enums) — algunos con soft-delete + AuditLog

## 1. Modelos

```
Usuario           AperturaCaja         AuditLog
Account           MovimientoCaja       Devolucion
Session           PagoVenta            DevolucionItem
VerificationToken DetalleVenta         MobileRelease
Categoria         Venta
Producto          Caja
Cliente
```

Convenciones Chile-específicas:

- `precio Int` — CLP sin decimales. NUNCA `Float` ni `Decimal`.
- `rut String` — `"12.345.678-9"` normalizado (dot + dash). `validarRUT()` para validación.
- `boletaNumero String` — `B-YYYYMMDD-XXXXXXXX` (nanoid 8 chars).
- IVA = 19% fijo (computado en `lib/utils.ts`, no almacenado).
- Timezone: `America/Santiago` en Postgres y app.

### Counters denormalizados

- `Producto.ventas Int @default(0)` — incrementa con cada DetalleVenta creado.
- `Cliente.compras Int @default(0)` — total ventas asociadas (no soft-deleted).
- `Cliente.ultimaCompra DateTime?` — recalcular (NO asumir) al eliminar venta.

## 2. Soft-delete + AuditLog

Modelos críticos con `deletedAt DateTime?`:

- `Venta`, `Producto`, `Cliente`, `Devolucion`.

Filtros por defecto en queries: `where: { deletedAt: null }`.

`AuditLog` (modelo dedicado) registra:

```
id          Int       @id @default(autoincrement())
usuarioId   Int
accion      String    // "VENTA_DELETE", "VENTA_RESTORE", "DEVOLUCION_CREATE", ...
entidad     String    // "Venta" | "Producto" | ...
entidadId   Int
detalles    Json      // payload con before/after
createdAt   DateTime  @default(now())
```

Reglas:

- Cualquier eliminar/restaurar/editar destructivo escribe en AuditLog **dentro
  de la misma transacción** que la mutación.
- El historial es inmutable — no se borra ni edita.
- Admins pueden listar AuditLog desde UI; cajeros no.

## 3. Migrations

Ubicación: `packages/db/prisma/migrations/`. Estado actual:

```
20260426000000_f3_soft_delete_audit_log         # Fase 3 — soft-delete + AuditLog
20260426010000_f9_caja_split_tender             # Fase 9 — split tender (PagoVenta[])
20260428000000_sch3_partial_unique              # Schema 3 — partial unique indexes
20260428010000_sch2_check_constraints           # Schema 2 — CHECK constraints
20260428020000_f3_extension_softdelete          # Fase 3 ext — extender soft-delete
20260428030000_sch1_int4_guardrail              # Schema 1 — guardrail Int4 overflow
```

Reglas:

- Una migration = un cambio coherente. Nombrar `<faseOrTag>_<scope>`.
- En CI: `prisma migrate deploy` (NO `migrate dev`).
- En local: `pnpm --filter @repo/db prisma migrate dev`.
- En prod: `deploy.sh` corre backup → `migrate deploy` → start app.
- Cualquier breaking change requiere ADR en `docs/adr/`.

### Backup pre-deploy (G-M53 closed)

`scripts/deploy.sh` hace `pg_dump` automático antes de aplicar migrations:

```
/var/backups/dypos-cl-db/pre-deploy-YYYYMMDD-HHMMSS.sql.gz
```

Permisos `chmod 600`, rotación a 14 dumps.

## 4. Índices y constraints

### Partial unique indexes

Ej.: `@@unique([numeroBoleta], where: deletedAt IS NULL)` — permite "reciclar"
un número si la venta original quedó soft-deleted.

### CHECK constraints

Ej.: `monto > 0` en `PagoVenta`, `cantidad > 0` en `DetalleVenta`.

### Int4 guardrails

Migration `sch1_int4_guardrail` agrega CHECKs para evitar overflow en `precio`,
`subtotal`, `total` en escenarios de venta abultada (top de Int4 = ~2.1M CLP × N).

## 5. Cliente Prisma

```ts
// packages/db/src/client.ts
const url = process.env.POS_DATABASE_URL;
if (!url) throw new Error("POS_DATABASE_URL no definida");

export const prisma = globalThis.__prisma ?? new PrismaClient({ datasourceUrl: url });
```

- `POS_DATABASE_URL` — separado de `DATABASE_URL` porque Pierre tiene Supabase
  en su shell global (gotcha 8).
- Singleton en dev (HMR) usando `globalThis.__prisma`.
- Logs: `query` solo en dev; en prod sólo `error` + `warn`.

## 6. Connection pooling

PostgreSQL local-VPS: max_connections default (100). El web container con
Prisma + PgBouncer no instalado; pooling lo maneja el cliente Prisma.
Workload SMB (1-3 cajas concurrentes) cómodo bajo este modelo.

Si en futuro un tenant escala >50 cajas → evaluar PgBouncer
(`DECISION_REQUIRED` en `decision-log.md`).

## 7. Pgadmin

Container `pos-pgadmin` (puerto 5050) está disponible para Pierre admin.
Pin a `dpage/pgadmin4:8.14` para evitar drift breaking de `:latest`.

## 8. Tests sobre BD

- Web tests usan `prismaMock` (`vi.mock("@repo/db")`) — no tocan PG real.
- E2E mobile / smoke prod usan PG real del VPS.
- Migrations testeadas implícitamente al correr `migrate deploy` en deploy.sh
  contra prod cada release.

## 9. Tareas Pierre vs agentes (DB)

| Tarea | Quién |
|-------|-------|
| Diseñar nuevos modelos / migrations | Agentes (con ADR) |
| Aplicar migration en prod | `deploy.sh` (automático) |
| Tomar/restaurar backup manual | **Pierre** vía SSH al VPS |
| Rotar password de Postgres | **Pierre** (`.env.docker`) |
| Acceder a pgadmin remoto | **Pierre** |

## 10. Gotchas activos (DB)

| # | Gotcha |
|---|--------|
| 8 | `POS_DATABASE_URL` (no `DATABASE_URL`) en PrismaClient. |
| 10 | `client.ts` valida URL al cargar — falla rápida en mal config. |
| G-M53 | Backup BD pre-deploy auto — closed por Fase 0.3. |
| G-M54 | CI con `vi.mock("@repo/db")` requiere env vars mock por `importActual`. |
