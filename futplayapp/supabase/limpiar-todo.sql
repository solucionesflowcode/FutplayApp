BEGIN;

DELETE FROM boleta_item;
DELETE FROM clase_usuario;
DELETE FROM membresia;
DELETE FROM boleta;
DELETE FROM recurrencia;

COMMIT;
