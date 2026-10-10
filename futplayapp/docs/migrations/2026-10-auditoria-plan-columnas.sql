-- Auditoría 2026-10: los códigos de acceso de planes familiares/liga eran
-- legibles por cualquier usuario autenticado vía REST
-- (GET /rest/v1/plan?select=codigo_acceso), lo que permitía comprarlos sin el
-- link del admin.
--
-- En Postgres un REVOKE por columna no tiene efecto mientras exista el GRANT
-- de la tabla completa, así que se revoca el SELECT de la tabla y se vuelve a
-- conceder solo sobre las columnas públicas. La escritura sigue protegida por
-- RLS ("Ventas: Solo admin gestiona precios") y las rutas admin usan
-- service_role, que no se ve afectado.
--
-- Código asociado: src/lib/plan-columnas.ts (PLAN_COLUMNAS_PUBLICAS). Desplegar
-- el código ANTES de aplicar esta migración: con el permiso revocado,
-- select("*") sobre plan falla para usuarios.

begin;

revoke select on public.plan from anon, authenticated;

grant select (id, nombre, precio, tokens_mensuales, dias, dias_vigencia,
              tipo_plan, activo, created_at, updated_at)
  on public.plan to anon, authenticated;

commit;

-- Verificación (debe devolver 0 filas):
-- select grantee, column_name from information_schema.column_privileges
--  where table_schema = 'public' and table_name = 'plan'
--    and column_name in ('codigo_acceso', 'codigo_acceso_hash')
--    and privilege_type = 'SELECT' and grantee in ('anon', 'authenticated');
