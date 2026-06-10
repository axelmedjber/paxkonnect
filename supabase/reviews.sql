CREATE TABLE IF NOT EXISTS artist_reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  comment TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (profile_id, reviewer_id, opportunity_id)
);

ALTER TABLE artist_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_public_read"
ON artist_reviews FOR SELECT USING (is_public = true);

CREATE POLICY "operator_write_review"
ON artist_reviews FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reviewer_id);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

CREATE OR REPLACE FUNCTION update_artist_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET
    avg_rating = (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM artist_reviews
      WHERE profile_id = NEW.profile_id
      AND is_public = true
    ),
    review_count = (
      SELECT COUNT(*) FROM artist_reviews
      WHERE profile_id = NEW.profile_id
      AND is_public = true
    )
  WHERE id = NEW.profile_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_new_review ON artist_reviews;

CREATE TRIGGER on_new_review
  AFTER INSERT ON artist_reviews
  FOR EACH ROW EXECUTE FUNCTION update_artist_rating();
