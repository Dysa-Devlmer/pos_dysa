-- SCH2 (audit Claude Code CLI 2026-04-28) — CHECK constraints DB.
--
-- Antes de esta migration la base de datos tenía CERO CHECK constraints.
-- Toda la validación dependía de la lógica de aplicación (zod schemas en
-- API routes). Eso es frágil: cualquier path que escriba a la DB sin
-- pasar por el zod (queries directas en migration scripts, herramientas
-- admin, prisma studio manual, futuros endpoints sin validar) puede
-- introducir datos imposibles.
--
-- Estrategia: agregar CHECK a nivel column. Si datos existentes violan
-- los constraints (no debería ocurrir si la app validó bien siempre,
-- pero por defensa) la migration falla — entonces los repairs van en
-- UPDATE statements ANTES de cada ADD CONSTRAINT, dejando trazabilidad.
--
-- No agregamos constraints sobre invariantes cross-row (e.g. suma pagos
-- = total) porque Postgres CHECK no soporta subqueries; eso requiere
-- triggers que se postergan hasta que F-8 SII obligue a ese rigor.

-- ─── Producto ────────────────────────────────────────────────────────
-- precio: producto sin precio o con precio negativo es nonsense. >= 0
-- en lugar de >= 1 porque alguna iteración futura podría querer items
-- gratuitos (promos, regalos) — el reporte sugería >= 1 pero permitir
-- 0 es defensivo, validar "no gratuito" debe seguir siendo zod.
ALTER TABLE productos
  ADD CONSTRAINT productos_precio_nonneg_chk CHECK (precio >= 0);
ALTER TABLE productos
  ADD CONSTRAINT productos_stock_nonneg_chk CHECK (stock >= 0);
ALTER TABLE productos
  ADD CONSTRAINT productos_alerta_stock_nonneg_chk CHECK (alerta_stock >= 0);
ALTER TABLE productos
  ADD CONSTRAINT productos_ventas_nonneg_chk CHECK (ventas >= 0);

-- ─── Venta ───────────────────────────────────────────────────────────
ALTER TABLE ventas
  ADD CONSTRAINT ventas_subtotal_nonneg_chk CHECK (subtotal >= 0);
ALTER TABLE ventas
  ADD CONSTRAINT ventas_impuesto_nonneg_chk CHECK (impuesto >= 0);
ALTER TABLE ventas
  ADD CONSTRAINT ventas_total_nonneg_chk CHECK (total >= 0);
ALTER TABLE ventas
  ADD CONSTRAINT ventas_descuento_pct_range_chk CHECK (descuento_pct >= 0 AND descuento_pct <= 100);
ALTER TABLE ventas
  ADD CONSTRAINT ventas_descuento_monto_nonneg_chk CHECK (descuento_monto >= 0);
-- montoRecibido y vuelto son nullable; cuando existen deben ser >= 0.
ALTER TABLE ventas
  ADD CONSTRAINT ventas_monto_recibido_nonneg_chk CHECK (monto_recibido IS NULL OR monto_recibido >= 0);
ALTER TABLE ventas
  ADD CONSTRAINT ventas_vuelto_nonneg_chk CHECK (vuelto IS NULL OR vuelto >= 0);

-- ─── DetalleVenta ────────────────────────────────────────────────────
-- cantidad > 0: línea con cantidad 0 no tiene sentido (el caller debe
-- omitirla o eliminarla). precioUnitario >= 0 por defensa.
ALTER TABLE detalle_ventas
  ADD CONSTRAINT detalle_ventas_cantidad_positive_chk CHECK (cantidad > 0);
ALTER TABLE detalle_ventas
  ADD CONSTRAINT detalle_ventas_precio_nonneg_chk CHECK (precio_unitario >= 0);
ALTER TABLE detalle_ventas
  ADD CONSTRAINT detalle_ventas_subtotal_nonneg_chk CHECK (subtotal >= 0);

-- ─── PagoVenta ───────────────────────────────────────────────────────
-- Todo pago debe ser positivo. monto = 0 en split tender es bug.
ALTER TABLE pagos_venta
  ADD CONSTRAINT pagos_venta_monto_positive_chk CHECK (monto > 0);

-- ─── AperturaCaja ────────────────────────────────────────────────────
-- monto_inicial nonneg (no se abre caja con efectivo negativo, eso es bug).
-- monto_final_declarado nonneg (lo que el cajero cuenta físicamente NO puede
-- ser negativo — billetes y monedas son cantidades discretas no-negativas).
-- monto_final_sistema NO tiene constraint: es un valor CALCULADO que puede
-- ser negativo en escenarios reales de "caja en descubierto" (egresos >
-- ingresos durante el turno, ej. retiro grande sin venta que lo respalde).
-- Encontrada 1 fila histórica con valor -150349 — caso real, no bug.
-- diferencia tampoco tiene constraint (puede ser negativa = faltante).
ALTER TABLE aperturas_caja
  ADD CONSTRAINT aperturas_caja_monto_inicial_nonneg_chk CHECK (monto_inicial >= 0);
ALTER TABLE aperturas_caja
  ADD CONSTRAINT aperturas_caja_monto_final_dec_nonneg_chk CHECK (monto_final_declarado IS NULL OR monto_final_declarado >= 0);

-- ─── MovimientoCaja ──────────────────────────────────────────────────
-- monto > 0 en valor absoluto: la dirección la indica `tipo`
-- (INGRESO/EGRESO/RETIRO/AJUSTE) y el monto se almacena como positivo.
-- Movimiento de monto 0 es bug (eliminar mejor que loguear).
ALTER TABLE movimientos_caja
  ADD CONSTRAINT movimientos_caja_monto_positive_chk CHECK (monto > 0);

-- ─── Devolucion ──────────────────────────────────────────────────────
ALTER TABLE devoluciones
  ADD CONSTRAINT devoluciones_monto_positive_chk CHECK (monto_devuelto > 0);

-- ─── DevolucionItem ──────────────────────────────────────────────────
ALTER TABLE devolucion_items
  ADD CONSTRAINT devolucion_items_cantidad_positive_chk CHECK (cantidad > 0);
ALTER TABLE devolucion_items
  ADD CONSTRAINT devolucion_items_precio_nonneg_chk CHECK (precio_unitario >= 0);
ALTER TABLE devolucion_items
  ADD CONSTRAINT devolucion_items_subtotal_nonneg_chk CHECK (subtotal >= 0);

-- ─── Cliente ─────────────────────────────────────────────────────────
ALTER TABLE clientes
  ADD CONSTRAINT clientes_compras_nonneg_chk CHECK (compras >= 0);
