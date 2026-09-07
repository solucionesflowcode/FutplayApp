-- ============================================================================
-- fix_bugs_inventario.sql
-- Correcciones de inventario de bugs en objetos de BD (migración de producción).
--
-- Cómo aplicar: SQL Editor de Supabase, rol postgres, UNA sola vez.
-- Es idempotente/seguro de re-ejecutar (no borra datos de usuarios reales).
--
-- Contenido:
--   1) plan.dias vs plan.dias_vigencia  (Bug 6: columnas duplicadas divergentes)
--       - backfill para unificar valores inconsistentes
--       - trigger BEFORE INSERT/UPDATE para que nunca vuelvan a separarse
--   2) usuario.email  (default literal 'NOT NULL' heredado de pruebas)
--       - se elimina el default incorrecto
--       - las filas que quedaron con email='NOT NULL' > email único derivado del UUID
-- ============================================================================

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────
-- 1) plan.dias / plan.dias_vigencia
-- ──────────────────────────────────────────────────────────────────────────

-- Backfill: si alguna vez divergieron, se deja la equivalencia en ambos campos.
-- NOTA: el backfill fallará y hará ROLLBACK si hubiera filas inconsistentes de
-- modo que no se pueda garantizar unicidad/consistencia; en ese caso revisar
-- los datos antes de re-aplicar.
UPDATE plan SET dias_vigencia = dias WHERE dias_vigencia IS DISTINCT FROM dias;

-- Función de sincronización: cualquier escritura mantiene ambos campos iguales.
-- Si sólo llega 'dias' se propaga a 'dias_vigencia', y viceversa.
CREATE OR REPLACE FUNCTION mantener_dias_plan_sincronizados()
RETURNS trigger AS $$
BEGIN
    IF NEW.dias IS NULL AND NEW.dias_vigencia IS NOT NULL THEN
        NEW.dias := NEW.dias_vigencia;
    END IF;
    IF NEW.dias_vigencia IS NULL AND NEW.dias IS NOT NULL THEN
        NEW.dias_vigencia := NEW.dias;
    END IF;
    IF TG_OP = 'UPDATE' THEN
        IF NEW.dias IS DISTINCT FROM OLD.dias THEN
            NEW.dias_vigencia := NEW.dias;
        END IF;
        IF NEW.dias_vigencia IS DISTINCT FROM OLD.dias_vigencia THEN
            NEW.dias := NEW.dias_vigencia;
        END IF;
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_plan_sincronizar_dias ON plan;
CREATE TRIGGER trg_plan_sincronizar_dias
BEFORE INSERT OR UPDATE OF dias, dias_vigencia ON plan
FOR EACH ROW EXECUTE FUNCTION mantener_dias_plan_sincronizados();

-- ──────────────────────────────────────────────────────────────────────────
-- 2) usuario.email: el schema real quedó con DEFAULT 'NOT NULL' (texto), lo
--    que chocaba con las restricciones UNIQUE y dejaba filas ilegítimas.
-- ──────────────────────────────────────────────────────────────────────────

ALTER TABLE usuario ALTER COLUMN email DROP DEFAULT;

-- Filas placeholder 'NOT NULL' → email único por UUID (no se pierde la fila y
-- se respetan ambos UNIQUE de email). Sólo afecta filas con el marcador.
UPDATE usuario
SET email = lower(concat('pendiente-', id::text, '@futplay.cl'))
WHERE email = 'NOT NULL';

-- ──────────────────────────────────────────────────────────────────────────
-- Diagnóstico opcional (no ejecutado por defecto): redundancia de índices.
--   SELECT indexname FROM pg_indexes WHERE tablename = 'usuario' AND indexdef ILIKE '%email%';
--   -- usuario_email_key y unique_email duplican UNIQUE(email).
--   -- Si se desea limpiar:  DROP INDEX IF EXISTS unique_email;
-- ──────────────────────────────────────────────────────────────────────────

COMMIT;