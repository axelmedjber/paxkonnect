CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS spotify_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  spotify_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  top_tracks JSONB,
  synced_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE spotify_data ENABLE ROW LEVEL SECURITY;

-- Tokens are intentionally not readable from browser clients.
-- Server routes/actions use the service role client to manage this table.
DROP POLICY IF EXISTS "spotify_data_no_client_select" ON spotify_data;
DROP POLICY IF EXISTS "spotify_data_no_client_write" ON spotify_data;
