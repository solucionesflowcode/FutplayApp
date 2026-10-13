-- 2026-10: anular boletas abandonadas.
--
-- create-order crea la boleta 'pendiente' antes de mandar al alumno a Flow. Si
-- no paga (cierra la pestaña, vuelve atrás), la orden de Flow expira a los
-- 30 min (timeout: 1800) pero la boleta quedaba 'pendiente' para siempre.
--
-- Cada hora se anulan las pendientes con más de 2 h. Es seguro: si Flow llegara
-- a confirmar un pago de una boleta anulada, el webhook la marca 'pagado' igual
-- (Flow es la fuente de verdad).

select cron.schedule(
  'futplay-anular-boletas-abandonadas',
  '15 * * * *',
  $$update public.boleta
       set estado = 'anulado'
     where estado = 'pendiente'
       and created_at < now() - interval '2 hours'$$
);
