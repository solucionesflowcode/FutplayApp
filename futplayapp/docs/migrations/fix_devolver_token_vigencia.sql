-- FIX - devolver_token debe buscar la membresía ACTIVA por VIGENCIA (no por mes)
--
-- Regla de negocio:
--   - La membresía está activa si estado=true Y fecha_inicio <= now() <= fecha_vencimiento
--     (planes de 30/90 días desde la compra).
--   - Solo se devuelve token si la membresía tiene tokens_usados > 0 (nunca queda negativo).
--   - La selección debe coincidir con manejar_inscripcion_clase() (fecha_vencimiento DESC),
--     para devolver a la misma membresía que descontó al inscribir.
--
-- EL ANTERIOR filtraba con date_trunc('month', fecha_inicio) = mes actual, lo que
-- impedía devolver el token si la membresía vigente empezó en un mes distinto.

CREATE OR REPLACE FUNCTION public.devolver_token(p_usuario_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
declare
  membresia_id uuid;
  tokens_usados_actual int;
begin
  -- Membresía ACTIVA por vigencia (misma lógica que manejar_inscripcion_clase)
  select id, tokens_usados into membresia_id, tokens_usados_actual
  from membresia
  where usuario_id = p_usuario_id
    and estado = true
    and tokens_usados > 0
    and fecha_inicio <= now()
    and fecha_vencimiento >= now()
  order by fecha_vencimiento desc
  limit 1;

  if membresia_id is null then
    return false;
  end if;

  update membresia
  set tokens_usados = tokens_usados_actual - 1
  where id = membresia_id;

  return true;
end;
$function$;