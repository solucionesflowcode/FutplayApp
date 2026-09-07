-- FASE A - Duración de membresía por plan (30/90 días)
-- Agrega plan.dias: cantidad de días de vigencia de la membresía calculada
-- desde el día de la compra (fecha_inicio) hasta fecha_vencimiento.
-- Los planes existentes quedan con 30 días (DEFAULT). Para un plan de 90
-- días, setear plan.dias = 90 en su creación/edición.

ALTER TABLE public.plan
ADD COLUMN IF NOT EXISTS dias integer NOT NULL DEFAULT 30;