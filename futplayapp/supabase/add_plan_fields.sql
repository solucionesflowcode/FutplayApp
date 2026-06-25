-- Agrega campos a la tabla plan para soportar
-- clases sueltas y planes con días personalizados

ALTER TABLE plan ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'plan' CHECK (tipo IN ('clase_suelta', 'plan'));
ALTER TABLE plan ADD COLUMN IF NOT EXISTS descripcion TEXT DEFAULT '';
ALTER TABLE plan ADD COLUMN IF NOT EXISTS dias_semana INT[] DEFAULT '{}';
ALTER TABLE plan ADD COLUMN IF NOT EXISTS duracion_semanas INT DEFAULT 1;
ALTER TABLE plan ADD COLUMN IF NOT EXISTS tokens INT DEFAULT 1;
ALTER TABLE plan ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
ALTER TABLE plan ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Actualizar tokens de planes existentes basado en tokens_mensuales
UPDATE plan SET tokens = tokens_mensuales WHERE tokens IS NULL OR tokens = 0;
