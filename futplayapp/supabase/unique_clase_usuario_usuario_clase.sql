-- Evita inscripciones duplicadas en clase_usuario
-- Requisito: limpiar duplicados existentes antes de ejecutar
-- DELETE FROM clase_usuario WHERE id NOT IN (SELECT MIN(id) FROM clase_usuario GROUP BY usuario_id, clase_id);

ALTER TABLE clase_usuario ADD CONSTRAINT clase_usuario_usuario_clase_key UNIQUE (usuario_id, clase_id);
