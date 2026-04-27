/**
 * Helpers de query reusables para Prisma.
 *
 * `VENTAS_VISIBLES` — filtro estándar para listings de ventas vivas (no
 * soft-deleted). Aplicar en TODO listing/aggregate que sea visible al
 * usuario final: dashboard KPIs, /ventas, /reportes, /api/v1/ventas (GET),
 * etc. Soft-delete fue agregado en F-3 (audit P1) — antes el delete era
 * `tx.venta.delete()` físico, ahora es `deletedAt = now()` + AuditLog.
 *
 * Ventas con `deletedAt != null` solo se muestran en /ventas/eliminadas
 * (ADMIN-only), donde se puede restaurar.
 */
export const VENTAS_VISIBLES = { deletedAt: null } as const;
