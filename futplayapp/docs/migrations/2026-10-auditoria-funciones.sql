-- Auditoría 2026-10: endurecimiento de funciones (avisos del linter de Supabase)
-- y arreglo de usuario_tiene_membresia_vigente para la UI.

begin;

-- 1) Funciones TRIGGER SECURITY DEFINER invocables por RPC (anon/authenticated).
--    Postgres solo exige EXECUTE al CREAR el trigger, no al dispararse: revocar
--    no afecta a los triggers y evita llamarlas por /rest/v1/rpc.
revoke execute on function public.bloquear_regalo_con_membresia_vigente() from public, anon, authenticated;
revoke execute on function public.devolver_tokens_al_borrar_clase()       from public, anon, authenticated;
revoke execute on function public.handle_new_user()                       from public, anon, authenticated;
revoke execute on function public.proteger_rol_usuario()                  from public, anon, authenticated;
revoke execute on function public.mantener_dias_plan_sincronizados()      from public, anon, authenticated;
-- check_is_staff() se mantiene: la usan políticas RLS evaluadas como el usuario.

-- 2) Funciones huérfanas (sin uso en código ni triggers). check_membresia_activa
--    además referencia la columna `mes`, que ya no existe.
drop function if exists public.check_membresia_activa();
drop function if exists public.get_proxima_clase(uuid);
drop function if exists public.inscribir_usuario_clase(uuid, uuid);

-- 3) usuario_tiene_membresia_vigente: /planes y /pagos la llaman desde el
--    navegador (tieneMembresiaPagos) para mostrar "Ya tienes un plan activo",
--    pero authenticated no tenía EXECUTE: la llamada fallaba y la UI nunca
--    bloqueaba (el servidor sí, con 409). Se concede EXECUTE y se limita a
--    consultar la PROPIA membresía (o staff / service_role, auth.uid() null).
create or replace function public.usuario_tiene_membresia_vigente(p_usuario_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.membresia m
    where m.usuario_id = p_usuario_id
      and (auth.uid() is null or auth.uid() = p_usuario_id or public.check_is_staff())
      and m.estado = true
      and m.fecha_inicio <= now() and m.fecha_vencimiento >= now()
      and m.tokens_usados < m.tokens_totales
  );
$$;

revoke execute on function public.usuario_tiene_membresia_vigente(uuid) from public, anon;
grant execute on function public.usuario_tiene_membresia_vigente(uuid) to authenticated;

commit;

-- Pendiente manual (panel de Supabase → Authentication → Policies):
-- activar "Leaked password protection".
