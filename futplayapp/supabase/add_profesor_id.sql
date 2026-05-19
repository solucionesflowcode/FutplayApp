-- Agrega relación profesor → clase
ALTER TABLE clase ADD COLUMN IF NOT EXISTS profesor_id UUID REFERENCES usuario(id);

-- Agrega relación profesor → cápsula
ALTER TABLE capsula ADD COLUMN IF NOT EXISTS profesor_id UUID REFERENCES usuario(id);

-- Agrega especialidad y foto al perfil de profesor
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS especialidad TEXT;
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS foto_url TEXT;
