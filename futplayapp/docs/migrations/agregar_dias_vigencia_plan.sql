-- Agregar dias_vigencia a plan (vigencia en días del plan)
ALTER TABLE public.plan
ADD COLUMN IF NOT EXISTS dias_vigencia integer;

-- Actualizar valores existentes para que coincidan con dias
UPDATE public.plan SET dias_vigencia = dias WHERE dias_vigencia IS NULL;

-- Hacer NOT NULL con DEFAULT
ALTER TABLE public.plan 
ALTER COLUMN dias_vigencia SET NOT NULL,
ALTER COLUMN dias_vigencia SET DEFAULT 30;
