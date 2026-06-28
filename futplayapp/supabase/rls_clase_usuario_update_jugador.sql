-- Policy para que jugadores puedan cancelar (UPDATE) sus propias inscripciones
CREATE POLICY "Jugador cancela su propia clase"
  ON public.clase_usuario
  FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);
