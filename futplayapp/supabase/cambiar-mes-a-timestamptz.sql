-- Migration: Cambiar fecha_inicio de text a timestamptz
-- La columna fecha_inicio era originalmente mes (text), renombrada pero nunca cambiada de tipo.

ALTER TABLE membresia ALTER COLUMN fecha_inicio TYPE timestamptz USING fecha_inicio::timestamptz;
