-- ============================================================
-- Fix: recrear funciones que aún referencian la tabla `horario`
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. get_proxima_clase — ya no usa horario
CREATE OR REPLACE FUNCTION public.get_proxima_clase(p_usuario_id uuid)
 RETURNS TABLE(titulo text, descripcion text, fecha_hora timestamp without time zone, sede text)
 LANGUAGE sql
AS $function$
SELECT
  c.titulo,
  c.descripcion,
  c.fecha_hora,
  s.nombre
FROM clase_usuario cu
JOIN clase c ON cu.clase_id = c.id
JOIN sede s ON c.sede_id = s.id
WHERE cu.usuario_id = p_usuario_id
AND c.fecha_hora > NOW()
ORDER BY c.fecha_hora ASC
LIMIT 1;
$function$;

-- 2. limitar_15_alumnos — asegurar que usa NEW.clase_id (no horario_id)
CREATE OR REPLACE FUNCTION public.limitar_15_alumnos()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  capacidad_maxima integer;
  inscritos integer;
BEGIN
  SELECT cupo_maximo INTO capacidad_maxima FROM clase WHERE id = NEW.clase_id;
  SELECT COUNT(*) INTO inscritos FROM clase_usuario WHERE clase_id = NEW.clase_id;
  IF inscritos >= capacidad_maxima THEN
    RAISE EXCEPTION 'La clase ya alcanzó su capacidad máxima';
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. manejar_inscripcion_clase — asegurar que usa NEW.usuario_id (no horario)
CREATE OR REPLACE FUNCTION public.manejar_inscripcion_clase()
 RETURNS trigger
 LANGUAGE plpgsql
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

-- 4. Verificar que no queden más funciones con referencias a horario
SELECT proname AS function_name
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND prosrc ILIKE '%horario%';
