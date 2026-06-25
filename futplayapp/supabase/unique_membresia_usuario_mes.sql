-- Evita que un usuario tenga más de una membresía en el mismo mes.
-- La única validación previa estaba en create-order/route.ts (nivel aplicación),
-- pero rutas admin (students/status) insertaban directo sin verificar.

ALTER TABLE membresia
ADD CONSTRAINT unique_usuario_mes UNIQUE (usuario_id, mes);
