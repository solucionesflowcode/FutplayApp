-- Auditoría 2026-10: las políticas de profesor sobre clase_usuario no se
-- restringían a sus clases. "Profesor gestiona asistencia" era FOR ALL, así que
-- cualquier profesor podía insertar, borrar o editar inscripciones de CUALQUIER
-- clase (de cualquier alumno) vía REST.
--
-- El frontend del profesor (src/data/profesor-clases.ts) solo hace UPDATE de
-- `asistencia` en sus propias clases (isMine). Las operaciones de admin pasan
-- por API con service_role y no dependen de estas políticas.

begin;

drop policy if exists "Profesor gestiona asistencia" on public.clase_usuario;
drop policy if exists "Profesor actualiza asistencia" on public.clase_usuario;

create policy "Profesor actualiza asistencia de sus clases"
  on public.clase_usuario
  for update
  to authenticated
  using (
    exists (
      select 1 from public.clase c
      where c.id = clase_usuario.clase_id
        and c.profesor_id = (select auth.uid())
    )
  )
  with check (
    asistencia is not null
    and exists (
      select 1 from public.clase c
      where c.id = clase_usuario.clase_id
        and c.profesor_id = (select auth.uid())
    )
  );

commit;

-- La lectura se mantiene: "Profesor: Ver alumnos inscritos" (SELECT, profesor
-- o administrador). Verificación:
-- select policyname, cmd from pg_policies where tablename = 'clase_usuario';
