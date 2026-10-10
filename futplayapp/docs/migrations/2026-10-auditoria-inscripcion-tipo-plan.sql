-- Auditoría 2026-10: la compatibilidad plan ↔ tipo de clase (plan Kids solo
-- clases Kids; plan normal no puede clases Kids) solo se validaba en
-- /api/clases/inscribir. La política RLS "Jugador se inscribe" permite insertar
-- en clase_usuario directo por REST, saltándose esa validación. Se mueve al
-- trigger de inscripción, que corre siempre.
--
-- Mismo comportamiento que antes en todo lo demás (validación de membresía,
-- tokens y partidos). Mensajes iguales a los de la API.

create or replace function public.manejar_inscripcion_clase()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
    v_clase      clase%ROWTYPE;
    v_membresia  membresia%ROWTYPE;
    v_es_partido boolean;
    v_tipo_plan  text;
BEGIN
    SELECT * INTO v_clase FROM clase WHERE id = NEW.clase_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Clase no encontrada';
    END IF;

    v_es_partido := coalesce(v_clase.tipo_evento = 'partido', false);

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

    -- NUEVO: compatibilidad plan ↔ tipo de clase (antes solo en la API).
    SELECT coalesce(tipo_plan::text, 'normal') INTO v_tipo_plan
    FROM plan WHERE id = v_membresia.plan_id;

    IF v_tipo_plan = 'kids' AND coalesce(v_clase.tipo_evento::text, '') <> 'kids' THEN
        RAISE EXCEPTION 'Tu plan Kids solo permite reservar clases Kids';
    END IF;
    IF v_tipo_plan = 'normal' AND v_clase.tipo_evento = 'kids' THEN
        RAISE EXCEPTION 'Esa clase es exclusiva para el plan Kids';
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
