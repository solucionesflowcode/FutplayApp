-- Sede por equipo (nov-2026): cada partido se juega en la sede del equipo local,
-- así que la sede pasa a ser un dato del equipo. Una liga puede tener equipos de
-- varias sedes. liga.sede_id queda sin uso (la app ya no la lee ni la escribe).

alter table public.liga_equipo
    add column if not exists sede_id uuid references public.sede(id) on delete set null;

create index if not exists liga_equipo_sede_idx on public.liga_equipo (sede_id);
