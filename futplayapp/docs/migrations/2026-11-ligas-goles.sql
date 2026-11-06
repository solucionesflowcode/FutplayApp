-- Goles y jugador del partido (nov-2026). El admin los carga junto al resultado.
-- El marcador sigue en liga_partido.goles_*: liga_gol solo dice quién los hizo,
-- y un gol sin fila es un gol sin autor registrado.
-- Quitar a un jugador de la liga no borra el gol: queda sin autor.

create table if not exists public.liga_gol (
    id uuid primary key default gen_random_uuid(),
    partido_id uuid not null references public.liga_partido(id) on delete cascade,
    -- Equipo al que se le suma el gol (en un autogol, el rival del que lo hizo).
    equipo_id uuid not null references public.liga_equipo(id) on delete cascade,
    jugador_id uuid references public.liga_jugador(id) on delete set null,
    autogol boolean not null default false,
    created_at timestamptz not null default now(),
    check (not autogol or jugador_id is null)
);

alter table public.liga_partido
    add column if not exists jugador_partido_id uuid references public.liga_jugador(id) on delete set null;

create index if not exists liga_gol_partido_idx on public.liga_gol (partido_id);
create index if not exists liga_gol_equipo_idx on public.liga_gol (equipo_id);
create index if not exists liga_gol_jugador_idx on public.liga_gol (jugador_id);
create index if not exists liga_partido_jugador_partido_idx on public.liga_partido (jugador_partido_id);

-- Escritura: solo /api/admin/* con service role (sin políticas de escritura).
alter table public.liga_gol enable row level security;

drop policy if exists liga_gol_select on public.liga_gol;
create policy liga_gol_select on public.liga_gol for select to authenticated using (true);
