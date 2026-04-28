-- SCH3 (audit Claude Code CLI 2026-04-28) — partial unique constraints
-- para prevenir race conditions invisibles a nivel aplicación.
--
-- 1. AperturaCaja(caja_id) WHERE estado='ABIERTA':
--    Sin esto, dos clicks simultáneos en "Abrir caja" desde 2 dispositivos
--    distintos (o doble-tap rápido) podían crear DOS aperturas activas para
--    la misma caja. La lógica de cierre Z asume una sola apertura abierta —
--    al haber dos, los movimientos / ventas se asignaban arbitrariamente y
--    el reporte Z mostraba números inconsistentes.
--
-- 2. MobileRelease(platform) WHERE is_latest=true:
--    Mismo riesgo en /api/mobile/manifest: dos publicaciones simultáneas
--    podían quedar ambas con isLatest=true → la app polea y elige cualquiera
--    de las dos según el orden de retorno PostgreSQL. El POST hacía toggle
--    en $transaction pero sin constraint DB, dos transacciones concurrentes
--    podían leer y modificar el mismo state antes de que la otra commit.
--
-- Ambas son `partial unique indexes` (sintaxis WHERE), no constraints. El
-- CONCURRENTLY no se puede usar dentro de migration porque requiere fuera
-- de transacción — Prisma migrate envuelve todo en una. La tabla es chica
-- en SMB POS (1-3 cajas, ~100 releases vida del proyecto), el lock es
-- imperceptible.

-- Limpiar duplicados existentes ANTES de crear el unique. Si hay >1
-- ABIERTA por caja, mantenemos solo la más reciente (max id) y CERRAMOS
-- las anteriores con observación auto-generada para auditoría.
UPDATE aperturas_caja
SET
  estado = 'CERRADA',
  fecha_cierre = COALESCE(fecha_cierre, NOW()),
  observaciones = COALESCE(observaciones, '') ||
    E'\n[SCH3 auto-cierre 2026-04-28] Apertura cerrada por migration partial-unique constraint (otra apertura más reciente estaba activa para esta caja).'
WHERE estado = 'ABIERTA'
  AND id NOT IN (
    SELECT MAX(id)
    FROM aperturas_caja
    WHERE estado = 'ABIERTA'
    GROUP BY caja_id
  );

-- Mismo para MobileRelease: si hay >1 latest=true por platform, mantener
-- solo el más reciente (max published_at) y desmarcar el resto.
UPDATE mobile_releases
SET is_latest = false
WHERE is_latest = true
  AND id NOT IN (
    SELECT id FROM (
      SELECT DISTINCT ON (platform) id
      FROM mobile_releases
      WHERE is_latest = true
      ORDER BY platform, published_at DESC
    ) latest
  );

-- Ahora sí los partial unique indexes.
CREATE UNIQUE INDEX "aperturas_caja_caja_id_estado_abierta_unique"
  ON aperturas_caja (caja_id)
  WHERE estado = 'ABIERTA';

CREATE UNIQUE INDEX "mobile_releases_platform_is_latest_unique"
  ON mobile_releases (platform)
  WHERE is_latest = true;
