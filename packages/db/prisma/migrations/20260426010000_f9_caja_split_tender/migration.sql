-- F-9: Caja con split tender
--
-- Idempotente: usa IF NOT EXISTS / DO $$ EXCEPTION WHEN duplicate_object para
-- aplicar limpio en prod (donde aún no está aplicada) y ser no-op en dev
-- (donde una iteración previa parcial ya pusheó el enum MetodoPago.MIXTO).
-- Diseñada para correr una sola vez por base; Prisma marca _prisma_migrations.

-- 1. Enum MetodoPago: agregar MIXTO ───────────────────────────────────
ALTER TYPE "MetodoPago" ADD VALUE IF NOT EXISTS 'MIXTO';

-- 2. Enum TipoMovimientoCaja ──────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "TipoMovimientoCaja" AS ENUM ('INGRESO', 'EGRESO', 'RETIRO', 'AJUSTE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. Enum EstadoApertura ──────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "EstadoApertura" AS ENUM ('ABIERTA', 'CERRADA');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 4. Tabla cajas ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "cajas" (
  "id"         SERIAL          NOT NULL,
  "nombre"     TEXT            NOT NULL,
  "ubicacion"  TEXT,
  "activa"     BOOLEAN         NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cajas_pkey" PRIMARY KEY ("id")
);

-- 5. Tabla aperturas_caja ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "aperturas_caja" (
  "id"                     SERIAL              NOT NULL,
  "caja_id"                INTEGER             NOT NULL,
  "usuario_id"             INTEGER             NOT NULL,
  "monto_inicial"          INTEGER             NOT NULL,
  "fecha_apertura"         TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fecha_cierre"           TIMESTAMP(3),
  "monto_final_declarado"  INTEGER,
  "monto_final_sistema"    INTEGER,
  "diferencia"             INTEGER,
  "observaciones"          TEXT,
  "estado"                 "EstadoApertura"    NOT NULL DEFAULT 'ABIERTA',
  CONSTRAINT "aperturas_caja_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "aperturas_caja_caja_id_idx"    ON "aperturas_caja"("caja_id");
CREATE INDEX IF NOT EXISTS "aperturas_caja_usuario_id_idx" ON "aperturas_caja"("usuario_id");
CREATE INDEX IF NOT EXISTS "aperturas_caja_estado_idx"     ON "aperturas_caja"("estado");

DO $$ BEGIN
  ALTER TABLE "aperturas_caja"
    ADD CONSTRAINT "aperturas_caja_caja_id_fkey"
    FOREIGN KEY ("caja_id") REFERENCES "cajas"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "aperturas_caja"
    ADD CONSTRAINT "aperturas_caja_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 6. Tabla movimientos_caja ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "movimientos_caja" (
  "id"          SERIAL                NOT NULL,
  "apertura_id" INTEGER               NOT NULL,
  "tipo"        "TipoMovimientoCaja"  NOT NULL,
  "monto"       INTEGER               NOT NULL,
  "motivo"      TEXT                  NOT NULL,
  "usuario_id"  INTEGER               NOT NULL,
  "fecha"       TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "movimientos_caja_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "movimientos_caja_apertura_id_idx" ON "movimientos_caja"("apertura_id");
CREATE INDEX IF NOT EXISTS "movimientos_caja_fecha_idx"       ON "movimientos_caja"("fecha");

DO $$ BEGIN
  ALTER TABLE "movimientos_caja"
    ADD CONSTRAINT "movimientos_caja_apertura_id_fkey"
    FOREIGN KEY ("apertura_id") REFERENCES "aperturas_caja"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "movimientos_caja"
    ADD CONSTRAINT "movimientos_caja_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 7. Tabla pagos_venta ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "pagos_venta" (
  "id"         SERIAL        NOT NULL,
  "venta_id"   INTEGER       NOT NULL,
  "metodo"     "MetodoPago"  NOT NULL,
  "monto"      INTEGER       NOT NULL,
  "referencia" TEXT,
  CONSTRAINT "pagos_venta_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "pagos_venta_venta_id_idx" ON "pagos_venta"("venta_id");

DO $$ BEGIN
  ALTER TABLE "pagos_venta"
    ADD CONSTRAINT "pagos_venta_venta_id_fkey"
    FOREIGN KEY ("venta_id") REFERENCES "ventas"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 8. Columnas en ventas ───────────────────────────────────────────────
ALTER TABLE "ventas" ADD COLUMN IF NOT EXISTS "apertura_id"     INTEGER;
ALTER TABLE "ventas" ADD COLUMN IF NOT EXISTS "monto_recibido"  INTEGER;
ALTER TABLE "ventas" ADD COLUMN IF NOT EXISTS "vuelto"          INTEGER;

CREATE INDEX IF NOT EXISTS "ventas_apertura_id_idx" ON "ventas"("apertura_id");

DO $$ BEGIN
  ALTER TABLE "ventas"
    ADD CONSTRAINT "ventas_apertura_id_fkey"
    FOREIGN KEY ("apertura_id") REFERENCES "aperturas_caja"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
