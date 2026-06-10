-- Minimal demo data for the PaxKonnect landing page and public feeds.
-- Run this after supabase/schema.sql.

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'amina.demo@paxkonnect.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Amina Laurent"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'noah.demo@paxkonnect.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Noah Vermeulen"}'::jsonb,
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (
  id,
  full_name,
  stage_name,
  bio,
  city,
  artistic_disciplines,
  avatar_url,
  website_url,
  spotify_url,
  youtube_url,
  tiktok_url,
  instagram_url,
  is_member
)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'Amina Laurent',
    'AMINA L.',
    'Brussels-based vocalist and producer blending electronic textures with spoken word.',
    'Brussels',
    ARRAY['music', 'literature'],
    NULL,
    'https://example.com/amina',
    'https://open.spotify.com/artist/0TnOYISbd1XYRBk9myaseg',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    NULL,
    'https://instagram.com/amina.demo',
    true
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Noah Vermeulen',
    'NOAH V.',
    'Antwerp visual artist working with photography, installation, and archive-based community projects.',
    'Antwerp',
    ARRAY['visual arts', 'film'],
    NULL,
    'https://example.com/noah',
    NULL,
    NULL,
    NULL,
    'https://instagram.com/noah.demo',
    false
  )
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  stage_name = EXCLUDED.stage_name,
  bio = EXCLUDED.bio,
  city = EXCLUDED.city,
  artistic_disciplines = EXCLUDED.artistic_disciplines,
  avatar_url = EXCLUDED.avatar_url,
  website_url = EXCLUDED.website_url,
  spotify_url = EXCLUDED.spotify_url,
  youtube_url = EXCLUDED.youtube_url,
  tiktok_url = EXCLUDED.tiktok_url,
  instagram_url = EXCLUDED.instagram_url,
  is_member = EXCLUDED.is_member,
  updated_at = now();

INSERT INTO opportunities (
  id,
  title,
  category,
  description,
  location,
  organizer,
  contact_email,
  external_url,
  deadline,
  is_active
)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Independent Artists Radio Showcase',
    'radio',
    'A Belgian community radio program is selecting five independent artists for recorded interviews and live session broadcasts.',
    'Brussels',
    'Radio Canal BXL',
    'showcase@canalbxl.test',
    'https://example.com/radio-showcase',
    current_date + 5,
    true
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'New Voices Podcast Season',
    'podcast',
    'A cultural podcast is booking artists for a new season about emerging Belgian creative practices.',
    'Ghent',
    'New Voices Podcast',
    'hello@newvoices.test',
    'https://example.com/new-voices',
    current_date + 14,
    true
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'MonsPax Micro-Residency',
    'residency',
    'A short residency for artists developing socially engaged work, including workspace, mentoring, and a public sharing moment.',
    'Mons',
    'MonsPax ASBL',
    'residency@monspax.test',
    'https://example.com/micro-residency',
    current_date + 28,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  location = EXCLUDED.location,
  organizer = EXCLUDED.organizer,
  contact_email = EXCLUDED.contact_email,
  external_url = EXCLUDED.external_url,
  deadline = EXCLUDED.deadline,
  is_active = EXCLUDED.is_active;
