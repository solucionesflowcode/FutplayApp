-- Agrega boleta_id a membresia para trazabilidad e idempotencia del webhook.
-- Una membresía puede estar asociada a la boleta que la originó.
-- El constraint UNIQUE (usuario_id, fecha_inicio) se elimina porque el negocio permite
-- múltiples membresías en el mismo mes (distintos planes). En su lugar, el
-- control es por (usuario_id, estado=true) — solo una activa por usuario.

ALTER TABLE membresia
    ADD COLUMN boleta_id UUID REFERENCES boleta(id);

-- Elimina constraint anterior que impedía múltiples membresías por mes
ALTER TABLE membresia
    DROP CONSTRAINT IF EXISTS unique_usuario_mes;

-- Índice para búsqueda por boleta_id (idempotencia webhook)
CREATE INDEX IF NOT EXISTS idx_membresia_boleta_id ON membresia(boleta_id);
