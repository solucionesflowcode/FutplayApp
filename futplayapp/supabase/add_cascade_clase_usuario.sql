-- Agrega ON DELETE CASCADE a clase_usuario.clase_id -> clase.id
-- para que eliminar una clase borre automáticamente las inscripciones

ALTER TABLE clase_usuario DROP CONSTRAINT IF EXISTS clase_usuario_clase_id_fkey;
ALTER TABLE clase_usuario ADD CONSTRAINT clase_usuario_clase_id_fkey
  FOREIGN KEY (clase_id) REFERENCES clase(id) ON DELETE CASCADE;
