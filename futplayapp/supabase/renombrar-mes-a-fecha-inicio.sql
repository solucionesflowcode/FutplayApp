-- Migration: Renombrar mes → fecha_inicio, agregar fecha_vencimiento
-- 1. Renombrar columna mes a fecha_inicio
ALTER TABLE membresia RENAME COLUMN mes TO fecha_inicio;

-- 2. Agregar columna fecha_vencimiento
ALTER TABLE membresia ADD COLUMN fecha_vencimiento timestamptz;

-- 3. Poblar fecha_vencimiento para registros existentes (30 días después de fecha_inicio)
UPDATE membresia SET fecha_vencimiento = fecha_inicio + interval '30 days';

-- 4. Hacer NOT NULL después de poblar
ALTER TABLE membresia ALTER COLUMN fecha_vencimiento SET NOT NULL;

-- 5. Actualizar trigger function manejar_inscripcion_clase()
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
  select tipo_evento into evento_tipo
  from clase
  where id = new.clase_id;
  if not found then
    raise exception 'Clase no encontrada';
  end if;
  if evento_tipo = 'partido' then
    return new;
  end if;
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

-- 6. Actualizar función devolver_token()
CREATE OR REPLACE FUNCTION public.devolver_token(p_usuario_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  membresia_id uuid;
  tokens_usados_actual int;
begin
  select id, tokens_usados into membresia_id, tokens_usados_actual
  from membresia
  where usuario_id = p_usuario_id
    and tokens_usados > 0
    and date_trunc('month', fecha_inicio AT TIME ZONE 'America/Santiago') = date_trunc('month', current_date AT TIME ZONE 'America/Santiago')
  order by fecha_inicio desc
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

-- 7. Actualizar función limpiar_inscripciones_al_vencer y triggers (sin cambios en lógica, solo por consistencia)
CREATE OR REPLACE FUNCTION public.limpiar_inscripciones_al_vencer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  DELETE FROM clase_usuario
  WHERE usuario_id = OLD.usuario_id
    AND (asistencia IS NULL OR asistencia = 'sin_confirmar');
  RETURN OLD;
END;
$function$;
