-- Auditoría 2026-10: al borrar una clase, el trigger devolvía un token a TODO
-- inscrito cuya asistencia no fuera 'cancelado'. Eso incluía:
--   - cancelado_sin_reembolso: el alumno ya había perdido el token por cancelar tarde;
--   - asistio / no_asistio: clases ya realizadas, el token se consumió.
-- Borrar una clase pasada (p. ej. limpiando el calendario) regalaba tokens.
--
-- Ahora solo se devuelve a inscripciones aún activas (sin_confirmar,
-- pendiente, confirmado_whatsapp o NULL) y solo si la clase no ha ocurrido.
-- Código asociado: DELETE /api/admin/clases (conteo de tokens a devolver).

create or replace function public.devolver_tokens_al_borrar_clase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare r record;
begin
  if coalesce(old.tipo_evento::text, '') = 'partido' then return old; end if;

  -- Clase ya realizada: los tokens se consumieron; no hay nada que devolver.
  if old.fecha_hora is not null and old.fecha_hora <= now() then return old; end if;

  for r in
    select usuario_id, asistencia from public.clase_usuario
    where clase_id = old.id
      and (asistencia is null or asistencia in ('sin_confirmar', 'pendiente', 'confirmado_whatsapp'))
  loop
    if not public.devolver_token(r.usuario_id) then
      insert into public.tokens_no_devueltos (clase_id, usuario_id, asistencia, motivo)
      values (old.id, r.usuario_id, r.asistencia, 'Sin membresía vigente con tokens usados al borrar la clase');
    end if;
  end loop;
  return old;
end
$$;
