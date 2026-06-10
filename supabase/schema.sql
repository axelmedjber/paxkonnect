-- UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  stage_name TEXT,
  bio TEXT,
  city TEXT,
  artistic_disciplines TEXT[],
  avatar_url TEXT,
  website_url TEXT,
  spotify_url TEXT,
  youtube_url TEXT,
  tiktok_url TEXT,
  instagram_url TEXT,
  linktree_url TEXT,
  spotify_followers INTEGER,
  youtube_subscribers INTEGER,
  instagram_followers INTEGER,
  tiktok_followers INTEGER,
  monthly_listeners INTEGER,
  stats_updated_at TIMESTAMPTZ,
  notifications_opt_out BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  featured_month TEXT,
  fee_min INTEGER,
  fee_max INTEGER,
  fee_currency TEXT DEFAULT 'EUR',
  avg_rating NUMERIC(3,2),
  review_count INTEGER DEFAULT 0,
  bio_pitch TEXT,
  bio_short TEXT,
  bio_long TEXT,
  contact_email TEXT,
  slug TEXT UNIQUE,
  press_quotes JSONB DEFAULT '[]',
  role TEXT CHECK (role IN ('artist', 'operator', 'admin')) DEFAULT 'artist',
  is_member BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio_pitch TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio_short TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio_long TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS press_quotes JSONB DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('artist', 'operator', 'admin')) DEFAULT 'artist';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linktree_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS spotify_followers INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS youtube_subscribers INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS instagram_followers INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tiktok_followers INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_listeners INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stats_updated_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notifications_opt_out BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS featured_month TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fee_min INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fee_max INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fee_currency TEXT DEFAULT 'EUR';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

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

-- Portfolio items table
CREATE TABLE IF NOT EXISTS portfolio_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  type TEXT CHECK (type IN ('music', 'video', 'photo', 'text', 'other')) NOT NULL,
  url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Opportunities table (cultural opportunities)
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT CHECK (category IN ('radio', 'podcast', 'event', 'contest', 'residency', 'other')) NOT NULL,
  description TEXT,
  location TEXT,
  organizer TEXT,
  operator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  contact_email TEXT,
  external_url TEXT,
  deadline DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS operator_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Matchings table (artist applications to opportunities)
CREATE TABLE IF NOT EXISTS matchings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'accepted', 'rejected')),
  message TEXT,
  applied_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, opportunity_id)
);

-- Partners table (radio stations, podcasts, venues, etc.)
CREATE TABLE IF NOT EXISTS partners (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('radio', 'podcast', 'venue', 'festival', 'institution', 'other')) NOT NULL,
  website TEXT,
  contact_email TEXT,
  description TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cultural places table
CREATE TABLE IF NOT EXISTS places (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN (
    'radio', 'cultural_center', 'concert_bar',
    'venue', 'gallery', 'festival', 'studio', 'other'
  )) NOT NULL,
  address TEXT,
  city TEXT,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  website TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

CREATE UNIQUE INDEX IF NOT EXISTS places_name_key ON places(name);

-- Tech rider table
CREATE TABLE IF NOT EXISTS tech_riders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  stage_plan_url TEXT,
  patch_list_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Press photos table
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

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchings ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE tech_riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE press_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies: profiles
DROP POLICY IF EXISTS "Public profiles are visible to everyone" ON profiles;
DROP POLICY IF EXISTS "Artists can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Artists can update their own profile" ON profiles;
CREATE POLICY "Public profiles are visible to everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Artists can create their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Artists can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = user_id
      AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

DROP POLICY IF EXISTS "Admins manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins full access profiles" ON profiles;

-- RLS Policies: portfolio_items
DROP POLICY IF EXISTS "Portfolio items are public" ON portfolio_items;
DROP POLICY IF EXISTS "Artists manage their own portfolio" ON portfolio_items;
CREATE POLICY "Portfolio items are public" ON portfolio_items FOR SELECT USING (true);
CREATE POLICY "Artists manage their own portfolio" ON portfolio_items FOR ALL USING (auth.uid() = profile_id);

-- RLS Policies: opportunities
DROP POLICY IF EXISTS "Active opportunities are visible to everyone" ON opportunities;
DROP POLICY IF EXISTS "Admin manages opportunities" ON opportunities;
CREATE POLICY "Active opportunities are visible to everyone" ON opportunities FOR SELECT USING (is_active = true);
CREATE POLICY "Admin manages opportunities" ON opportunities FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins manage all opportunities" ON opportunities;
DROP POLICY IF EXISTS "Admins write opportunities" ON opportunities;
DROP POLICY IF EXISTS "Admins update opportunities" ON opportunities;
DROP POLICY IF EXISTS "Admins delete opportunities" ON opportunities;
CREATE POLICY "Admins write opportunities"
ON opportunities FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
);

CREATE POLICY "Admins update opportunities"
ON opportunities FOR UPDATE
TO authenticated
USING (
  public.is_admin(auth.uid())
);

CREATE POLICY "Admins delete opportunities"
ON opportunities FOR DELETE
TO authenticated
USING (
  public.is_admin(auth.uid())
);

-- RLS Policies: places
DROP POLICY IF EXISTS "Places visible to everyone" ON places;
CREATE POLICY "Places visible to everyone" ON places FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage all places" ON places;
DROP POLICY IF EXISTS "Admins write places" ON places;
DROP POLICY IF EXISTS "Admins update places" ON places;
DROP POLICY IF EXISTS "Admins delete places" ON places;
CREATE POLICY "Admins write places"
ON places FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
);

CREATE POLICY "Admins update places"
ON places FOR UPDATE
TO authenticated
USING (
  public.is_admin(auth.uid())
);

CREATE POLICY "Admins delete places"
ON places FOR DELETE
TO authenticated
USING (
  public.is_admin(auth.uid())
);

-- RLS Policies: tech riders
DROP POLICY IF EXISTS "Tech rider public" ON tech_riders;
DROP POLICY IF EXISTS "Artist manages rider" ON tech_riders;
CREATE POLICY "Tech rider public" ON tech_riders FOR SELECT USING (true);
CREATE POLICY "Artist manages rider" ON tech_riders FOR ALL USING (auth.uid() = profile_id);

-- RLS Policies: press photos
DROP POLICY IF EXISTS "Press photos public" ON press_photos;
DROP POLICY IF EXISTS "Artist manages photos" ON press_photos;
CREATE POLICY "Press photos public" ON press_photos FOR SELECT USING (true);
CREATE POLICY "Artist manages photos" ON press_photos FOR ALL USING (auth.uid() = profile_id);

-- RLS Policies: matchings
DROP POLICY IF EXISTS "Artists see their own applications" ON matchings;
DROP POLICY IF EXISTS "Artists can apply to opportunities" ON matchings;
CREATE POLICY "Artists see their own applications" ON matchings FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Artists can apply to opportunities" ON matchings FOR INSERT WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Admins manage all matchings" ON matchings;
DROP POLICY IF EXISTS "Admins read all matchings" ON matchings;
DROP POLICY IF EXISTS "Admins update matchings" ON matchings;
CREATE POLICY "Admins read all matchings"
ON matchings FOR SELECT
TO authenticated
USING (
  auth.uid() = profile_id
  OR
  public.is_admin(auth.uid())
);

CREATE POLICY "Admins update matchings"
ON matchings FOR UPDATE
TO authenticated
USING (
  public.is_admin(auth.uid())
);

-- Trigger: automatically create a profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'artist')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Storage bucket and policies for artist avatars
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

-- Storage buckets and policies for EPK assets
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

-- Messaging between artists and cultural operators
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  artist_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  operator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (artist_id, operator_id, opportunity_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0 AND char_length(body) <= 2000),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversations_artist_id_idx ON conversations(artist_id);
CREATE INDEX IF NOT EXISTS conversations_operator_id_idx ON conversations(operator_id);
CREATE INDEX IF NOT EXISTS conversations_last_message_at_idx ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS messages_conversation_id_created_at_idx ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS messages_unread_idx ON messages(conversation_id, sender_id, read_at);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Conversation participants can read" ON conversations;
DROP POLICY IF EXISTS "Conversation participants can insert" ON conversations;
DROP POLICY IF EXISTS "Message participants can read" ON messages;
DROP POLICY IF EXISTS "Message participants can insert" ON messages;
DROP POLICY IF EXISTS "Message recipients can mark read" ON messages;

CREATE POLICY "Conversation participants can read"
ON conversations FOR SELECT
TO authenticated
USING (auth.uid() = artist_id OR auth.uid() = operator_id);

CREATE POLICY "Conversation participants can insert"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = artist_id OR auth.uid() = operator_id);

CREATE POLICY "Message participants can read"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM conversations
    WHERE conversations.id = messages.conversation_id
      AND (auth.uid() = conversations.artist_id OR auth.uid() = conversations.operator_id)
  )
);

CREATE POLICY "Message participants can insert"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM conversations
    WHERE conversations.id = messages.conversation_id
      AND (auth.uid() = conversations.artist_id OR auth.uid() = conversations.operator_id)
  )
);

CREATE POLICY "Message recipients can mark read"
ON messages FOR UPDATE
TO authenticated
USING (
  sender_id <> auth.uid()
  AND EXISTS (
    SELECT 1
    FROM conversations
    WHERE conversations.id = messages.conversation_id
      AND (auth.uid() = conversations.artist_id OR auth.uid() = conversations.operator_id)
  )
)
WITH CHECK (
  sender_id <> auth.uid()
  AND EXISTS (
    SELECT 1
    FROM conversations
    WHERE conversations.id = messages.conversation_id
      AND (auth.uid() = conversations.artist_id OR auth.uid() = conversations.operator_id)
  )
);

-- Artist availability calendar
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

-- Public artist reviews
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

DROP POLICY IF EXISTS "reviews_public_read" ON artist_reviews;
DROP POLICY IF EXISTS "operator_write_review" ON artist_reviews;

CREATE POLICY "reviews_public_read"
ON artist_reviews FOR SELECT USING (is_public = true);

CREATE POLICY "operator_write_review"
ON artist_reviews FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reviewer_id);

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

-- Artist performance history
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

DROP POLICY IF EXISTS "performances_public_read" ON performances;
DROP POLICY IF EXISTS "artist_manages_performances" ON performances;

CREATE POLICY "performances_public_read"
ON performances FOR SELECT USING (is_public = true);

CREATE POLICY "artist_manages_performances"
ON performances FOR ALL
TO authenticated
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);
