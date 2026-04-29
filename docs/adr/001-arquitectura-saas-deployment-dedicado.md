# ADR-001: Arquitectura SaaS — Deployment Dedicado por Cliente

**Estado**: ✅ Aceptada
**Fecha**: 2026-04-29
**Decidido por**: `[OWNER_NAME]` (CEO/Owner)
**Asesor técnico**: Cowork (verificador independiente)

## Contexto

El proyecto pivotó de "POS single-tenant para uso propio" a **"POS-as-a-Service
con licencias vendibles"**. El owner quiere ofrecer el sistema a múltiples
comerciantes SMB chilenos, cada uno con:

- Sus propios usuarios y configuración de empresa.
- Su propia base de datos (sin mezcla con otros clientes).
- Posiblemente su propio dominio o subdominio.
- Capacidad de personalizar el branding mobile (APK con su nombre).
- Aislamiento total de bugs (un cliente no afecta a otro).
- Compliance Ley 21.719 SII (data retention 6 años, derecho ARCOP+).

## Decisión

Adoptar **arquitectura SaaS de deployment dedicado por cliente** ("Camino C"
en la terminología de la sesión de planeación).

### Cómo funciona

Cada cliente que adquiere licencia recibe:

1. **Una instalación Docker Compose dedicada** con su propia instancia de:
   - `pos-web` (Next.js standalone)
   - `pos-postgres` (su BD aislada)
   - `pos-pgadmin` (admin DB para soporte)

2. **Su propio dominio o subdominio**:
   - Subdominio default: `<cliente-slug>.[BRAND_DOMAIN]`
   - O dominio propio (cliente provisiona DNS, nosotros configuramos SSL).

3. **APK mobile con branding del cliente**:
   - Build automatizado a partir de su slug + assets.
   - Distribución via su propio endpoint `/api/mobile/manifest`.

4. **Backup/restore independiente** por cliente.

### Provisionamiento

Script `scripts/provision-tenant.sh` (a crear en el Bloque 4 de la sesión
actual) que automatiza:

```bash
scripts/provision-tenant.sh \
  --slug "ferreteria-el-clavo" \
  --razon-social "Ferretería El Clavo SpA" \
  --rut "76.123.456-7" \
  --admin-email "dueño@ferreteriaelclavo.cl" \
  --domain-mode "subdomain"  # o "custom"
```

Genera:
- Carpeta cliente en `~/Dysa-Tenants/<slug>/` con docker-compose.yml +
  .env.docker pre-poblado.
- Inicialización Postgres con seed inicial (admin user, IVA 19% Chile,
  monedas CLP).
- DNS subdominio (manual o via API Cloudflare si está configurado).
- APK mobile build con branding (referenciando su `apkUrl` del manifest).

## Alternativas consideradas

### Camino A: Multi-tenant compartido (column tenantId)

**Cómo**: una sola BD, todos los clientes en mismas tablas con `tenantId`
column. Cada query incluye `WHERE tenantId = ?` (vía Prisma middleware).

**Por qué se rechazó hoy**:

- 14 modelos del schema actual no tienen `tenantId` — migrar requiere
  reescribir todos los uniques (`Categoria.nombre` → `(tenantId, nombre)`,
  `Cliente.rut` → `(tenantId, rut)`, etc.).
- Riesgo catastrófico: una sola query mal escrita (sin `WHERE tenantId`)
  filtra datos entre clientes → lawsuit Ley 21.719 (Art. 11 deber de
  reserva, multas hasta 10 UTA por infracción).
- Complejidad de testing: cada test debe verificar que no hay leak.
- ROI negativo a 0-3 clientes.

**Cuándo migrar a este camino**: cuando >20 clientes pagantes hagan que
operar 20+ VPSs separados sea más caro que la migración (ver ADR-002).

### Camino B: Multi-tenant aislado (database-per-tenant)

**Cómo**: una instancia de la app, múltiples bases de datos. Conexión
Prisma se elige dinámicamente según el subdominio del request.

**Por qué se rechazó hoy**:

- Requiere connection pooler tipo PgBouncer + lógica custom en cada
  request handler.
- El runtime de Next.js no facilita Prisma client por-request sin
  performance hit.
- Complejidad operacional alta para 0-3 clientes.
- Beneficios marginales sobre Camino C cuando los recursos se justifican.

**Cuándo migrar a este camino**: ruta intermedia entre C y A si
queremos centralizar deploy pero mantener aislamiento de datos.

## Consecuencias

### Positivas

- **Aislamiento físico de datos**: imposible leak entre clientes.
- **Compliance simple**: cada BD es su propio "controller de datos" Ley 21.719.
- **Personalización profunda posible**: features on/off, branding, schema
  ajustado por cliente.
- **Recovery por cliente**: si cliente A corrompe su BD, no afecta a otros.
- **Migración entre hosts trivial**: `pg_dump | gzip > backup.sql.gz` +
  Docker Compose en nuevo VPS.
- **Cliente puede irse con sus datos**: entregable claro.

### Negativas

- **Costo operacional crece linealmente**: cada cliente nuevo = nuevo VPS
  Vultr ($6-12/mes). A 20 clientes son $120-240/mes solo en VPSs.
- **Updates manuales**: nueva versión del producto = N deployments
  separados. Mitigación: script de update masivo + canary releases.
- **Monitoring fragmentado**: 20 stacks Sentry separados (uno por cliente)
  vs 1 stack con tag tenantId. Mitigación: shared Sentry org con
  `release` tag por cliente.
- **No es "self-service"**: comerciante no puede registrarse y empezar
  solo. Requiere intervención del owner para provisionar. Mitigación:
  el script de provisión + un eventual portal de admin reducen el tiempo
  a <30 min por cliente nuevo.

### Riesgos a monitorear

- **Drift entre clientes**: si 5 clientes están en versiones distintas del
  schema, soporte se complica. Mitigación: política "todos en el mismo
  major" + script update masivo en deploy.
- **Costo cuando crezcamos a 20+**: trigger explícito para migrar a
  Camino A/B documentado en ADR-002.

## Plan de migración futura (si crece a 20+ clientes)

Ver [ADR-002: Multi-tenant Future Migration](./002-multi-tenant-future-migration.md).

## Referencias

- Visión del proyecto: [docs/VISION.md](../VISION.md)
- Audit profesional Claude Code CLI 2026-04-25 (sección CCC sobre multi-tenant
  readiness 0/10).
- Sesión de planeación SaaS 2026-04-29 (chat con Cowork).
