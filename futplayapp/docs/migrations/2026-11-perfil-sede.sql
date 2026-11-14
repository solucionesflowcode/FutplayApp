-- El alumno puede elegir su sede desde "Mi perfil".
--
-- Los usuarios autenticados solo podían actualizar nombre, rut y telefono de su
-- fila (permisos por columna, para que no se cambien el rol). Faltaba posicion:
-- el formulario de perfil la manda siempre, así que guardar el perfil fallaba
-- con "permission denied for table usuario". Se agregan posicion y sede_id.
-- La política "Actualizar propio perfil" sigue limitando a la fila propia, y
-- trg_proteger_rol_usuario sigue impidiendo cambiar el rol.
grant update (posicion, sede_id) on public.usuario to authenticated;
