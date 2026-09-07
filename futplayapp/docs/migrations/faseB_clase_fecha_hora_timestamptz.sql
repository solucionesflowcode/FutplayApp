-- FASE B - Migrar clase.fecha_hora a timestamptz (Chile) con backup
-- Los valores existentes eran NAIVE (sin zona horaria), interpretados localmente.
-- Se convierten a instante absoluto asumiendo zona horaria Chile (America/Santiago),
-- y se respalda la tabla original en clase_backup_fechas.

CREATE TABLE IF NOT EXISTS public.clase_backup_fechas AS
SELECT id, fecha_hora FROM public.clase;

ALTER TABLE public.clase
ALTER COLUMN fecha_hora TYPE timestamptz
USING fecha_hora AT TIME ZONE 'America/Santiago';
