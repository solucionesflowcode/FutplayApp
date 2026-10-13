-- 2026-10: devolver_token reactiva la membresía cerrada por tokens.
--
-- Antes: restaba 1 a tokens_usados pero dejaba la membresía agotada
-- (estado = false, sin_tokens = true). El trigger de inscripción exige
-- estado = true, así que el alumno veía el token devuelto y no podía usarlo
-- hasta que un admin la reactivara a mano.
--
-- Regla nueva:
--  1. Si el alumno tiene otra membresía ACTIVA (compró el plan siguiente), el
--     token se suma a esa: tokens_usados - 1, o tokens_totales + 1 si aún no
--     usó ninguno.
--  2. Si no, la membresía vigente cerrada por tokens recupera el token y se
--     reactiva (estado = true, sin_tokens = false).
-- Las congeladas y vencidas no reciben tokens (igual que antes).
-- La usan el bot de WhatsApp y devolver_tokens_al_borrar_clase().

create or replace function public.devolver_token(p_usuario_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_membresia membresia%rowtype;
begin
  -- 1. Membresía activa con saldo: el token se suma ahí.
  select * into v_membresia
  from membresia
  where usuario_id = p_usuario_id
    and estado = true
    and sin_tokens = false
    and congelada = false
    and fecha_inicio <= now()
    and fecha_vencimiento >= now()
  order by fecha_vencimiento desc
  limit 1
  for update;

  if found then
    if v_membresia.tokens_usados > 0 then
      update membresia set tokens_usados = tokens_usados - 1 where id = v_membresia.id;
    else
      update membresia set tokens_totales = tokens_totales + 1 where id = v_membresia.id;
    end if;
    return true;
  end if;

  -- 2. Sin otra activa: se reactiva la cerrada por tokens.
  select * into v_membresia
  from membresia
  where usuario_id = p_usuario_id
    and sin_tokens = true
    and congelada = false
    and tokens_usados > 0
    and fecha_inicio <= now()
    and fecha_vencimiento >= now()
  order by fecha_vencimiento desc
  limit 1
  for update;

  if not found then
    return false;
  end if;

  update membresia
     set tokens_usados = tokens_usados - 1,
         estado = true,
         sin_tokens = false
   where id = v_membresia.id;

  return true;
end;
$function$;
