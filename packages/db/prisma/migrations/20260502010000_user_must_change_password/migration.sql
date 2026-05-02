-- Fase 3C.2 — Flujo de contraseña temporal por usuario.
--
-- Backwards-safe: NOT NULL con DEFAULT false. Los usuarios existentes
-- (incluido admin/cajero del seed) quedan en false — no se les fuerza
-- cambio. Solo aplica a partir de aquí cuando ADMIN cree usuario o
-- resetee password.

ALTER TABLE "usuarios"
  ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;
