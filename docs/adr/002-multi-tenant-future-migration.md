# ADR-002: Plan de Migración Multi-Tenant (Futuro)

**Estado**: 📋 Planeación — no ejecutar hasta que se cumpla el trigger
**Fecha**: 2026-04-29
**Decidido por**: `Pierre Benites Solier` (CEO/Owner)
**Asesor técnico**: Cowork

## Contexto

[ADR-001](./001-arquitectura-saas-deployment-dedicado.md) eligió deployment
dedicado por cliente para el corto plazo (0-20 clientes). Cuando el negocio
crezca, la operación de N VPSs separados se vuelve más cara que migrar a un
modelo multi-tenant compartido. Este ADR documenta el plan de esa migración
para que esté listo cuando se cumpla el trigger.

## Trigger explícito

Migrar SOLO cuando se cumplan **TODAS** estas condiciones:

1. ✅ **20+ clientes activos pagantes** (no demos).
2. ✅ **Costo operacional VPSs > $250/mes** (umbral aproximado donde el
   ROI de la migración se vuelve positivo).
3. ✅ **F-8 SII estable y deployado** en al menos 5 clientes (para no
   migrar simultáneamente arquitectura + integración SII).
4. ✅ **Coverage de tests web >70%** (para detectar regresiones de query
   con `tenantId`).
5. ✅ **CEO confirma decisión** post-revisión P&L.

Si CUALQUIERA de estas condiciones falta, NO migrar. Continuar con
deployment dedicado.

## Decisión del modelo destino

Adoptar **Camino A: Multi-tenant compartido (column-based isolation)**
cuando se cumpla el trigger.

### Cómo funcionará

1. **Una BD compartida** con todos los clientes.
2. **Cada modelo del schema agrega `tenantId Int`** (NOT NULL en producción).
3. **Prisma middleware global** intercepta TODAS las queries y agrega
   automáticamente `where: { tenantId }` basado en el contexto del request.
4. **Subdominios** mapean a tenantId: `ferreteriaelclavo.dypos.zgamersa.com` →
   middleware resuelve `tenantId = 17`.
5. **Backups por tenant** con `pg_dump --where="tenant_id = 17"` (o tablas
   particionadas por `tenantId` para mayor performance).

### Por qué A y no B (database-per-tenant)

- **Operación más simple**: 1 BD para mantener vs N BDs.
- **Backups más eficientes** con particionamiento.
- **Updates de schema más rápidos** (1 migration, no N).
- **El aislamiento de B se justifica solo si compliance lo exige**, lo cual
  no es el caso típico SMB chileno (Ley 21.719 acepta lógica de aislamiento
  bien implementada).

## Plan de migración (cuando se ejecute)

Estimación: **6-8 semanas calendario**, 4 fases sin downtime.

### Fase 1: Preparación schema (2 semanas)

1. **Migration `tenantId Int @default(1)`** en los 14 modelos relevantes:
   - `Usuario`, `Categoria`, `Producto`, `Cliente`, `Venta`, `DetalleVenta`,
     `Devolucion`, `DevolucionItem`, `Caja`, `AperturaCaja`, `MovimientoCaja`,
     `PagoVenta`, `AuditLog`, `MobileRelease`.
   - `default(1)` durante la migración para que datos existentes (single
     tenant actual) sigan funcionando.

2. **Reescritura de uniques compuestos**:
   - `Categoria.nombre @unique` → `@@unique([tenantId, nombre])`
   - `Producto.codigoBarras @unique` → `@@unique([tenantId, codigoBarras])`
   - `Cliente.rut @unique` → `@@unique([tenantId, rut])`
   - `Venta.numeroBoleta @unique` → `@@unique([tenantId, numeroBoleta])`
   - `Usuario.email @unique` → `@@unique([tenantId, email])`

3. **Tabla nueva `Tenant`**:
   ```prisma
   model Tenant {
     id            Int      @id @default(autoincrement())
     slug          String   @unique  // "ferreteria-el-clavo"
     razonSocial   String
     rut           String   @unique
     email         String
     domain        String?  @unique  // null si usa subdominio default
     activo        Boolean  @default(true)
     createdAt     DateTime @default(now())
     // ...
   }
   ```

4. **Index secundario `(tenantId, X)` en cada tabla** para queries rápidas.

### Fase 2: Prisma middleware + auth (2 semanas)

1. **Resolver de tenant por subdominio** en `middleware.ts`:
   ```typescript
   const tenant = await prisma.tenant.findUnique({
     where: { slug: subdomain }
   });
   if (!tenant) return notFound();
   request.headers.set("x-tenant-id", String(tenant.id));
   ```

2. **Prisma middleware global** que inyecta `tenantId` automático:
   ```typescript
   prisma.$use(async (params, next) => {
     const tenantId = getCurrentTenantId(); // AsyncLocalStorage
     if (params.action === "findMany" || params.action === "findFirst") {
       params.args.where = { ...params.args.where, tenantId };
     }
     // ... etc
     return next(params);
   });
   ```

3. **JWT claims actualizados** para incluir `tenantId` validado server-side.

### Fase 3: Migración de datos clientes existentes (1-2 semanas)

Cada cliente actualmente con deployment dedicado se migra a la BD central:

1. **Crear `Tenant` row** con sus datos actuales.
2. **`pg_dump` su BD actual** + restore en BD central con `tenantId =
   <nuevo_id>` aplicado a cada INSERT.
3. **DNS swap** del subdominio del cliente al nuevo deployment central.
4. **Validación 48h** antes de apagar VPS dedicado.

### Fase 4: Testing exhaustivo + cleanup (1 semana)

1. **Tests E2E con 3 tenants** corriendo en paralelo, asserciones
   cross-tenant que validan ZERO leak.
2. **Performance benchmarks** vs baseline single-tenant.
3. **Sentry/observability** con `tag: tenantId` en todos los eventos.
4. **Decommission VPSs viejos** después de 30d sin issues.

## Criterios de éxito post-migración

- [ ] Cero data leak detectado en 30 días (auditoría con queries
  cross-tenant negative tests).
- [ ] Performance p95 <200ms igual o mejor que deployment dedicado.
- [ ] Costo operacional reducido en al menos 50%.
- [ ] Self-service signup funcional (cliente crea cuenta y empieza a usar
  sin intervención humana).

## Riesgos identificados

- **Bug en middleware Prisma** = leak entre tenants → catastrófico.
  Mitigación: tests dedicados + Sentry alerts en queries sin tenantId.
- **Hot tenant ahoga al resto**: cliente con 1M ventas saturando recursos.
  Mitigación: monitoring por tenant + rate limits per-tenant.
- **Migración interrumpida** deja estado mixto.
  Mitigación: rollback plan preparado en Fase 3, snapshots BD pre-migración.

## Estado del documento

🟡 **Plan listo, no ejecutar todavía**. Re-evaluar cada 6 meses para validar
si el trigger se cumplió. Actualizar este ADR si las condiciones del trigger
cambian.
