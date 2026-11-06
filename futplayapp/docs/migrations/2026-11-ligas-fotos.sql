-- Fotos del campeonato (nov-2026). Solo el admin las sube; las ve cualquier usuario con sesión.
-- Una foto va asociada a un partido o es general de la liga (partido_id null).
-- Al borrar un partido (o reiniciar los playoffs) sus fotos no se pierden: pasan a generales.

create table if not exists public.liga_foto (
    id uuid primary key default gen_random_uuid(),
    liga_id uuid not null references public.liga(id) on delete cascade,
    partido_id uuid references public.liga_partido(id) on delete set null,
    -- Rutas dentro del bucket liga-fotos. Borrar la fila no borra los archivos: lo hace la API.
    ruta text not null,
    ruta_miniatura text not null,
    ancho integer not null check (ancho > 0),
    alto integer not null check (alto > 0),
    pie text check (char_length(pie) <= 200),
    subida_por uuid references public.usuario(id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists liga_foto_liga_fecha_idx on public.liga_foto (liga_id, created_at desc);
create index if not exists liga_foto_partido_idx on public.liga_foto (partido_id);
create index if not exists liga_foto_subida_por_idx on public.liga_foto (subida_por);

-- Escritura: solo /api/admin/* con service role (sin políticas de escritura).
alter table public.liga_foto enable row level security;

drop policy if exists liga_foto_select on public.liga_foto;
create policy liga_foto_select on public.liga_foto for select to authenticated using (true);

-- Público como los demás buckets del proyecto: el nombre de cada archivo es aleatorio.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('liga-fotos', 'liga-fotos', true, 4194304, array['image/jpeg', 'image/webp'])
on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;
