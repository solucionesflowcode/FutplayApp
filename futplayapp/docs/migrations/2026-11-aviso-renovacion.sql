-- Aviso de renovación por WhatsApp (bot, scheduler.js → avisarRenovaciones)
--
-- A los jugadores SIN membresía vigente (sin tokens, plan vencido o que nunca
-- compraron) el bot les manda UNA vez el link de los planes, 2 h después de
-- quedarse sin plan. No espera respuesta.
--
--  1. membresia.tokens_agotados_at: cuándo se gastó el último token (lo mantiene
--     un trigger; se limpia si se devuelve un token).
--  2. aviso_renovacion: avisos ya enviados, uno por (usuario, membresía agotada).
--     membresia_id null = aviso a quien nunca tuvo plan.
--  3. usuarios_aviso_renovacion(espera): a quién hay que avisar ahora.

-- ─── 1. Hora en que se agotaron los tokens ───
alter table public.membresia add column if not exists tokens_agotados_at timestamptz;

create or replace function public.marcar_tokens_agotados()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.tokens_totales > 0 and new.tokens_usados >= new.tokens_totales then
    -- Se conserva la primera hora en que se agotaron.
    if new.tokens_agotados_at is null then
      new.tokens_agotados_at := now();
    end if;
  else
    new.tokens_agotados_at := null;
  end if;
  return new;
end $$;

-- Nombre posterior a trg_membresia_sincronizar_estado (los BEFORE corren en orden
-- alfabético): ve los tokens que ese trigger agota al vencer el plan.
drop trigger if exists trg_membresia_tokens_agotados on public.membresia;
create trigger trg_membresia_tokens_agotados
  before insert or update of tokens_usados, tokens_totales, tokens_agotados_at
  on public.membresia
  for each row execute function public.marcar_tokens_agotados();

-- Membresías ya agotadas: la hora de su última reserva (la que gastó el último
-- token); si no hay, la creación de la membresía.
update public.membresia m
   set tokens_agotados_at = coalesce(
         (select max(cu.created_at) at time zone 'UTC'
            from public.clase_usuario cu
           where cu.usuario_id = m.usuario_id
             and cu.created_at at time zone 'UTC' >= m.fecha_inicio),
         m.created_at at time zone 'UTC')
 where m.tokens_totales > 0
   and m.tokens_usados >= m.tokens_totales
   and m.tokens_agotados_at is null;

-- ─── 2. Avisos enviados ───
create table if not exists public.aviso_renovacion (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuario(id) on delete cascade,
  membresia_id uuid references public.membresia(id) on delete cascade,
  enviado_at timestamptz not null default now(),
  constraint aviso_renovacion_unico unique nulls not distinct (usuario_id, membresia_id)
);

-- Solo el bot (service role) la usa: RLS sin políticas.
alter table public.aviso_renovacion enable row level security;

-- ─── 3. A quién avisar ───
create or replace function public.usuarios_aviso_renovacion(p_espera interval default interval '2 hours')
returns table (usuario_id uuid, membresia_id uuid, nombre text, telefono text)
language sql
stable
security definer
set search_path to 'public'
as $$
  with ultima as (
    -- Última membresía con tokens (las de 0 tokens no son planes de entrenamiento).
    select distinct on (m.usuario_id)
           m.usuario_id,
           m.id as membresia_id,
           least(coalesce(m.tokens_agotados_at, 'infinity'::timestamptz), m.fecha_vencimiento) as sin_plan_desde
      from public.membresia m
     where m.tokens_totales > 0
     order by m.usuario_id, m.fecha_vencimiento desc, m.created_at desc
  )
  select u.id, ul.membresia_id, u.nombre::text, u.telefono::text
    from public.usuario u
    left join ultima ul on ul.usuario_id = u.id
   where u.rol = 'jugador'
     and nullif(btrim(u.telefono), '') is not null
     and not public.usuario_tiene_membresia_vigente(u.id)
     -- Congelada o comprada para empezar más adelante: sigue teniendo plan.
     and not exists (
       select 1 from public.membresia m
        where m.usuario_id = u.id
          and (m.congelada or m.fecha_inicio > now())
     )
     and (
       (ul.membresia_id is null and u.created_at at time zone 'UTC' <= now() - p_espera)
       or ul.sin_plan_desde <= now() - p_espera
     )
     and not exists (
       select 1 from public.aviso_renovacion a
        where a.usuario_id = u.id
          and a.membresia_id is not distinct from ul.membresia_id
     )
   -- Primero los que nunca compraron un plan.
   order by (ul.membresia_id is null) desc, u.created_at;
$$;

revoke all on function public.usuarios_aviso_renovacion(interval) from public, anon, authenticated;
grant execute on function public.usuarios_aviso_renovacion(interval) to service_role;
