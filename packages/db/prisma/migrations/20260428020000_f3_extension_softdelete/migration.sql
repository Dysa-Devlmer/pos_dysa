-- F-3 extension (audit Claude Code CLI 2026-04-28) — extiende el patrón
-- soft-delete que F-3 introdujo en `ventas` a otros 3 modelos donde la
-- audit detectó cobertura insuficiente:
--
-- 1. clientes — borrar un cliente físicamente cae las FK de ventas a NULL
--    (clienteId.SET NULL) perdiendo trazabilidad histórica. Soft-delete
--    preserva el vínculo ventas ↔ cliente para reportes Z y compliance
--    Ley 21.719 (data retention SII = 6 años).
--
-- 2. devoluciones — una devolución mal hecha (cantidad equivocada, motivo
--    incorrecto) actualmente solo se podía borrar físicamente, perdiendo
--    el rastro. Con soft-delete la operación queda auditada (deleted_at
--    + deleted_by + deletion_reason) en lugar de desaparecer.
--
-- 3. movimientos_caja — movimientos manuales (INGRESO/EGRESO/RETIRO/
--    AJUSTE) son la base del cierre Z. Borrar uno físicamente desbalancea
--    el reporte sin dejar rastro. Soft-delete + auditoría es obligatorio
--    para integridad contable.
--
-- Patrón idéntico al de `ventas` (migration 20260426000000): tres columnas
-- nullable + index sobre deleted_at + FK SET NULL al usuario que borró.

-- ─── 1. clientes ─────────────────────────────────────────────────────
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "deleted_at"      TIMESTAMP(3);
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "deleted_by"      INTEGER;
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "deletion_reason" TEXT;

CREATE INDEX IF NOT EXISTS "clientes_deleted_at_idx" ON "clientes"("deleted_at");

DO $$ BEGIN
  ALTER TABLE "clientes"
    ADD CONSTRAINT "clientes_deleted_by_fkey"
    FOREIGN KEY ("deleted_by") REFERENCES "usuarios"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. devoluciones ─────────────────────────────────────────────────
ALTER TABLE "devoluciones" ADD COLUMN IF NOT EXISTS "deleted_at"      TIMESTAMP(3);
ALTER TABLE "devoluciones" ADD COLUMN IF NOT EXISTS "deleted_by"      INTEGER;
ALTER TABLE "devoluciones" ADD COLUMN IF NOT EXISTS "deletion_reason" TEXT;

CREATE INDEX IF NOT EXISTS "devoluciones_deleted_at_idx" ON "devoluciones"("deleted_at");

DO $$ BEGIN
  ALTER TABLE "devoluciones"
    ADD CONSTRAINT "devoluciones_deleted_by_fkey"
    FOREIGN KEY ("deleted_by") REFERENCES "usuarios"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── 3. movimientos_caja ─────────────────────────────────────────────
ALTER TABLE "movimientos_caja" ADD COLUMN IF NOT EXISTS "deleted_at"      TIMESTAMP(3);
ALTER TABLE "movimientos_caja" ADD COLUMN IF NOT EXISTS "deleted_by"      INTEGER;
ALTER TABLE "movimientos_caja" ADD COLUMN IF NOT EXISTS "deletion_reason" TEXT;

CREATE INDEX IF NOT EXISTS "movimientos_caja_deleted_at_idx" ON "movimientos_caja"("deleted_at");

DO $$ BEGIN
  ALTER TABLE "movimientos_caja"
    ADD CONSTRAINT "movimientos_caja_deleted_by_fkey"
    FOREIGN KEY ("deleted_by") REFERENCES "usuarios"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
