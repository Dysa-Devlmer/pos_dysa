# ADR-003 — RBAC profesional: 8 roles + permisos granulares

> **Estado:** PROPUESTO (esqueleto). No implementar hasta que Pierre apruebe la
> tabla rol × permiso completa.
> **Fecha:** 2026-05-04
> **Disparador:** Patch RBAC Fase 3D.4 cerró la brecha inmediata
> (productos/categorías/devoluciones admin-only) pero el modelo binario
> ADMIN/CAJERO/VENDEDOR actual no representa la realidad operativa de un
> comercio. Esta ADR documenta el modelo profesional para Fase 3D.5.

---

## Contexto

El POS hoy tiene 3 roles binarios en `prisma.Rol`:

```prisma
enum Rol {
  ADMIN
  CAJERO
  VENDEDOR
}
```

VENDEDOR ya está en producción (form de usuarios + badge UI + comentario en
`ventas/eliminadas/page.tsx` que dice "CAJERO/VENDEDOR no debe acceder").
**No se puede eliminar sin plan de migración.**

El patch 3D.4 protegió las acciones críticas con `requireAdmin()` (rol fijo
=== "ADMIN"). Eso resuelve el agujero pero **no escala** a un comercio real:

- No distingue OWNER del resto de ADMIN (cualquier ADMIN puede borrar al OWNER).
- No tiene MANAGER (jefe de turno) que apruebe descuentos o devoluciones sin
  necesitar ADMIN.
- No tiene ACCOUNTANT read-only para contadores externos.
- No tiene STOCK para bodegueros.
- No tiene SUPPORT temporal para Dyon Labs.
- Cualquier override individual ("este cajero sí puede devolver") obligaría a
  promoverlo a ADMIN, que es desproporcionado.

## Decisión

Adoptar un modelo de **8 roles + permisos granulares con overrides**, descrito
abajo. Los 7 nuevos roles se agregan al enum existente; VENDEDOR se conserva
con su semántica actual (staff de piso que vende sin cobrar caja propia).

### Roles propuestos

| Rol | Descripción | Único por tenant? |
|---|---|---|
| **OWNER** | Dueño legal del negocio. Único responsable final. No puede ser eliminado por nadie excepto él mismo (transferencia explícita). | Sí (1 por tenant) |
| **ADMIN** | Socios, gerencia general. Configura todo el sistema operativo. No toca al OWNER. | No |
| **MANAGER** | Jefe de turno / supervisor. Aprueba devoluciones, descuentos especiales, ajustes de stock con motivo. | No |
| **CAJERO** | Operario de caja. Vende y opera el POS. Descuentos limitados. Sin acceso a catálogo. | No |
| **VENDEDOR** | Staff de piso. Vende sin cobrar caja propia (típico retail boutique). Roles secundarios: registro de clientes, asesoramiento. | No |
| **ACCOUNTANT** | Contador externo / auditor. **Solo lectura** financiera. Cero capacidad de modificación. | No |
| **STOCK** | Bodeguero. Recibe mercadería, ajusta stock con motivo. No vende ni ve reportes financieros. | No |
| **SUPPORT** | Técnico Dyon Labs. **Opt-in con expiración**: el OWNER lo activa por incidente, expira en 7 días. Lectura amplia + AuditLog. | Plataforma |

### Permisos (mínimo viable ~30)

```
CATALOGO_VER / CATALOGO_EDITAR / CATALOGO_IMPORTAR_CSV
CATEGORIAS_GESTIONAR
VENTAS_CREAR / VENTAS_VER_PROPIAS / VENTAS_VER_TODAS / VENTAS_EDITAR / VENTAS_ELIMINAR
VENTAS_DESCUENTO_HASTA_5 / VENTAS_DESCUENTO_HASTA_20 / VENTAS_DESCUENTO_ILIMITADO
DEVOLUCIONES_CREAR / DEVOLUCIONES_APROBAR / DEVOLUCIONES_ANULAR
CAJA_ABRIR_PROPIA / CAJA_VER_TODAS / CAJA_REABRIR / CAJA_AJUSTAR_DIFERENCIAS
STOCK_VER / STOCK_AJUSTAR / STOCK_RECIBIR_MERCADERIA
CLIENTES_VER / CLIENTES_CREAR / CLIENTES_EDITAR / CLIENTES_ELIMINAR
USUARIOS_GESTIONAR / USUARIOS_PROMOVER_ADMIN / USUARIOS_RESET_PASSWORD
REPORTES_VENTAS_VER / REPORTES_FINANCIEROS_VER / REPORTES_EXPORTAR
SISTEMA_AUDITLOG_VER / SISTEMA_CONFIGURAR / SISTEMA_BACKUP_RESTAURAR
MOBILE_APK_DESCARGAR / MOBILE_APK_PUBLICAR
```

### Mapping default rol → permisos

> **Pendiente confirmar tabla completa con Pierre.** Esqueleto inicial:

(Tabla detallada va acá. Ver propuesta inicial en chat 2026-05-04.)

### Overrides individuales

```prisma
model UsuarioPermisoOverride {
  id        Int       @id @default(autoincrement())
  usuarioId Int
  permiso   Permiso
  granted   Boolean   // true = sumar al set base, false = quitar
  motivo    String?
  expiresAt DateTime?
  createdBy Int
  createdAt DateTime  @default(now())
  // ...
  @@unique([usuarioId, permiso])
}
```

Permite políticas como "Juan (CAJERO) tiene `DEVOLUCIONES_CREAR` por 30 días"
sin promoverlo a otro rol.

### Helper único `requirePermission`

Reemplaza todos los `requireSession` y `requireAdmin` actuales:

```ts
async function requirePermission(p: Permiso): Promise<Session>
```

- Calcula permisos efectivos = (defaults del rol del usuario) ∪ (overrides
  granted, no expirados) − (overrides revoked, no expirados).
- Lanza `PermissionDeniedError` con código + permiso + rol evaluado.
- Cada throw queda en AuditLog automáticamente con el contexto.

### Migration plan

1. Migration Prisma: extender enum `Rol` + crear enum `Permiso` + tabla
   `UsuarioPermisoOverride`.
2. Backfill data: existing ADMIN → 1 promoted a OWNER (el primer ADMIN del
   tenant ordenado por `createdAt`), resto sigue ADMIN. CAJERO y VENDEDOR
   se mantienen.
3. Helper `requirePermission()` + tipos generados.
4. Reemplazo gradual `requireAdmin` → `requirePermission(p)` en todas las
   acciones (Server Actions + API REST). El patch 3D.4 dejó esto centralizado
   en helpers locales por archivo, así que el reemplazo es mecánico.
5. Sidebar usa `useCurrentUser().hasPermission(p)` en lugar de `adminOnly`.
6. Mobile: la API valida permiso por endpoint; el flujo de devolución del
   cajero móvil vuelve a funcionar **si** el cajero tiene el override.
7. UI nueva en `/usuarios/<id>` para gestionar overrides (visible solo a
   OWNER + permiso `USUARIOS_GESTIONAR`).
8. AuditLog enriquecido: `rol`, `permiso`, `granted`, `motivo` de override.
9. Tests: matriz rol × permiso × Server Action × resultado esperado.
10. Manual de producto + checklist demo actualizados con los 8 roles.
11. Deploy + smoke completo.

## Consecuencias

### Positivas

- Modelo escalable: tenants chicos siguen usando 2-3 roles, los grandes
  pueden usar todos los 8.
- Eliminación del patrón "rol fijo === ADMIN" disperso en N archivos.
- Overrides permiten política fina sin promover roles innecesariamente.
- AuditLog enriquecido facilita compliance Ley 21.719.
- SUPPORT con expiración da acceso técnico sin riesgo permanente.

### Negativas / costos

- Schema migration con backfill = riesgo en data existente. Mitigar con
  test de restore previo + rollback en `deploy.sh`.
- Mobile rompe compat de devoluciones cajero hasta que el override esté
  configurado para cada cajero. Documentar el upgrade como migración para
  los tenants existentes.
- Costo de UI nueva (gestión de overrides) ~1 día.
- Costo de tests de matriz ~1 día.
- ETA total Fase 3D.5: ~2 días.

### Alternativas descartadas

- **Mantener ADMIN/CAJERO/VENDEDOR sin extensión:** el patch 3D.4 cierra el
  agujero inmediato pero no escala a comercios con jefe de turno o
  contador externo.
- **Modelo basado solo en permisos sin roles:** demasiada granularidad para
  un SMB. Los roles default cubren 80% de los casos.
- **Sistema de "grupos" + ABAC completo:** sobre-ingeniería para POS Chile.

## Estado

PROPUESTO. Pierre debe aprobar:

1. ✅ Lista de 8 roles (este ADR los lista; ajustes posibles).
2. ⏳ Tabla completa rol × permiso default (próxima sesión).
3. ⏳ Política de overrides (¿quién puede crearlos? ¿OWNER + ADMIN o solo OWNER?).
4. ⏳ Política de SUPPORT (¿7 días por default? ¿se puede extender?).
5. ⏳ Política de transferencia de OWNER (¿requiere validación email?).

Sin esos 5 inputs, no se procede a implementación de 3D.5.

## Referencias

- Patch 3D.4: `memory/episodes/2026-05-04-fase-3d4-rbac-patch.md`.
- Hallazgo H1+H2: `memory/problems/2026-05-04-rbac-h1-h2-privilege-escalation.md`.
- Manual web: `docs/product/manual-web.md` (sección "Roles").
- Discusión inicial chat 2026-05-04 (auditoría sección 5.2).
