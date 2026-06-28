-- Migration: Add tipo_evento enum and column to clase table
-- 
-- Changes:
-- 1. Create tipo_evento enum (entrenamiento, partido)
-- 2. Add tipo_evento column to clase table with default 'entrenamiento'

CREATE TYPE tipo_evento AS ENUM ('entrenamiento', 'partido');

ALTER TABLE clase
ADD COLUMN tipo_evento tipo_evento NOT NULL DEFAULT 'entrenamiento';
