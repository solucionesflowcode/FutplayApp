-- FASE A - Fix límite de alumnos: respeta cupo_maximo y excluye cancelados; + SECURITY DEFINER
-- El bug "0/18 llena" se debía a que limita_15_alumnos() corría bajo rol autenticado
-- con RLS activo en clase_usuario, por lo que count(*) solo veía las filas del propio usuario.
-- Se añade SECURITY DEFINER (con set search_path = public) para contar TODAS las inscripciones.

CREATE OR REPLACE FUNCTION public.limitar_15_alumnos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cupo int;
    v_contador int;
BEGIN
    SELECT COALESCE(cupo_maximo, 15) INTO v_cupo FROM clase WHERE id = NEW.clase_id;

    SELECT count(*) INTO v_contador
    FROM clase_usuario
    WHERE clase_id = NEW.clase_id
      AND asistencia IS DISTINCT FROM 'cancelado'
      AND asistencia IS DISTINCT FROM 'cancelado_sin_reembolso';

    IF v_contador >= v_cupo THEN
        RAISE EXCEPTION 'Clase llena (%) / cupo %', v_contador, v_cupo;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_limite_15 ON public.clase_usuario;
CREATE TRIGGER trigger_limite_15
BEFORE INSERT ON public.clase_usuario
FOR EACH ROW EXECUTE FUNCTION public.limitar_15_alumnos();
