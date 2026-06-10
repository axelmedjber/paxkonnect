-- Artist availability calendar.
-- Run this file in the Supabase SQL Editor before enabling the calendar UI.

CREATE TABLE IF NOT EXISTS artist_availability (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  status TEXT CHECK (status IN ('available', 'unavailable', 'tentative')) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (profile_id, date)
);

CREATE INDEX IF NOT EXISTS artist_availability_profile_id_idx
ON artist_availability(profile_id);

CREATE INDEX IF NOT EXISTS artist_availability_date_idx
ON artist_availability(date);

ALTER TABLE artist_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Artist availability is public" ON artist_availability;
DROP POLICY IF EXISTS "Artists manage their availability" ON artist_availability;

CREATE POLICY "Artist availability is public"
ON artist_availability FOR SELECT
USING (true);

CREATE POLICY "Artists manage their availability"
ON artist_availability FOR ALL
TO authenticated
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

CREATE OR REPLACE FUNCTION set_artist_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_artist_availability_updated_at
ON artist_availability;

CREATE TRIGGER set_artist_availability_updated_at
  BEFORE UPDATE ON artist_availability
  FOR EACH ROW
  EXECUTE FUNCTION set_artist_availability_updated_at();
