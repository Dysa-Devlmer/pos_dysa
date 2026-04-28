/**
 * Helpers de query reusables para Prisma.
 *
 * Cada constante es un fragmento `where` que filtra registros vivos
 * (no soft-deleted). Aplicar en TODO listing/aggregate visible al usuario
 * final. Para ver los soft-deleted, las pantallas admin específicas
 * (`/ventas/eliminadas`, etc.) consultan SIN el filtro y muestran un
 * botón de restaurar.
 *
 * Patrón soft-delete: F-3 (audit P1, commit a22d15b para `Venta`) +
 * F-3 extension (audit Claude Code CLI 2026-04-28, commit pendiente
 * para `Cliente`, `Devolucion`, `MovimientoCaja`). Cada modelo afectado
 * tiene 3 columnas: `deletedAt` timestamp, `deletedBy` FK a usuario,
 * `deletionReason` texto opcional. La operación de borrado siempre va
 * en `$transaction` con un INSERT a `audit_logs`.
 */

export const VENTAS_VISIBLES = { deletedAt: null } as const;

/**
 * Filtro de clientes vivos. Excluye los soft-deleted del listing
 * `/clientes`, del autocomplete en POS, y de los reportes.
 *
 * Las ventas históricas que apuntaban a un cliente borrado SIGUEN
 * mostrando los datos del cliente (Prisma sigue resolviendo el FK
 * porque el registro existe físicamente, solo está marcado).
 */
export const CLIENTES_VISIBLES = { deletedAt: null } as const;

/**
 * Filtro de devoluciones vivas. Excluye las anuladas/borradas del
 * listing principal y de los aggregates de monto devuelto.
 *
 * Una devolución soft-deleted NO revierte sus efectos sobre el stock
 * ni sobre los counters del producto — esos efectos quedaron registrados
 * cuando se creó. Para restaurar la situación previa, hay que crear
 * una nueva devolución compensatoria (mismo motivo, monto invertido).
 */
export const DEVOLUCIONES_VISIBLES = { deletedAt: null } as const;

/**
 * Filtro de movimientos de caja vivos. Crítico para reportes Z y
 * cierres contables — un movimiento soft-deleted NO entra en el
 * cálculo de monto_final_sistema.
 */
export const MOVIMIENTOS_CAJA_VISIBLES = { deletedAt: null } as const;
