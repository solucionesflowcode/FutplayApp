BEGIN;

-- 1. Limpiar datos (orden seguro por FK)
DELETE FROM boleta_item;
DELETE FROM clase_usuario;
DELETE FROM membresia;
DELETE FROM boleta;
DELETE FROM recurrencia;

-- 2. Cambiar fecha_inicio de text a timestamptz
ALTER TABLE membresia ALTER COLUMN fecha_inicio TYPE timestamptz USING fecha_inicio::timestamptz;

COMMIT;
