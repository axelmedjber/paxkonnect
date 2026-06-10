-- Phase 2 tables: availability, conversations, and messages.
-- Run this file in Supabase SQL Editor after the base schema exists.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ARTIST AVAILABILITY
CREATE TABLE IF NOT EXISTS artist_availability (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  status TEXT CHECK (status IN ('available', 'tentative', 'unavailable')) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, date)
);

CREATE INDEX IF NOT EXISTS artist_availability_profile_id_idx
ON artist_availability(profile_id);

CREATE INDEX IF NOT EXISTS artist_availability_date_idx
ON artist_availability(date);

ALTER TABLE artist_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "availability_public_read" ON artist_availability;
DROP POLICY IF EXISTS "availability_own_write" ON artist_availability;
DROP POLICY IF EXISTS "Artist availability is public" ON artist_availability;
DROP POLICY IF EXISTS "Artists manage their availability" ON artist_availability;

CREATE POLICY "availability_public_read"
ON artist_availability FOR SELECT
USING (true);

CREATE POLICY "availability_own_write"
ON artist_availability FOR ALL
TO authenticated
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

-- 2. CONVERSATIONS
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  artist_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  operator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(artist_id, operator_id, opportunity_id)
);

CREATE INDEX IF NOT EXISTS conversations_artist_id_idx
ON conversations(artist_id);

CREATE INDEX IF NOT EXISTS conversations_operator_id_idx
ON conversations(operator_id);

CREATE INDEX IF NOT EXISTS conversations_last_message_at_idx
ON conversations(last_message_at DESC);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_participants" ON conversations;
DROP POLICY IF EXISTS "Conversation participants can read" ON conversations;
DROP POLICY IF EXISTS "Conversation participants can insert" ON conversations;

CREATE POLICY "conversations_participants"
ON conversations FOR ALL
TO authenticated
USING (auth.uid() = artist_id OR auth.uid() = operator_id)
WITH CHECK (auth.uid() = artist_id OR auth.uid() = operator_id);

-- 3. MESSAGES
-- The application code uses messages.body. The generated content column keeps
-- a content-compatible alias for older SQL snippets and exports if needed.
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0 AND char_length(body) <= 2000),
  content TEXT GENERATED ALWAYS AS (body) STORED,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_id_created_at_idx
ON messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS messages_unread_idx
ON messages(conversation_id, sender_id, read_at);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_participants" ON messages;
DROP POLICY IF EXISTS "Message participants can read" ON messages;
DROP POLICY IF EXISTS "Message participants can insert" ON messages;
DROP POLICY IF EXISTS "Message recipients can mark read" ON messages;

CREATE POLICY "messages_participants"
ON messages FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id
    AND (c.artist_id = auth.uid() OR c.operator_id = auth.uid())
  )
)
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id
    AND (c.artist_id = auth.uid() OR c.operator_id = auth.uid())
  )
);

-- Trigger: update last_message_at on new message
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_new_message ON messages;

CREATE TRIGGER on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();

-- 4. REALTIME PUBLICATION
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  END IF;
END;
$$;
