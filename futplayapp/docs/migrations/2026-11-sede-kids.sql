-- Kids pasa de "tipo de clase" (clase.tipo_evento = 'kids') a SEDE.
--
-- Una clase es Kids si su sede tiene es_kids = true. Las reglas no cambian:
--   plan Kids   → solo reserva clases de la sede Kids
--   plan normal → no puede reservar clases de la sede Kids
-- El valor 'kids' sigue existiendo en el enum tipo_evento (Postgres no permite
-- borrarlo sin recrear el tipo), pero un CHECK impide volver a usarlo.

-- 1. Marca de sede Kids y la sede
alter table public.sede add column if not exists es_kids boolean not null default false;

insert into public.sede (nombre, es_kids)
select 'Kids', true
where not exists (select 1 from public.sede where es_kids);

-- 2. Las clases Kids existentes pasan a la sede Kids como entrenamiento
update public.clase
   set sede_id = (select id from public.sede where es_kids limit 1),
       tipo_evento = 'entrenamiento'
 where tipo_evento = 'kids';

alter table public.clase drop constraint if exists clase_tipo_evento_no_kids;
alter table public.clase add constraint clase_tipo_evento_no_kids check (tipo_evento <> 'kids');

-- 3. Regla plan ↔ clase según la sede (antes según tipo_evento)
CREATE OR REPLACE FUNCTION public.manejar_inscripcion_clase()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_clase      clase%ROWTYPE;
    v_membresia  membresia%ROWTYPE;
    v_es_partido boolean;
    v_es_kids    boolean;
    v_tipo_plan  text;
BEGIN
    SELECT * INTO v_clase FROM clase WHERE id = NEW.clase_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Clase no encontrada';
    END IF;

    v_es_partido := coalesce(v_clase.tipo_evento = 'partido', false);
    v_es_kids := coalesce((SELECT es_kids FROM sede WHERE id = v_clase.sede_id), false);

    IF v_es_partido THEN
        SELECT * INTO v_membresia
        FROM membresia
        WHERE usuario_id = NEW.usuario_id
          AND congelada = false
          AND fecha_inicio <= now()
          AND fecha_vencimiento >= now()
          AND (estado = true OR sin_tokens = true)
        ORDER BY (estado = true AND NOT sin_tokens) DESC, fecha_vencimiento DESC
        LIMIT 1
        FOR UPDATE;
    ELSE
        SELECT * INTO v_membresia
        FROM membresia
        WHERE usuario_id = NEW.usuario_id
          AND estado = true
          AND congelada = false
          AND fecha_inicio <= now()
          AND fecha_vencimiento >= now()
        ORDER BY fecha_vencimiento DESC
        LIMIT 1
        FOR UPDATE;
    END IF;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No tienes membresía activa';
    END IF;

    SELECT coalesce(tipo_plan::text, 'normal') INTO v_tipo_plan
    FROM plan WHERE id = v_membresia.plan_id;

    IF v_tipo_plan = 'kids' AND NOT v_es_kids THEN
        RAISE EXCEPTION 'Tu plan Kids solo permite reservar clases de la sede Kids';
    END IF;
    IF v_tipo_plan = 'normal' AND v_es_kids THEN
        RAISE EXCEPTION 'Las clases de la sede Kids son exclusivas para el plan Kids';
    END IF;

    IF NOT v_es_partido THEN
        IF (v_membresia.tokens_totales - v_membresia.tokens_usados) <= 0 THEN
            RAISE EXCEPTION 'No tienes tokens disponibles';
        END IF;

        UPDATE membresia
           SET tokens_usados = tokens_usados + 1,
               sin_tokens   = (tokens_usados + 1 >= tokens_totales),
               estado       = CASE WHEN tokens_usados + 1 >= tokens_totales
                                   THEN false ELSE estado END
         WHERE id = v_membresia.id;
    END IF;

    RETURN NEW;
END;
$function$;
