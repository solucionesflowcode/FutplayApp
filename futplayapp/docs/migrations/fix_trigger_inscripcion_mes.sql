-- Fix: trigger manejar_inscripcion_clase()
-- Problema: usaba "date_trunc('month', fecha_inicio AT TIME ZONE 'America/Santiago') = date_trunc('month', current_date AT TIME ZONE 'America/Santiago')",
-- lo que (1) depende de la fecha de compra de la membresía y (2) tiene un desfase de zona horaria
-- que hace fallar a quienes compran el día 1 del mes (p.ej. 1 de septiembre → el trigger creía que era agosto).
-- Ahora: una membresía es "activa este mes" si su período de validez SOLAPA el mes en curso,
-- sin importar cuándo se compró, y si hay varias se toma la más reciente.
create or replace function public.manejar_inscripcion_clase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

  -- Mes en curso (hora de Chile) para comparar de forma consistente
  select * into membresia_actual
  from membresia
  where usuario_id = new.usuario_id
    and estado = true
    and fecha_inicio < (date_trunc('month', now() at time zone 'America/Santiago') + interval '1 month')
    and fecha_vencimiento >= date_trunc('month', now() at time zone 'America/Santiago')
  order by fecha_inicio desc
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
$$;
