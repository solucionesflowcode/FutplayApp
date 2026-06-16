-- Add destacada column to capsula table
-- Run this in Supabase Dashboard > SQL Editor

ALTER TABLE capsula ADD COLUMN IF NOT EXISTS destacada BOOLEAN NOT NULL DEFAULT false;

-- Create a unique partial index to enforce only one destacada at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_capsula_unica_destacada ON capsula ((true)) WHERE destacada = true;
