-- Fase 3C.1 — Public receipt tokens
--
-- Producción-safe en una sola migración:
-- 1. Agrega columnas nullable.
-- 2. Backfillea registros existentes con tokens URL-safe no enumerables.
-- 3. Endurece a NOT NULL + unique.

ALTER TABLE "ventas" ADD COLUMN "public_token" TEXT;
ALTER TABLE "devoluciones" ADD COLUMN "public_token" TEXT;

UPDATE "ventas"
SET "public_token" = substr(
  md5("id"::text || ':' || "numero_boleta" || ':' || clock_timestamp()::text || ':' || random()::text) ||
  md5(random()::text || ':' || "id"::text),
  1,
  22
)
WHERE "public_token" IS NULL;

UPDATE "devoluciones"
SET "public_token" = substr(
  md5("id"::text || ':' || "venta_id"::text || ':' || clock_timestamp()::text || ':' || random()::text) ||
  md5(random()::text || ':' || "id"::text),
  1,
  22
)
WHERE "public_token" IS NULL;

ALTER TABLE "ventas" ALTER COLUMN "public_token" SET NOT NULL;
ALTER TABLE "devoluciones" ALTER COLUMN "public_token" SET NOT NULL;

CREATE UNIQUE INDEX "ventas_public_token_key" ON "ventas"("public_token");
CREATE UNIQUE INDEX "devoluciones_public_token_key" ON "devoluciones"("public_token");
