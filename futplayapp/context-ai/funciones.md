> Funciones del esquema `public`. Actualizadas post-migración (2026-06): se eliminó la tabla `horario`, `clase.fecha_hora` reemplaza a `horario.fecha_hora`.

---

### check_is_staff

```sql
CREATE OR REPLACE FUNCTION public.check_is_staff()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN (
    SELECT (rol = 'administrador' OR rol = 'profesor')
    FROM public.usuario
    WHERE id = auth.uid()
  );
END;
$function$
```

---

### check_membresia_activa

```sql
CREATE OR REPLACE FUNCTION public.check_membresia_activa()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM public.membresia 
        WHERE usuario_id = NEW.usuario_id 
        AND date_trunc('month', mes) = date_trunc('month', NEW.mes)
        AND (estado = true OR estado IS NULL)
    ) THEN
        RAISE EXCEPTION 'Ya existe un plan registrado para este periodo.';
    END IF;
    RETURN NEW;
END;
$function$
```

---

### get_proxima_clase

```sql
CREATE OR REPLACE FUNCTION public.get_proxima_clase(p_usuario_id uuid)
 RETURNS TABLE(titulo text, descripcion text, fecha_hora timestamp without time zone, sede text)
 LANGUAGE sql
AS $function$
SELECT
  c.titulo,
  c.descripcion,
  c.fecha_hora,
  s.nombre
FROM clase_usuario cu
JOIN clase c ON cu.clase_id = c.id
JOIN sede s ON c.sede_id = s.id
WHERE cu.usuario_id = p_usuario_id
AND c.fecha_hora > NOW()
ORDER BY c.fecha_hora ASC
LIMIT 1;
$function$
```

> **Cambio post-migración**: anteriormente usaba `JOIN horario h ON cu.horario_id = h.id` y `JOIN clase c ON h.clase_id = c.id`. Ahora usa `cu.clase_id → clase.id` y `clase.fecha_hora` directamente.

---

### handle_new_user

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into public.usuario (id, nombre, email, rol)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      new.email
    ),
    new.email,
    'jugador'
  );
  return new;
end;
$function$
```

---

### inscribir_usuario_clase

```sql
CREATE OR REPLACE FUNCTION public.inscribir_usuario_clase(p_usuario_id uuid, p_clase_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
  insert into clase_usuario (usuario_id, clase_id)
  values (p_usuario_id, p_clase_id);
end;
$function$
```

---

### limitar_15_alumnos

```sql
CREATE OR REPLACE FUNCTION public.limitar_15_alumnos()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  capacidad_maxima integer;
  inscritos integer;
BEGIN
  SELECT cupo_maximo INTO capacidad_maxima FROM clase WHERE id = NEW.clase_id;
  SELECT COUNT(*) INTO inscritos FROM clase_usuario WHERE clase_id = NEW.clase_id;
  IF inscritos >= capacidad_maxima THEN
    RAISE EXCEPTION 'La clase ya alcanzó su capacidad máxima';
  END IF;
  RETURN NEW;
END;
$function$
```

---

### manejar_inscripcion_clase

```sql
CREATE OR REPLACE FUNCTION public.manejar_inscripcion_clase()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  tokens_disponibles int;
  membresia_actual record;
begin
  select * into membresia_actual
  from membresia
  where usuario_id = new.usuario_id
    and date_trunc('month', mes) = date_trunc('month', current_date)
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
$function$
```

---

### procesar_boleta_pagada

```sql
CREATE OR REPLACE FUNCTION public.procesar_boleta_pagada()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  item record;
  usuario uuid;
  mes_actual date;
begin
  if new.estado = 'pagado' and old.estado <> 'pagado' then
    usuario := new.usuario_id;
    mes_actual := date_trunc('month', current_date);
    for item in
      select * from boleta_item where boleta_id = new.id
    loop
      if item.plan_id is not null then
        insert into membresia (usuario_id, plan_id, mes, tokens_totales, tokens_usados)
        select usuario, p.id, mes_actual, p.tokens_mensuales, 0
        from plan p where p.id = item.plan_id;
      end if;
      if item.producto_id is not null then
        if exists (select 1 from producto where id = item.producto_id and tipo = 'token_extra') then
          update membresia
          set tokens_totales = tokens_totales + item.cantidad
          where usuario_id = usuario and date_trunc('month', mes) = mes_actual;
        end if;
      end if;
    end loop;
  end if;
  return new;
end;
$function$
```
