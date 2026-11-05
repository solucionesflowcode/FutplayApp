-- Ligas (oct-2026): reemplaza Copa Fácil. El admin crea ligas, equipos,
-- planteles (usuarios de la app), fixture y resultados; luego los playoffs
-- se arman desde la tabla. El jugador ve todo en "Mi liga" (solo lectura).
--
-- Escritura: solo /api/admin/* con service role (sin políticas de escritura).
-- Lectura: authenticated. Los datos de otros usuarios (nombre, foto) los
-- entrega /api/ligas, porque RLS de usuario no los deja leer.

do $$ begin
    create type liga_estado as enum ('borrador', 'en_curso', 'finalizada');
exception when duplicate_object then null; end $$;

do $$ begin
    create type liga_fase as enum ('regular', 'cuartos', 'semifinal', 'final');
exception when duplicate_object then null; end $$;

do $$ begin
    create type liga_partido_estado as enum ('programado', 'jugado', 'suspendido');
exception when duplicate_object then null; end $$;

create table if not exists public.liga (
    id uuid primary key default gen_random_uuid(),
    nombre text not null,
    temporada text,
    sede_id uuid references public.sede(id) on delete set null,
    estado liga_estado not null default 'borrador',
    clasificados_playoff int check (clasificados_playoff in (2, 4, 8)),
    created_at timestamptz not null default now()
);

create table if not exists public.liga_equipo (
    id uuid primary key default gen_random_uuid(),
    liga_id uuid not null references public.liga(id) on delete cascade,
    nombre text not null,
    logo_url text,
    created_at timestamptz not null default now(),
    unique (liga_id, nombre),
    -- Para que liga_jugador y liga_partido exijan equipos de la misma liga.
    unique (id, liga_id)
);

-- Un jugador está en un solo equipo por liga.
create table if not exists public.liga_jugador (
    id uuid primary key default gen_random_uuid(),
    liga_id uuid not null references public.liga(id) on delete cascade,
    equipo_id uuid not null,
    usuario_id uuid not null references public.usuario(id) on delete cascade,
    numero int check (numero between 0 and 99),
    created_at timestamptz not null default now(),
    unique (liga_id, usuario_id),
    foreign key (equipo_id, liga_id) references public.liga_equipo(id, liga_id) on delete cascade
);

create table if not exists public.liga_partido (
    id uuid primary key default gen_random_uuid(),
    liga_id uuid not null references public.liga(id) on delete cascade,
    fase liga_fase not null default 'regular',
    jornada int check (jornada > 0),
    llave int,
    local_id uuid not null,
    visita_id uuid not null,
    fecha_hora timestamptz,
    cancha text,
    goles_local int check (goles_local >= 0),
    goles_visita int check (goles_visita >= 0),
    penales_local int check (penales_local >= 0),
    penales_visita int check (penales_visita >= 0),
    estado liga_partido_estado not null default 'programado',
    created_at timestamptz not null default now(),
    check (local_id <> visita_id),
    -- Un partido jugado tiene marcador.
    check (estado <> 'jugado' or (goles_local is not null and goles_visita is not null)),
    foreign key (local_id, liga_id) references public.liga_equipo(id, liga_id) on delete cascade,
    foreign key (visita_id, liga_id) references public.liga_equipo(id, liga_id) on delete cascade
);

create index if not exists liga_equipo_liga_idx on public.liga_equipo (liga_id);
create index if not exists liga_jugador_equipo_idx on public.liga_jugador (equipo_id, liga_id);
create index if not exists liga_jugador_usuario_idx on public.liga_jugador (usuario_id);
create index if not exists liga_partido_liga_idx on public.liga_partido (liga_id, fase, jornada);
create index if not exists liga_partido_local_idx on public.liga_partido (local_id, liga_id);
create index if not exists liga_partido_visita_idx on public.liga_partido (visita_id, liga_id);
create index if not exists liga_sede_idx on public.liga (sede_id);

alter table public.liga enable row level security;
alter table public.liga_equipo enable row level security;
alter table public.liga_jugador enable row level security;
alter table public.liga_partido enable row level security;

drop policy if exists liga_select on public.liga;
create policy liga_select on public.liga for select to authenticated using (true);
drop policy if exists liga_equipo_select on public.liga_equipo;
create policy liga_equipo_select on public.liga_equipo for select to authenticated using (true);
drop policy if exists liga_jugador_select on public.liga_jugador;
create policy liga_jugador_select on public.liga_jugador for select to authenticated using (true);
drop policy if exists liga_partido_select on public.liga_partido;
create policy liga_partido_select on public.liga_partido for select to authenticated using (true);
