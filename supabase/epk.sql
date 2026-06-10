-- PaxKonnect EPK schema extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio_pitch TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio_short TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio_long TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS press_quotes JSONB DEFAULT '[]';

CREATE OR REPLACE FUNCTION generate_slug(name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        translate(name,
          'àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ',
          'aaaaaaaceeeeiiiidnoooooouuuuyty'
        ),
        '[^a-z0-9\s-]', '', 'g'
      ),
      '\s+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS tech_riders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  stage_plan_url TEXT,
  patch_list_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tech_riders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tech rider public" ON tech_riders;
DROP POLICY IF EXISTS "Artist manages rider" ON tech_riders;
CREATE POLICY "Tech rider public" ON tech_riders FOR SELECT USING (true);
CREATE POLICY "Artist manages rider" ON tech_riders FOR ALL USING (auth.uid() = profile_id);

CREATE TABLE IF NOT EXISTS press_photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  filename TEXT,
  caption TEXT,
  photographer TEXT,
  orientation TEXT CHECK (orientation IN ('horizontal', 'vertical', 'logo')),
  is_primary BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE press_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Press photos public" ON press_photos;
DROP POLICY IF EXISTS "Artist manages photos" ON press_photos;
CREATE POLICY "Press photos public" ON press_photos FOR SELECT USING (true);
CREATE POLICY "Artist manages photos" ON press_photos FOR ALL USING (auth.uid() = profile_id);

INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
VALUES ('press-photos', 'press-photos', true, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
VALUES ('tech-riders', 'tech-riders', true, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Press photos are publicly visible" ON storage.objects;
DROP POLICY IF EXISTS "Artists can upload their own press photos" ON storage.objects;
DROP POLICY IF EXISTS "Artists can update their own press photos" ON storage.objects;
DROP POLICY IF EXISTS "Artists can delete their own press photos" ON storage.objects;
DROP POLICY IF EXISTS "Tech riders are publicly visible" ON storage.objects;
DROP POLICY IF EXISTS "Artists can upload their own tech riders" ON storage.objects;
DROP POLICY IF EXISTS "Artists can update their own tech riders" ON storage.objects;
DROP POLICY IF EXISTS "Artists can delete their own tech riders" ON storage.objects;

CREATE POLICY "Press photos are publicly visible"
ON storage.objects FOR SELECT
USING (bucket_id = 'press-photos');

CREATE POLICY "Artists can upload their own press photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'press-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Artists can update their own press photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'press-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Artists can delete their own press photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'press-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Tech riders are publicly visible"
ON storage.objects FOR SELECT
USING (bucket_id = 'tech-riders');

CREATE POLICY "Artists can upload their own tech riders"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tech-riders' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Artists can update their own tech riders"
ON storage.objects FOR UPDATE
USING (bucket_id = 'tech-riders' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Artists can delete their own tech riders"
ON storage.objects FOR DELETE
USING (bucket_id = 'tech-riders' AND auth.uid()::text = (storage.foldername(name))[1]);
