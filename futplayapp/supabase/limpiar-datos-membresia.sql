-- One-time: limpiar datos de membresía, boletas, boleta_item y recurrencia
-- Orden correcto respetando FK:

-- 1. boleta_item (FK → boleta, plan)
DELETE FROM boleta_item;

-- 2. clase_usuario asociada a usuarios con membresías (FK → membresia vía trigger, pero no directa)
--    No tiene FK a membresia, se puede limpiar opcionalmente:
-- DELETE FROM clase_usuario WHERE usuario_id IN (SELECT usuario_id FROM membresia);

-- 3. membresia (FK → plan, boleta)
DELETE FROM membresia;

-- 4. boleta (FK → recurrencia, usuario)
DELETE FROM boleta;

-- 5. recurrencia (no tiene FK a otras tablas, es referenciada por boleta)
DELETE FROM recurrencia;
