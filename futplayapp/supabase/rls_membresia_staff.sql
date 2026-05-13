-- Run this in Supabase SQL Editor
-- Adds RLS policies so admin/profesor can read all membresías
-- without needing the service_role key workaround

-- Allow staff (admin/profesor) to SELECT all membresías
CREATE POLICY "Staff ve todas las membresias"
ON membresia
FOR SELECT
USING (
  (SELECT check_is_staff())
);

-- Allow admin to UPDATE membresías (e.g., mark as pagado)
CREATE POLICY "Admin gestiona membresias"
ON membresia
FOR UPDATE
USING (
  (SELECT rol FROM usuario WHERE id = auth.uid()) = 'administrador'
)
WITH CHECK (
  (SELECT rol FROM usuario WHERE id = auth.uid()) = 'administrador'
);
