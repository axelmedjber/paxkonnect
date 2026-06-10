-- PaxKonnect security hardening.
-- Run this file in Supabase SQL Editor after the base schema and phase tables.

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

-- 1. Prevent role/member/featured self-escalation from direct client updates.
DROP POLICY IF EXISTS "Public profiles are visible to everyone" ON profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;

CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION prevent_profile_self_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() = NEW.id THEN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      RAISE EXCEPTION 'Cannot change your own role';
    END IF;

    IF OLD.is_member IS DISTINCT FROM NEW.is_member THEN
      RAISE EXCEPTION 'Cannot change member status';
    END IF;

    IF OLD.is_featured IS DISTINCT FROM NEW.is_featured THEN
      RAISE EXCEPTION 'Cannot change featured status';
    END IF;

    IF OLD.featured_month IS DISTINCT FROM NEW.featured_month THEN
      RAISE EXCEPTION 'Cannot change featured month';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS enforce_profile_integrity ON profiles;

CREATE TRIGGER enforce_profile_integrity
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_profile_self_escalation();

-- 2. Admin-only protected profile field update function.
CREATE OR REPLACE FUNCTION admin_update_profile(
  target_id UUID,
  new_role TEXT DEFAULT NULL,
  new_is_member BOOLEAN DEFAULT NULL,
  new_is_featured BOOLEAN DEFAULT NULL,
  new_featured_month TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  caller_role TEXT;
BEGIN
  SELECT role INTO caller_role
  FROM profiles
  WHERE id = auth.uid();

  IF caller_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can update protected fields';
  END IF;

  IF new_role IS NOT NULL AND new_role NOT IN ('artist', 'operator', 'admin') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  UPDATE profiles SET
    role = COALESCE(new_role, role),
    is_member = COALESCE(new_is_member, is_member),
    is_featured = COALESCE(new_is_featured, is_featured),
    featured_month = CASE
      WHEN new_is_featured = false THEN NULL
      ELSE COALESCE(new_featured_month, featured_month)
    END
  WHERE id = target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION admin_update_profile(UUID, TEXT, BOOLEAN, BOOLEAN, TEXT) TO authenticated;

-- 3. Replace broad message RLS with least-privilege policies.
DROP POLICY IF EXISTS "messages_participants" ON messages;
DROP POLICY IF EXISTS "Message participants can read" ON messages;
DROP POLICY IF EXISTS "Message participants can insert" ON messages;
DROP POLICY IF EXISTS "Message recipients can mark read" ON messages;
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_update_read" ON messages;

CREATE POLICY "messages_select"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
      AND (c.artist_id = auth.uid() OR c.operator_id = auth.uid())
  )
);

CREATE POLICY "messages_insert"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
      AND (c.artist_id = auth.uid() OR c.operator_id = auth.uid())
  )
);

CREATE POLICY "messages_update_read"
ON messages FOR UPDATE
TO authenticated
USING (
  sender_id <> auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
      AND (c.artist_id = auth.uid() OR c.operator_id = auth.uid())
  )
)
WITH CHECK (
  sender_id <> auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
      AND (c.artist_id = auth.uid() OR c.operator_id = auth.uid())
  )
);

-- RLS cannot restrict which columns are updated. This trigger enforces that
-- message UPDATE can only set read_at and cannot mutate message content.
CREATE OR REPLACE FUNCTION prevent_message_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.id IS DISTINCT FROM NEW.id
    OR OLD.conversation_id IS DISTINCT FROM NEW.conversation_id
    OR OLD.sender_id IS DISTINCT FROM NEW.sender_id
    OR OLD.body IS DISTINCT FROM NEW.body
    OR OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Only read_at can be updated on messages';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS enforce_message_read_only_update ON messages;

CREATE TRIGGER enforce_message_read_only_update
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION prevent_message_mutation();

-- No DELETE policy is created for messages.

-- 4. Tighten review writes to verified operators/admins.
DROP POLICY IF EXISTS "operator_write_review" ON artist_reviews;
DROP POLICY IF EXISTS "reviews_insert_verified" ON artist_reviews;
DROP POLICY IF EXISTS "reviews_update_own" ON artist_reviews;

CREATE POLICY "reviews_insert_verified"
ON artist_reviews FOR INSERT
TO authenticated
WITH CHECK (
  reviewer_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles reviewer
    WHERE reviewer.id = auth.uid()
      AND reviewer.role IN ('operator', 'admin')
  )
  AND EXISTS (
    SELECT 1
    FROM matchings m
    JOIN opportunities o ON o.id = m.opportunity_id
    WHERE m.profile_id = artist_reviews.profile_id
      AND m.opportunity_id = artist_reviews.opportunity_id
      AND m.status = 'accepted'
      AND (
        o.operator_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles admin_profile
          WHERE admin_profile.id = auth.uid()
            AND admin_profile.role = 'admin'
        )
      )
  )
);

CREATE POLICY "reviews_update_own"
ON artist_reviews FOR UPDATE
TO authenticated
USING (reviewer_id = auth.uid())
WITH CHECK (reviewer_id = auth.uid());

-- 5. Public-safe profile view for public directory/profile surfaces.
CREATE OR REPLACE VIEW public_profiles AS
SELECT
  id,
  full_name,
  stage_name,
  bio,
  bio_pitch,
  bio_short,
  bio_long,
  city,
  artistic_disciplines,
  avatar_url,
  website_url,
  spotify_url,
  youtube_url,
  tiktok_url,
  instagram_url,
  linktree_url,
  spotify_followers,
  youtube_subscribers,
  instagram_followers,
  tiktok_followers,
  monthly_listeners,
  fee_min,
  fee_max,
  fee_currency,
  avg_rating,
  review_count,
  is_member,
  is_featured,
  featured_month,
  slug,
  created_at
FROM profiles
WHERE role = 'artist';

GRANT SELECT ON public_profiles TO anon, authenticated;
