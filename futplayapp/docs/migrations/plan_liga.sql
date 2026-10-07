-- ============================================================
-- Plan Liga (pago único) — tipo_plan = 'liga'
-- Ejecutar en el SQL Editor de Supabase. Idempotente.
--
-- - Oculto del catálogo público (igual que los familiares): solo se
--   compra con el link /planes/familiar/{codigo_acceso} del admin.
-- - Se puede comprar aunque el alumno tenga una membresía vigente.
-- - Al pagarse se registra en membresia con estado=false y 0 tokens,
--   sin afectar la membresía activa.
-- ============================================================

-- ── 1) Permitir 'liga' en plan.tipo_plan (enum o CHECK) ─────────────────────
DO $$
DECLARE
  v_typname text;
  v_conname text;
BEGIN
  SELECT t.typname INTO v_typname
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_type t ON t.oid = a.atttypid
   WHERE c.relname = 'plan' AND c.relnamespace = 'public'::regnamespace
     AND a.attname = 'tipo_plan' AND t.typtype = 'e';

  IF v_typname IS NOT NULL THEN
    EXECUTE format('ALTER TYPE public.%I ADD VALUE IF NOT EXISTS %L', v_typname, 'liga');
  ELSE
    SELECT con.conname INTO v_conname
      FROM pg_constraint con
     WHERE con.conrelid = 'public.plan'::regclass
       AND con.contype = 'c'
       AND pg_get_constraintdef(con.oid) ILIKE '%tipo_plan%';

    IF v_conname IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.plan DROP CONSTRAINT %I', v_conname);
    END IF;

    ALTER TABLE public.plan
      ADD CONSTRAINT plan_tipo_plan_check
      CHECK (tipo_plan IN ('normal', 'familiar', 'kids', 'liga'));
  END IF;
END $$;

-- ── 2) Marcar el Plan Liga Stadio Italiano ──────────────────────────────────
-- Si tipo_plan es un enum, Postgres no deja usar el valor nuevo en la misma
-- transacción: ejecutar este bloque en una corrida aparte del paso 1.
-- Verificar primero que pega UNA sola fila:
--   SELECT id, nombre, tipo_plan FROM public.plan WHERE nombre ILIKE '%liga%';
UPDATE public.plan
   SET tipo_plan = 'liga'
 WHERE nombre ILIKE '%liga%stadio%';

-- ── 3) Trigger de membresía vigente ─────────────────────────────────────────
-- Si existe un trigger BEFORE INSERT en membresia que rechaza la fila cuando
-- usuario_tiene_membresia_vigente() es true, debe dejar pasar los registros
-- inactivos (estado=false) del Plan Liga. Revisar con:
--
--   SELECT t.tgname, p.proname, pg_get_functiondef(p.oid)
--     FROM pg_trigger t
--     JOIN pg_proc p ON p.oid = t.tgfoid
--    WHERE t.tgrelid = 'public.membresia'::regclass AND NOT t.tgisinternal;
--
-- y agregar al inicio del cuerpo de esa función:
--
--   IF NEW.estado = false THEN
--     RETURN NEW;
--   END IF;
