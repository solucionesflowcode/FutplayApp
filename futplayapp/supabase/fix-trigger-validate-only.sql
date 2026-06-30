-- Fix: manejar_inscripcion_clase() valida + descuenta token solo para entrenamiento
-- Si tipo_evento = 'partido', no requiere membresía ni token.

CREATE OR REPLACE FUNCTION public.manejar_inscripcion_clase()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  tokens_disponibles int;
  membresia_actual record;
  evento_tipo text;
begin
  -- Obtener tipo_evento de la clase
  select tipo_evento into evento_tipo
  from clase
  where id = new.clase_id;
  if not found then
    raise exception 'Clase no encontrada';
  end if;

  -- Si es partido, no requiere token
  if evento_tipo = 'partido' then
    return new;
  end if;

  -- Validar membresía y descontar token solo para entrenamiento
  select * into membresia_actual
  from membresia
  where usuario_id = new.usuario_id
    and date_trunc('month', fecha_inicio AT TIME ZONE 'America/Santiago') = date_trunc('month', current_date AT TIME ZONE 'America/Santiago')
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
