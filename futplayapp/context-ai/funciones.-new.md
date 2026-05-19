| schema | function_name      | definition |
| ------ | ------------------ | ---------- |
| public | get_proxima_clase | CREATE OR REPLACE FUNCTION public.get_proxima_clase(p_usuario_id uuid)
 RETURNS TABLE(titulo text, descripcion text, fecha_hora timestamp without time zone, sede text)
 LANGUAGE sql
AS $function$
SELECT
  c.titulo,
  c.descripcion,
  h.fecha_hora,
  s.nombre
FROM clase_usuario cu
JOIN horario h ON cu.horario_id = h.id
JOIN clase c ON h.clase_id = c.id
JOIN sede s ON c.sede_id = s.id
WHERE cu.usuario_id = p_usuario_id
AND h.fecha_hora > NOW()
ORDER BY h.fecha_hora ASC
LIMIT 1;
$function$ |
