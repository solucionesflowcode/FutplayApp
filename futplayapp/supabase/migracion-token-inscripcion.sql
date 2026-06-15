-- Migration: Token consumption at registration time
-- 
-- Changes:
-- 1. manejar_inscripcion_clase() now VALIDATES only (does NOT deduct tokens)
--    Token deduction is done by the application code in POST /api/clases/inscribir
-- 2. New devolver_token() function for server-side token refunds (used by admin DELETE clase)

-- 1. Modified trigger function: validate only, no deduction
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
  return new;
end;
$function$;

-- 2. Server-side function to return a token to a user
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
    and date_trunc('month', mes) = date_trunc('month', current_date)
  order by mes desc
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
