-- Messaging between artists and cultural operators.
-- Run this file in the Supabase SQL Editor before using /messages.

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
