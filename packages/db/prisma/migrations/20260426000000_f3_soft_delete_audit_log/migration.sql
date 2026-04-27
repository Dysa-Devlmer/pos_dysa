-- F-3 Audit P1: soft-delete en ventas + tabla audit_logs
--
-- Idempotente: usa IF NOT EXISTS en cada DDL para que aplique limpio en
-- prod (donde la migración aún NO está aplicada) y sea no-op en dev (donde
-- una iteración previa ya pusheó el schema). Diseñada para correr una
-- sola vez por base; Prisma marca _prisma_migrations al terminar.

-- 1. Enum AuditAccion ─────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "AuditAccion" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'RESTORE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Columnas soft-delete en ventas ──────────────────────────────────
ALTER TABLE "ventas" ADD COLUMN IF NOT EXISTS "deleted_at"      TIMESTAMP(3);
ALTER TABLE "ventas" ADD COLUMN IF NOT EXISTS "deleted_by"      INTEGER;
ALTER TABLE "ventas" ADD COLUMN IF NOT EXISTS "deletion_reason" TEXT;

CREATE INDEX IF NOT EXISTS "ventas_deleted_at_idx" ON "ventas"("deleted_at");

-- FK ventas.deleted_by → usuarios.id (SET NULL si el usuario que borró
-- desaparece). pg no soporta IF NOT EXISTS en ADD CONSTRAINT, lo
-- envolvemos en bloque DO.
DO $$ BEGIN
  ALTER TABLE "ventas"
    ADD CONSTRAINT "ventas_deleted_by_fkey"
    FOREIGN KEY ("deleted_by") REFERENCES "usuarios"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. Tabla audit_logs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id"          SERIAL          NOT NULL,
  "tabla"       TEXT            NOT NULL,
  "registro_id" INTEGER         NOT NULL,
  "accion"      "AuditAccion"   NOT NULL,
  "usuario_id"  INTEGER         NOT NULL,
  "diff"        JSONB,
  "fecha"       TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ip"          TEXT,
  "user_agent"  TEXT,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "audit_logs_tabla_registro_id_idx"
  ON "audit_logs"("tabla", "registro_id");
CREATE INDEX IF NOT EXISTS "audit_logs_fecha_idx"
  ON "audit_logs"("fecha");

DO $$ BEGIN
  ALTER TABLE "audit_logs"
    ADD CONSTRAINT "audit_logs_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
