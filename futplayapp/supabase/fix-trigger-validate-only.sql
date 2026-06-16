-- Fix: hacer que manejar_inscripcion_clase() valide Y descuente tokens
-- al insertar un usuario en clase_usuario

CREATE OR REPLACE FUNCTION public.manejar_inscripcion_clase()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  tokens_disponibles int;
  membresia_actual record;
begin
  select * into membresia_actual
  from membresia
  where usuario_id = new.usuario_id
    and date_trunc('month', mes) = date_trunc('month', current_date)
  limit 1;
  if membresia_actual is null then
    raise exception 'No tienes membresía activa este mes';
  end if;
  tokens_disponibles := membresia_actual.tokens_totales - membresia_actual.tokens_usados;
  if tokens_disponibles <= 0 then
    raise exception 'No tienes tokens disponibles';
  end if;
  update membresia
  set tokens_usados = tokens_usados + 1
  where id = membresia_actual.id;
  return new;
end;
$function$;
