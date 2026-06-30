-- Migration: Auto-expire membresias + cascade delete clase_usuario
--
-- Changes:
-- 1. Update expired membresias to estado = false
-- 2. Delete pending clase_usuario for users with no active membership
-- 3. Trigger: clean up enrollments when membresia expires or is deleted
-- 4. Update manejar_inscripcion_clase to check estado = true

-- 1. One-time: mark expired membresias as inactive
UPDATE membresia SET estado = false
WHERE (estado IS NULL OR estado = true)
  AND fecha_vencimiento < (now() AT TIME ZONE 'America/Santiago')::timestamptz;

-- 2. One-time: delete pending enrollments for users without active membership
DELETE FROM clase_usuario cu
WHERE (cu.asistencia IS NULL OR cu.asistencia = 'sin_confirmar')
  AND NOT EXISTS (
    SELECT 1 FROM membresia m
    WHERE m.usuario_id = cu.usuario_id AND m.estado = true
  );

-- 3. Trigger function: clean up pending enrollments when membresia expires or is deleted
CREATE OR REPLACE FUNCTION public.limpiar_inscripciones_al_vencer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  DELETE FROM clase_usuario
  WHERE usuario_id = OLD.usuario_id
    AND (asistencia IS NULL OR asistencia = 'sin_confirmar');
  RETURN OLD;
END;
$function$;

-- When estado changes from true to false (membership expires)
CREATE TRIGGER trg_membresia_estado_false
AFTER UPDATE OF estado ON membresia
FOR EACH ROW
WHEN (NEW.estado = false AND (OLD.estado IS NULL OR OLD.estado = true))
EXECUTE FUNCTION public.limpiar_inscripciones_al_vencer();

-- When a membership row is deleted
CREATE TRIGGER trg_membresia_delete
BEFORE DELETE ON membresia
FOR EACH ROW
EXECUTE FUNCTION public.limpiar_inscripciones_al_vencer();

-- 4. DEPRECATED — See supabase/cambiar-mes-a-timestamptz.sql for the canonical version.
--    This version lacks `AT TIME ZONE 'America/Santiago'` and is superseded.
--    Do NOT run this section if cambiar-mes-a-timestamptz.sql has been applied.
