-- Agregar boleta_id a membresia (referencia a la boleta de compra)
ALTER TABLE public.membresia
ADD COLUMN IF NOT EXISTS boleta_id text;
