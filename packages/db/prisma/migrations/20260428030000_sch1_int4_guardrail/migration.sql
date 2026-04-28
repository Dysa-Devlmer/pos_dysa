-- SCH1 GUARDRAIL (audit Claude Code CLI 2026-04-28) — protección defensiva
-- contra Int4 overflow CLP MIENTRAS se posterga la migración completa a
-- BigInt al sprint F-8 SII.
--
-- ┌─ Contexto ──────────────────────────────────────────────────────────┐
-- │ PostgreSQL Int4 max: 2,147,483,647 (2.147B CLP).                    │
-- │ Una venta total > 2.147B revienta el INSERT con NaN/Infinity error.  │
-- │ El reporte de audit identificó esto como "bomba B2B".                │
-- │                                                                      │
-- │ Sin embargo:                                                         │
-- │ - POS Chile SMB ticket promedio: $50,000 CLP (×43,000 below limit). │
-- │ - Operación B2B IVA está bloqueada hasta F-8 SII (decision CEO D1). │
-- │ - Migrar Int → BigInt HOY = 6-8h breaking change en TS types.       │
-- │ - Migrar Int → BigInt en sprint F-8 = mismo deploy + 0 riesgo extra.│
-- └──────────────────────────────────────────────────────────────────────┘
--
-- DECISIÓN (2026-04-28): postergar SCH1 completa a F-8 sprint. Hoy
-- agregamos guardrail defensivo: CHECK constraint con margen de seguridad
-- 30% bajo el Int4 max. Si un INSERT/UPDATE intenta superarlo, falla con
-- mensaje claro de Postgres en lugar de NaN silencioso días después.
--
-- Margen de seguridad: 1,500,000,000 (1.5 billones CLP). Eso es ~700×
-- el ticket B2B Chile promedio enterprise (~$2M). Si alguna venta real
-- se acerca al constraint, es señal inequívoca de que SCH1 ya no se
-- puede postergar.
--
-- Aplicamos solo a los 4 campos donde el overflow emergería primero:
--   - Venta.total, Venta.subtotal: rollups de la transacción
--   - Producto.precio: usado en multiplicación cantidad * precio
--   - PagoVenta.monto: split tender, donde la suma debe = total
--
-- Los campos secundarios (DetalleVenta.subtotal, AperturaCaja.monto*,
-- MovimientoCaja.monto) NO necesitan guardrail — son matemáticamente
-- subordinados a los 4 above (ej. detalle.subtotal <= venta.total).

-- Constante reutilizable. PostgreSQL no soporta variables session-scoped
-- en migrations, así que repetimos el literal. Si se cambia, cambiar
-- los 4 simultáneamente. (Cuando se haga SCH1 real, dropear los 4.)

ALTER TABLE productos
  ADD CONSTRAINT productos_precio_int4_guardrail_chk
  CHECK (precio <= 1500000000);

ALTER TABLE ventas
  ADD CONSTRAINT ventas_subtotal_int4_guardrail_chk
  CHECK (subtotal <= 1500000000);

ALTER TABLE ventas
  ADD CONSTRAINT ventas_total_int4_guardrail_chk
  CHECK (total <= 1500000000);

ALTER TABLE pagos_venta
  ADD CONSTRAINT pagos_venta_monto_int4_guardrail_chk
  CHECK (monto <= 1500000000);

-- Cuando se haga SCH1 (Int → BigInt) en sprint F-8:
-- 1. ALTER TABLE ... ALTER COLUMN ... TYPE BIGINT (en este orden:
--    productos, detalle_ventas, ventas, pagos_venta, aperturas_caja,
--    movimientos_caja, devoluciones, devolucion_items).
-- 2. Actualizar schema.prisma con `BigInt` en cada @field correspondiente.
-- 3. `pnpm db:generate` regenera el cliente con tipos `bigint`.
-- 4. Search-replace en apps/web + apps/mobile + packages/domain de
--    operaciones aritméticas para usar BigInt API (`+ 1n`, `* 19n / 100n`,
--    `Number(x)` solo en boundary points para display).
-- 5. DROP CONSTRAINT productos_precio_int4_guardrail_chk + 3 más.
-- Tiempo estimado: 1 día focal (sin entremedio de otros tickets).
