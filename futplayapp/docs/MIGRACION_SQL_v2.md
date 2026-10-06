# Migración SQL v2 — Registro de lo aplicado (FutPlay)

> Reemplaza a `MIGRACION_SQL.md` (v1). **Descarta la v1**: usaba `estado` como texto, el rol `'admin'`, funciones de reserva que duplicaban los triggers reales y columnas de estado en `clase_usuario` que contradicen el diseño de la app.
> Este archivo documenta lo ejecutado entre el 2026-10-05 y el 2026-10-06, en orden, con su verificación y rollback. Todo lo marcado ✅ fue confirmado con resultados de la base real.

## 0. Estado general

| # | Cambio | Estado |
|---|---|---|
| 1 | Respaldo en `backup_20261005` | ✅ |
| 2 | `mock` cerrado a la API; purga de `cron.job_run_details` | ✅ |
| 3 | `devolver_token`: bloqueo de fila y decremento relativo | ✅ |
| 4 | `manejar_inscripcion_clase` y `limitar_15_alumnos` con bloqueo de filas | ✅ |
| 5 | `search_path` fijado en funciones de trigger, `check_is_staff` y `handle_new_user` | ✅ |
| 6 | Planes: trigger de sincronización `dias`/`dias_vigencia`, 3 trimestrales a 90 días, 1 membresía corregida | ✅ |
| 7 | RLS en `comentario`, `documento` y `recurrencia`; `anon` sin acceso | ✅ |
| 8 | Trigger `proteger_rol_usuario` (cierra la escalada de privilegios) | ✅ |
| 9 | Policy de profesor sobre `clase_usuario`: de `ALL` a solo `UPDATE` | ✅ |
| 10 | Fichas médicas: solo administradores | ✅ |
| 11 | Limpieza de reservas pendientes: solo futuras y sin otra membresía vigente | ✅ |
| 12 | RUT: índice único normalizado y check de formato | ✅ |
| 13 | Boletas de prueba anuladas | ✅ |
| 14 | Índices en llaves foráneas | ✅ |
| 15 | Checks validados (`ck_membresia_tokens`, `ck_boleta_total`, `ck_plan_valores`, `ck_producto_precio`, `ck_clase_cupo`) | ✅ |
| 16 | Cambios de código (cancelar, admin/clases) | ⏳ pendiente (ver §3) |
| 17 | Pruebas de la app tras RLS (comentarios, documentos, compra recurrente, registro nuevo) | ⏳ confirmar |
| 18 | Servidor del bot con `SUPABASE_SERVICE_ROLE_KEY` | ⏳ confirmar |

---

## 1. SQL aplicado (referencia exacta)

### 1.1 Respaldo
```sql
create schema if not exists backup_20261005;
do $$ declare r record; begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('create table backup_20261005.%I as table public.%I', r.tablename, r.tablename);
  end loop; end $$;
revoke all on schema backup_20261005 from anon, authenticated;
```
> Contiene copias de datos personales. Eliminar cuando todo esté estable (~30 días): `drop schema backup_20261005 cascade;`

### 1.2 Contención de `mock` y cron
```sql
revoke all on schema mock from anon, authenticated;
revoke all on all tables in schema mock from anon, authenticated;
select cron.schedule('purge-cron-history','0 3 * * *',
  $$ delete from cron.job_run_details where end_time < now() - interval '30 days' $$);
```
`mock` **no se elimina** (decisión: esperar ~30 días de estabilidad).

### 1.3 Funciones de tokens y cupos
Definiciones actuales (con bloqueo) de `devolver_token`, `manejar_inscripcion_clase` y `limitar_15_alumnos`; ver `DOCUMENTACION_BD_v2.md` §5. Ninguna cambió sus textos de `RAISE EXCEPTION` (la app los compara por igualdad exacta).

### 1.4 `search_path`
```sql
alter function public.limpiar_inscripciones_al_vencer() set search_path = public;
alter function public.check_is_staff() set search_path = public;
alter function public.handle_new_user() set search_path = public;
```

### 1.5 Planes
```sql
create or replace function public.mantener_dias_plan_sincronizados()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.dias is not null then new.dias_vigencia := new.dias;
    elsif new.dias_vigencia is not null then new.dias := new.dias_vigencia; end if;
  else
    if new.dias is distinct from old.dias then new.dias_vigencia := new.dias;
    elsif new.dias_vigencia is distinct from old.dias_vigencia then new.dias := new.dias_vigencia; end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_plan_sincronizar_dias on public.plan;
create trigger trg_plan_sincronizar_dias
before insert or update of dias, dias_vigencia on public.plan
for each row execute function public.mantener_dias_plan_sincronizados();

update public.plan set dias = 90
where id in ('138dfe03-c1ed-4f81-9346-687adc724b83','533be91b-f220-4a52-a798-5b8702ee5ed1','60da4176-8a25-491e-bf30-ccd8a04d1b5d')
  and dias_vigencia = 90;

update public.membresia set fecha_vencimiento = fecha_inicio + interval '90 days'
where id = '25326521-b0a8-459a-ae54-35bce021d58a' and fecha_vencimiento = fecha_inicio + interval '30 days';
```
**`dias` es la fuente de verdad** (es lo único que escribe el admin). **No** ejecutar el `UPDATE plan SET dias_vigencia = dias` de `docs/migrations/fix_bugs_inventario.sql:27`: convertiría los trimestrales en mensuales.

### 1.6 RLS en tablas que estaban abiertas
```sql
revoke all on public.comentario, public.documento, public.recurrencia from anon;
alter table public.comentario  enable row level security;
alter table public.documento   enable row level security;
alter table public.recurrencia enable row level security;
-- policies: comentario_leer/crear/editar_propio/borrar_propio, documento_leer,
--           recurrencia_leer_propia/crear_propia/editar_propia  (todas TO authenticated)
```
Rollback por tabla: `alter table public.<tabla> disable row level security;`

### 1.7 Escalada de privilegios
```sql
create or replace function public.proteger_rol_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.rol is distinct from old.rol and auth.uid() is not null
     and not exists (select 1 from public.usuario u where u.id = auth.uid() and u.rol = 'administrador') then
    raise exception 'No autorizado para cambiar el rol';
  end if;
  return new;
end $$;
drop trigger if exists trg_proteger_rol_usuario on public.usuario;
create trigger trg_proteger_rol_usuario before update of rol on public.usuario
for each row execute function public.proteger_rol_usuario();
```
Rollback: `drop trigger trg_proteger_rol_usuario on public.usuario;`

### 1.8 Policies de clase_usuario y ficha_medica
```sql
drop policy if exists "Profesor gestiona asistencia" on public.clase_usuario;
create policy "Profesor actualiza asistencia" on public.clase_usuario for update to authenticated
  using (exists (select 1 from public.usuario u where u.id = (select auth.uid()) and u.rol = 'profesor'))
  with check (asistencia is not null);

drop policy if exists "Staff lee fichas médicas" on public.ficha_medica;
```
Rollbacks en los mensajes originales; resumen: recrear la policy `ALL` del profesor, y la `SELECT` de staff sobre `ficha_medica`.

### 1.9 Limpieza de reservas al vencer
```sql
drop trigger if exists trg_membresia_estado_false on public.membresia;
create trigger trg_membresia_estado_false after update of estado on public.membresia
for each row
when (new.estado = false and (old.estado is null or old.estado = true) and new.sin_tokens is not true)
execute function public.limpiar_inscripciones_al_vencer();

create or replace function public.limpiar_inscripciones_al_vencer()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if exists (select 1 from membresia m where m.usuario_id = old.usuario_id and m.id <> old.id
             and m.estado = true and m.congelada = false and m.fecha_vencimiento >= now()) then
    return old;
  end if;
  delete from clase_usuario cu using clase c
  where c.id = cu.clase_id and cu.usuario_id = old.usuario_id
    and (cu.asistencia is null or cu.asistencia = 'sin_confirmar')
    and c.fecha_hora > now();
  return old;
end $function$;
```
Regla de negocio aprobada: al agotar tokens **no** se borra nada; al vencer sin otra membresía vigente se borran solo reservas futuras pendientes. La definición anterior quedó en `backup_20261005.funciones_previas`.

### 1.10 RUT
```sql
update public.usuario set rut = null where id = '23fa6efe-6a4a-4ca8-a2e5-57b2eb0ad3cb';  -- duplicado (cuenta de prueba)
update public.usuario set rut = null where id = '27574834-3c7e-4a69-aebb-6501256349e3';  -- formato inválido (cuenta de prueba)

create unique index uq_usuario_rut_norm on public.usuario
  (upper(regexp_replace(rut,'[.\-\s]','','g'))) where rut is not null and btrim(rut) <> '';
alter table public.usuario add constraint ck_usuario_rut check (
  rut is null or btrim(rut) = ''
  or upper(regexp_replace(rut,'[.\-\s]','','g')) ~ '^[0-9]{7,8}[0-9K]$');
```
Acepta `12.345.678-9`, `12345678-9` y `123456789`; **no** valida el dígito verificador (el navegador envía el RUT con puntos).

### 1.11 Boletas de prueba e índices
```sql
update public.boleta set estado = 'anulado', updated_at = now()
where id in ('9d163f3b-990f-493f-83cf-7c0b344f10e1','e3309a2f-5d2a-4a05-a715-3d79b112c152')
  and estado = 'pagado' and not exists (select 1 from public.boleta_item i where i.boleta_id = boleta.id);
-- + 17 índices ix_*_<columna> sobre llaves foráneas que no tenían índice
```

---

## 2. Objetos que quedaron de la migración v1 (decidir)

La v1 se ejecutó parcialmente antes de detectar los conflictos. Se revirtió lo peligroso. Quedan **sin uso por la app**:

| Objeto | Acción sugerida |
|---|---|
| `plan.activo`, `plan.codigo_acceso_hash` | Inofensivos (defaults). Eliminar si no se usarán. |
| `sede.direccion`, `ciudad`, `zona_horaria`, `activa` | Inofensivos. Útiles si se quiere mostrar la ubicación. |
| `recurrencia.proveedor_ref`, `proxima_cobranza`, `cancelada_at`, `fallos_consecutivos` | Inofensivos. |
| `created_at`/`updated_at` agregados a varias tablas | Inofensivos; verificar con la consulta de §4. |
| Índices únicos `uq_boleta_transaccion`, `uq_membresia_boleta_plan` | **Mantener.** `uq_membresia_boleta_plan` solo aplica cuando hay boleta (los planes regalados no la tienen). |
| Constraints `ck_*` (validados) | Mantener. Aceptan NULL. |
| Constraints/columnas `estado`, `cancelada_at`, `membresia_id` en `clase_usuario` y `estado`, `costo_tokens`, `duracion_min` en `clase` | **Revertidas** (se eliminaron). |
| `ck_item_xor` y `ck_item_valores` en `boleta_item` | **Eliminados** (podían rechazar en silencio filas del webhook). |
| `uq_clase_usuario_vigente` | Eliminado con la columna `estado`. Sin reemplazo: no existen duplicados activos hoy, pero nada lo impide. |

Eliminar columnas sin uso (opcional):
```sql
alter table public.plan drop column if exists activo, drop column if exists codigo_acceso_hash;
```

---

## 3. Cambios de código pendientes

Ver el mensaje de las 18:03 (martes) con el detalle. Resumen:

| Archivo | Cambio | Riesgo que cierra |
|---|---|---|
| `src/app/api/clases/cancelar/route.ts` | Leer `fecha_hora` real de la clase; `UPDATE` condicionado a `sin_confirmar`/`pendiente`; token solo si ganó la carrera | Cancelar con hora falsificada; doble reembolso por doble clic |
| `src/app/api/admin/clases/route.ts` `DELETE` | Devolver tokens solo a pendientes de clases futuras | Tokens regalados al borrar clases pasadas |
| `src/app/api/admin/clases/route.ts` `PATCH` `registrar-asistencia` | Revisar el error; no revivir inscripciones canceladas | `success:true` aunque falle; token consumido en silencio |
| `src/app/api/clases/inscribir/route.ts` | Normalizar `Clase llena (n) / cupo n` a la clave `Clase llena` | Texto crudo al usuario |
| `src/app/api/flow/webhook/route.ts` | Revisar el error del `insert` de `boleta_item` antes de marcar `pagado` | Boleta pagada sin ítems (riesgo latente) |
| `src/utils/fecha.ts` (`ahoraChile`) | Usar `new Date()` para `fecha_inicio` y `membresiaActiva` | Membresías de Flow que vencen 3 h antes |

Tras los cambios: `npm test`; ajustar mocks de `cancelar.test.ts`, `admin/clases.test.ts`, `inscribir.test.ts` si fallan por `.in(...)`/`.select()` encadenados.

---

## 4. Verificación final (una sola consulta)

```sql
select 'rls_apagado' as chequeo, coalesce(string_agg(tablename, ', '), 'ninguna') as resultado
from pg_tables where schemaname = 'public' and not rowsecurity
union all select 'triggers_clave', string_agg(tgname, ', ' order by tgname) from pg_trigger
  where not tgisinternal and tgname in ('trigger_inscripcion','trigger_limite_15','trg_membresia_delete',
    'trg_membresia_estado_false','trg_membresia_sincronizar_estado','trg_plan_sincronizar_dias','trg_proteger_rol_usuario')
union all select 'planes_divergentes', count(*)::text from public.plan where dias is distinct from dias_vigencia
union all select 'checks_sin_validar', count(*)::text from pg_constraint
  where connamespace = 'public'::regnamespace and not convalidated
union all select 'anon_con_acceso', coalesce(string_agg(table_name, ', '), 'ninguna')
  from information_schema.role_table_grants where table_schema = 'public' and grantee = 'anon' and privilege_type = 'SELECT'
  and table_name not in ('clase','sede','plan','categoria','producto')
union all select 'backup_visible_api', (has_schema_privilege('anon','backup_20261005','usage')
  or has_schema_privilege('authenticated','backup_20261005','usage'))::text
union all select 'clase_backup_en_public', count(*)::text from pg_tables where schemaname='public' and tablename='clase_backup_fechas'
union all select 'columnas_residuales', coalesce(string_agg(table_name||'.'||column_name, ', '), 'ninguna')
  from information_schema.columns where table_schema='public' and (
    (table_name='clase_usuario' and column_name in ('estado','cancelada_at','membresia_id'))
    or (table_name='clase' and column_name in ('estado','costo_tokens','duracion_min')));
```
Esperado: `rls_apagado = ninguna` (o solo tablas intencionales), los 7 triggers, `planes_divergentes = 0`, `checks_sin_validar = 0`, `backup_visible_api = false`, `clase_backup_en_public = 0`, `columnas_residuales = ninguna`.

> Nota: `clase_usuario.membresia_id` existía antes en la base (la FK `clase_usuario_membresia_id_fkey` aparecía en el catálogo del 05-oct). Si la consulta la reporta, **no la elimines sin revisar** si la app la usa: `Buscar "membresia_id"`.

## 5. Pruebas manuales de cierre

1. Registrar un usuario nuevo desde cero (valida `handle_new_user` y la policy de `usuario`).
2. Comentario: ver y publicar. Documento de cápsula: abrirlo.
3. Comprar un plan con cobro recurrente y cancelarlo.
4. Cancelar una clase con doble clic (el token vuelve una sola vez).
5. Profesor: marcar asistencia; no debe ver fichas médicas.
6. Administrador: ver todas las fichas, cambiar el rol de un usuario.
7. Jugador: intentar `update usuario set rol='administrador'` desde la consola del navegador → debe fallar.
8. Editar el perfil con RUT con puntos, sin puntos y vacío.
