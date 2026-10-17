-- Seguridad (oct-2026): un usuario solo puede editar sus datos personales.
--
-- Problema: usuario tenía grants a nivel de tabla para anon/authenticated y la
-- política "Actualizar propio perfil" (auth.uid() = id) no limita columnas, así
-- que cualquier usuario con sesión podía hacer, directo contra la API de
-- Supabase:  update usuario set rol = 'administrador' where id = auth.uid()
-- y con eso pasar las políticas de admin de membresia, plan, boleta, etc.
-- También podía cambiarse sede_id, email o foto_url.
--
-- Arreglo: se quitan los permisos de escritura a nivel de tabla y se vuelven a
-- dar solo para las columnas que el propio usuario edita (Mi Perfil y el paso
-- de RUT/teléfono de la ficha médica). Todo lo demás (rol, sede, email, foto,
-- altas y bajas) lo escribe el servidor con la service role, que no se ve
-- afectada, igual que el trigger handle_new_user (security definer).
-- Revocar el privilegio de tabla también revoca los de columna, por eso el
-- grant va después.

revoke insert, update, delete, truncate on public.usuario from anon, authenticated;

grant update (nombre, rut, telefono) on public.usuario to authenticated;

-- posicion la crea 2026-10-usuario-posicion.sql (que también la habilita);
-- aquí se cubre el caso de que esa migración se aplique primero.
do $$
begin
    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'usuario' and column_name = 'posicion'
    ) then
        grant update (posicion) on public.usuario to authenticated;
    end if;
end $$;

-- Verificación (debe dar rol_upd = false, nombre_upd = true):
-- select has_column_privilege('authenticated', 'public.usuario', 'rol', 'UPDATE') as rol_upd,
--        has_column_privilege('authenticated', 'public.usuario', 'nombre', 'UPDATE') as nombre_upd;
