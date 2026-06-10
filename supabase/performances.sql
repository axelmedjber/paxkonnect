CREATE TABLE IF NOT EXISTS performances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  event_name TEXT NOT NULL,
  venue_name TEXT,
  city TEXT,
  country TEXT DEFAULT 'BE',
  performance_date DATE NOT NULL,
  audience_size TEXT CHECK (audience_size IN ('< 50', '50-200', '200-500', '500-1000', '1000-5000', '5000+')),
  event_type TEXT CHECK (event_type IN ('concert', 'festival', 'showcase', 'residency', 'private', 'radio', 'podcast', 'other')),
  description TEXT,
  media_url TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE performances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "performances_public_read"
ON performances FOR SELECT USING (is_public = true);

CREATE POLICY "artist_manages_performances"
ON performances FOR ALL
TO authenticated
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);
