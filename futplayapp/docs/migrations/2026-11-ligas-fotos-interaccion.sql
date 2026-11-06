-- "Me gusta" y comentarios en las fotos del campeonato (nov-2026).
-- Los comentarios se publican al tiro: los borra su autor o un admin.

create table if not exists public.liga_foto_reaccion (
    foto_id uuid not null references public.liga_foto(id) on delete cascade,
    usuario_id uuid not null references public.usuario(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (foto_id, usuario_id)
);

create index if not exists liga_foto_reaccion_usuario_idx on public.liga_foto_reaccion (usuario_id);

create table if not exists public.liga_foto_comentario (
    id uuid primary key default gen_random_uuid(),
    foto_id uuid not null references public.liga_foto(id) on delete cascade,
    usuario_id uuid not null references public.usuario(id) on delete cascade,
    texto text not null check (char_length(btrim(texto)) between 1 and 500),
    created_at timestamptz not null default now()
);

create index if not exists liga_foto_comentario_foto_idx on public.liga_foto_comentario (foto_id, created_at);
create index if not exists liga_foto_comentario_usuario_idx on public.liga_foto_comentario (usuario_id);

-- Escritura: solo las rutas /api con service role, que validan la sesión (sin políticas de escritura).
alter table public.liga_foto_reaccion enable row level security;
alter table public.liga_foto_comentario enable row level security;

drop policy if exists liga_foto_reaccion_select on public.liga_foto_reaccion;
create policy liga_foto_reaccion_select on public.liga_foto_reaccion for select to authenticated using (true);

drop policy if exists liga_foto_comentario_select on public.liga_foto_comentario;
create policy liga_foto_comentario_select on public.liga_foto_comentario for select to authenticated using (true);
