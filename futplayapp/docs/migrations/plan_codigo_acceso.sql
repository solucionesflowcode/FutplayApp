-- ============================================================
-- Planes Familiares: acceso solo por link/QR
-- Ejecutar en el SQL Editor de Supabase.
--
-- Agrega codigo_acceso a la tabla plan:
--   - NULL  = plan normal (visible en el catalogo publico)
--   - UUID  = plan familiar (oculto; solo comprable con el link
--             /planes/familiar/{codigo_acceso})
-- ============================================================

ALTER TABLE plan
  ADD COLUMN IF NOT EXISTS codigo_acceso text;

-- Un mismo link no puede apuntar a dos planes
CREATE UNIQUE INDEX IF NOT EXISTS plan_codigo_acceso_key
  ON plan (codigo_acceso)
  WHERE codigo_acceso IS NOT NULL;

-- (Opcional, hardening) Ocultar planes familiares de las lecturas
-- anon/authenticated. El backend usa service_role y no se ve afectado.
-- Descomenta si quieres aplicar RLS restrictivo:
--
-- DROP POLICY IF EXISTS "Lectura catalogo planes" ON plan;
-- CREATE POLICY "Lectura catalogo planes" ON plan
--   FOR SELECT TO authenticated
--   USING (
--     tipo_plan IS DISTINCT FROM 'familiar'
--     OR EXISTS (
--       SELECT 1 FROM usuario u
--       WHERE u.id = auth.uid() AND u.rol = 'administrador'
--     )
--   );
