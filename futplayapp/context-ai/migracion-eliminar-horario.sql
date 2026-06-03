-- ============================================================
-- Migración: eliminar tabla horario, pasar fecha_hora a clase
-- ============================================================
-- Ejecutar en el SQL Editor de Supabase (una sola vez)
-- ============================================================

BEGIN;

-- 1. Agregar columna fecha_hora a clase
ALTER TABLE clase ADD COLUMN IF NOT EXISTS fecha_hora timestamp without time zone;

-- 2. Migrar datos: tomar el horario más antiguo de cada clase
--    (los demás eran duplicados erróneos)
UPDATE clase c
SET fecha_hora = (
  SELECT h.fecha_hora
  FROM horario h
  WHERE h.clase_id = c.id
  ORDER BY h.fecha_hora
  LIMIT 1
);

-- 3. Ver cuántas clases quedaron sin fecha (no tenían ningún horario)
--    SELECT id, titulo FROM clase WHERE fecha_hora IS NULL;

-- 4. Poblar clase_usuario.clase_id usando la relación desde horario
UPDATE clase_usuario cu
SET clase_id = (SELECT h.clase_id FROM horario h WHERE h.id = cu.horario_id)
WHERE cu.horario_id IS NOT NULL;

-- 5. Eliminar FK de clase_usuario → horario
ALTER TABLE clase_usuario DROP CONSTRAINT IF EXISTS clase_usuario_horario_id_fkey;

-- 6. Eliminar columna horario_id (ya no se usa)
ALTER TABLE clase_usuario DROP COLUMN IF EXISTS horario_id;

-- 7. Agregar FK clase_usuario.clase_id → clase.id
ALTER TABLE clase_usuario ADD CONSTRAINT clase_usuario_clase_id_fkey
  FOREIGN KEY (clase_id) REFERENCES clase(id);

-- 8. Hacer clase_id NOT NULL
ALTER TABLE clase_usuario ALTER COLUMN clase_id SET NOT NULL;

-- 9. Eliminar tabla horario
DROP TABLE IF EXISTS horario;

COMMIT;
