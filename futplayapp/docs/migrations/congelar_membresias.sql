-- CONGELAR MEMBRESÍAS - Pausar el tiempo de un plan (solo admin)
--
-- Regla de negocio:
--   - Una membresía puede estar: Activa / Congelada / Inactiva (vencida o desactivada).
--   - Solo el admin puede congelar/reactivar, y solo membresías ACTIVAS y VIGENTES
--     (estado=true AND fecha_inicio <= now() <= fecha_vencimiento, no congelada).
--   - Al congelar: congelada=true, fecha_congelamiento=now(). El tiempo deja de correr
--     (no expira en el barrido diario ni en el trigger) y el jugador no puede reservar
--     clases ni gastar tokens.
--   - Al reactivar: nuevo fecha_vencimiento = fecha_vencimiento + (now - fecha_congelamiento);
--     congelada=false, fecha_congelamiento=null. Se conservan exactamente los días restantes.
--   - Los triggers/búsquedas de vigencia (manejar_inscripcion_clase, devolver_token)
--     tratan a una membresía congelada como NO activa.
--
-- Ejecutar en el SQL Editor de Supabase. Idempotente (se puede re-ejecutar).

-- ── 1) Columnas nuevas ─────────────────────────────────────────────────────────
ALTER TABLE public.membresia
  ADD COLUMN IF NOT EXISTS congelada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_congelamiento timestamptz NULL;

COMMENT ON COLUMN public.membresia.congelada IS 'Membresía congelada por admin: el tiempo no corre y no puede usarse.';
COMMENT ON COLUMN public.membresia.fecha_congelamiento IS 'Momento en que se congeló; al reactivar se suma la duración del congelamiento a fecha_vencimiento.';

-- ── 2) Trigger de expiración: NO expirar membresías congeladas ─────────────────
CREATE OR REPLACE FUNCTION public.sincronizar_estado_membresia()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
begin
  if NEW.fecha_vencimiento < now() and not coalesce(NEW.congelada, false) then
    NEW.estado := false;
    NEW.tokens_usados := NEW.tokens_totales;
  end if;
  return NEW;
end;
$function$;

DROP TRIGGER IF EXISTS trg_membresia_sincronizar_estado ON public.membresia;
CREATE TRIGGER trg_membresia_sincronizar_estado
  BEFORE INSERT OR UPDATE OF fecha_vencimiento, estado, congelada
  ON public.membresia
  FOR EACH ROW
  EXECUTE FUNCTION public.sincronizar_estado_membresia();

-- ── 3) Barrido diario con pg_cron: ignorar congeladas ──────────────────────────
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
           AND congelada = false
           AND (estado = true OR tokens_usados < tokens_totales);
        $cron$
    );
    RAISE NOTICE 'OK: job pg_cron "futplay-expirar-membresias" actualizado (ignora congeladas)';
EXCEPTION WHEN others THEN
    RAISE NOTICE 'AVISO: pg_cron no disponible (%). Backfill + trigger ya aplicados.', SQLERRM;
END $$;

-- ── 4) Inscripción a clases: membresía congelada = NO activa ──────────────────
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

    -- Cargar membresía ACTIVA por vigencia (estado=true, no congelada y fecha vigente)
    SELECT * INTO v_membresia
    FROM membresia
    WHERE usuario_id = NEW.usuario_id
      AND estado = true
      AND congelada = false
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

-- ── 5) devolver_token: membresía congelada = NO activa ─────────────────────────
CREATE OR REPLACE FUNCTION public.devolver_token(p_usuario_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
declare
  membresia_id uuid;
  tokens_usados_actual int;
begin
  -- Membresía ACTIVA por vigencia (misma lógica que manejar_inscripcion_clase)
  select id, tokens_usados into membresia_id, tokens_usados_actual
  from membresia
  where usuario_id = p_usuario_id
    and estado = true
    and congelada = false
    and tokens_usados > 0
    and fecha_inicio <= now()
    and fecha_vencimiento >= now()
  order by fecha_vencimiento desc
  limit 1;

  if membresia_id is null then
    return false;
  end if;

  update membresia
  set tokens_usados = tokens_usados_actual - 1
  where id = membresia_id;

  return true;
end;
$function$;