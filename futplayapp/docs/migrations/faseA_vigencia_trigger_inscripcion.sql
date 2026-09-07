-- FASE A - Trigger de inscripción por VIGENCIA (no por mes) + consumo de token por tipo de clase
-- Reescribe manejar_inscripcion_clase() para:
--   1) Validar membresía ACTIVA por vigencia
--      (estado=true AND fecha_inicio <= now() AND fecha_vencimiento >= now())
--   2) Descontar 1 token SOLO si la clase consume token
--      (tipo_evento <> 'partido'; los partidos no descuentan)
--   3) Contabilidad consistente con devolver_token(): incrementa tokens_usados
--      (restantes = tokens_totales - tokens_usados)

CREATE OR REPLACE FUNCTION public.manejar_inscripcion_clase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clase clase%ROWTYPE;
    v_membresia membresia%ROWTYPE;
BEGIN
    -- Cargar la clase
    SELECT * INTO v_clase FROM clase WHERE id = NEW.clase_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Clase no encontrada';
    END IF;

    -- Cargar membresía ACTIVA por vigencia (estado=true y fecha vigente)
    SELECT * INTO v_membresia
    FROM membresia
    WHERE usuario_id = NEW.usuario_id
      AND estado = true
      AND fecha_inicio <= now()
      AND fecha_vencimiento >= now()
    ORDER BY fecha_vencimiento DESC
    LIMIT 1;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No tienes membresía activa';
    END IF;

    -- Descontar token SOLO si la clase no es partido (los partidos no consumen token)
    IF v_clase.tipo_evento <> 'partido' THEN
        IF (v_membresia.tokens_totales - v_membresia.tokens_usados) <= 0 THEN
            RAISE EXCEPTION 'No tienes tokens disponibles';
        END IF;
        UPDATE membresia
           SET tokens_usados = tokens_usados + 1
         WHERE id = v_membresia.id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_inscripcion ON public.clase_usuario;
CREATE TRIGGER trigger_inscripcion
BEFORE INSERT ON public.clase_usuario
FOR EACH ROW EXECUTE FUNCTION public.manejar_inscripcion_clase();
