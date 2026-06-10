-- Development demo data for PaxKonnect.
-- Run this after supabase/schema.sql in the Supabase SQL editor.
-- This keeps the UI honest: pages still fetch data from Supabase.

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
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'lina.demo@paxkonnect.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Lina Mertens"}'::jsonb,
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
    'Brussels-based vocalist and producer blending electronic textures with French and Dutch spoken word.',
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
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Lina Mertens',
    'Lina M.',
    'Liege theatre maker and performer developing intimate multilingual stage work.',
    'Liege',
    ARRAY['theatre', 'dance'],
    NULL,
    'https://example.com/lina',
    NULL,
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    NULL,
    NULL,
    true
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

INSERT INTO portfolio_items (profile_id, title, type, url, description)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'Night Tram Sessions',
    'music',
    'https://open.spotify.com/artist/0TnOYISbd1XYRBk9myaseg',
    'A compact electronic set shaped around late-night Brussels field recordings.'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'Studio Performance',
    'video',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'Live session recording for a community radio showcase.'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Harbor Archive',
    'photo',
    'https://example.com/harbor-archive',
    'A photographic installation about port memory and migration.'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Small Rooms',
    'video',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'Short performance excerpt from a multilingual theatre work.'
  )
ON CONFLICT DO NOTHING;

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
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'Open Stage Cultural Night',
    'event',
    'A curated evening for music, spoken word, performance, and experimental short-form work.',
    'Liege',
    'Maison Culturelle Demo',
    'events@maison.demo',
    'https://example.com/open-stage',
    current_date + 9,
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

INSERT INTO partners (
  id,
  name,
  type,
  website,
  contact_email,
  description,
  logo_url,
  is_active
)
VALUES
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'Radio Canal BXL',
    'radio',
    'https://example.com/radio-canal-bxl',
    'partners@canalbxl.test',
    'Community radio partner supporting independent Belgian artists.',
    NULL,
    true
  ),
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'Maison Culturelle Demo',
    'venue',
    'https://example.com/maison-culturelle',
    'booking@maison.demo',
    'Small venue programming multidisciplinary cultural nights.',
    NULL,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  website = EXCLUDED.website,
  contact_email = EXCLUDED.contact_email,
  description = EXCLUDED.description,
  logo_url = EXCLUDED.logo_url,
  is_active = EXCLUDED.is_active;

INSERT INTO matchings (profile_id, opportunity_id, status, message)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'applied',
    'Interested in performing a short live electronic set.'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'pending',
    'Developing a new stage piece that fits the residency theme.'
  )
ON CONFLICT (profile_id, opportunity_id) DO UPDATE SET
  status = EXCLUDED.status,
  message = EXCLUDED.message;
