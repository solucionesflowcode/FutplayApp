-- Run this in Supabase SQL Editor to create the storage bucket for capsule thumbnails
-- The bucket will also be auto-created on first upload via the API route,
-- but running this ensures proper RLS policies.

-- Create bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'capsulas',
  'capsulas',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public Access Capsulas"
ON storage.objects FOR SELECT
USING (bucket_id = 'capsulas');

-- Allow authenticated users to upload
CREATE POLICY "Auth Upload Capsulas"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'capsulas'
  AND auth.role() = 'authenticated'
);
