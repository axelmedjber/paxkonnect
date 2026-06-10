-- Required for /profile/edit upserts and avatar uploads.
-- Run this after the main schema has already been applied.

DROP POLICY IF EXISTS "Artists can create their own profile" ON public.profiles;

CREATE POLICY "Artists can create their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Avatar images are publicly visible" ON storage.objects;
DROP POLICY IF EXISTS "Artists can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Artists can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Artists can delete their own avatars" ON storage.objects;

CREATE POLICY "Avatar images are publicly visible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Artists can upload their own avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Artists can update their own avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Artists can delete their own avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
