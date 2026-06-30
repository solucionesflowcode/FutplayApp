-- Drop the old boleta triggers that auto-created membresias.
-- These were manually created in the SQL Editor (not tracked in any .sql file)
-- and caused DUPLICATE membresias with wrong mes format (YYYY-MM-DD, no boleta_id).
-- The webhook now handles membresia creation directly with proper idempotency.

DROP TRIGGER IF EXISTS trigger_procesar_boleta ON boleta;
DROP TRIGGER IF EXISTS procesar_boleta_pagada ON boleta;
DROP FUNCTION IF EXISTS procesar_boleta_pagada();
