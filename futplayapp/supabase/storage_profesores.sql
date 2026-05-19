-- Run this in Supabase SQL Editor to create the storage bucket for profile photos
-- The bucket will also be auto-created on first upload via the API route,
-- but running this ensures proper RLS policies.

-- Create bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profesores',
  'profesores',
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'profesores');

-- Allow authenticated users to upload
CREATE POLICY "Auth Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profesores'
  AND auth.role() = 'authenticated'
);
