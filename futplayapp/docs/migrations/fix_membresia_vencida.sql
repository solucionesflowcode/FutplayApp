-- FIX - Expiración automática de membresías VENCIDAS (estado=false + tokens agotados)
--
-- Problema:
--   - Ninguna capa de datos ponía `estado = false` al vencer. El único intento era
--     `getMembresiaByUser()` desde el navegador, que era BLOQUEADO por RLS
--     (la tabla `membresia` no tiene policy de UPDATE), así que el error se ignoraba
--     y el estado quedaba `true` para siempre (ej: alumno con membresía vencida hace
--     días/meses pero `estado=true` en DB).
--   - El front-end calculaba `tokens_restantes` ignorando `estado`/`fecha_vencimiento`,
--     por lo que un alumno vencido seguía "viendo" sus tokens sobrantes.
--
-- Regla de negocio (consistente con manejar_inscripcion_clase(), devolver_token(),
-- inscribir/route.ts y membresiaActiva()):
--   Una membresía está ACTIVA solo si: estado = true AND fecha_inicio <= now() <= fecha_vencimiento.
--   Al vencer: estado = false y restantes de tokens = 0 (tokens_usados = tokens_totales).
--
-- Este script:
--   1) Función + trigger que normalizan cualquier INSERT/UPDATE de una fila vencida.
--   2) Backfill one-time para todas las membresías ya vencidas.
--   3) Barrido diario con pg_cron (el trigger solo actúa cuando la fila se escribe).
--
-- Ejecutar en el SQL Editor de Supabase. Idempotente (se puede re-ejecutar).

-- ── 1) Función + trigger: normaliza al escribir ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.sincronizar_estado_membresia()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
begin
  if NEW.fecha_vencimiento < now() then
    NEW.estado := false;
    NEW.tokens_usados := NEW.tokens_totales;
  end if;
  return NEW;
end;
$function$;

DROP TRIGGER IF EXISTS trg_membresia_sincronizar_estado ON public.membresia;
CREATE TRIGGER trg_membresia_sincronizar_estado
  BEFORE INSERT OR UPDATE OF fecha_vencimiento, estado
  ON public.membresia
  FOR EACH ROW
  EXECUTE FUNCTION public.sincronizar_estado_membresia();

-- ── 2) Backfill one-time: membresías ya vencidas ───────────────────────────────
UPDATE public.membresia
   SET estado = false,
       tokens_usados = tokens_totales
 WHERE fecha_vencimiento < now()
   AND (estado = true OR tokens_usados < tokens_totales);

-- ── 3) Barrido diario con pg_cron (paso del tiempo sin escritura de la fila) ────
-- El horario de pg_cron es UTC: "0 9 * * *" = ~05:00/06:00 hora de Chile (CLT/CLST).
-- Si pg_cron no está habilitado (Dashboard > Database > Extensions), el backfill
-- y el trigger de arriba ya quedaron aplicados; solo el barrido automático faltaría.
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'futplay-expirar-membresias';
    PERFORM cron.schedule(
        'futplay-expirar-membresias',
        '0 9 * * *',
        $cron$
        UPDATE public.membresia
           SET estado = false,
               tokens_usados = tokens_totales
         WHERE fecha_vencimiento < now()
           AND (estado = true OR tokens_usados < tokens_totales);
        $cron$
    );
    RAISE NOTICE 'OK: job pg_cron "futplay-expirar-membresias" programado (09:00 UTC, diario)';
EXCEPTION WHEN others THEN
    RAISE NOTICE 'AVISO: pg_cron no disponible (%). Backfill + trigger ya aplicados. Actívalo en Dashboard > Extensions para el barrido diario.', SQLERRM;
END $$;
