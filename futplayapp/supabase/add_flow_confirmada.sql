-- Permite identificar boletas donde Flow confirmó la orden exitosamente.
-- Si flow_confirmada = false y estado = "pendiente", la boleta quedó huérfana.

ALTER TABLE boleta ADD COLUMN IF NOT EXISTS flow_confirmada BOOLEAN DEFAULT false;
