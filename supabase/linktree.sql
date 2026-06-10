-- Add Linktree URL support to artist profiles.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linktree_url TEXT;
