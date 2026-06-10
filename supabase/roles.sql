-- PaxKonnect role system
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role TEXT
CHECK (role IN ('artist', 'operator', 'admin'))
DEFAULT 'artist';

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'artist')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop conflicting broad admin policies.
DROP POLICY IF EXISTS "Admins manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins manage all opportunities" ON opportunities;
DROP POLICY IF EXISTS "Admins manage all matchings" ON matchings;
DROP POLICY IF EXISTS "Admins manage all places" ON places;

-- Drop replacement policies before recreating, so this file can be rerun.
-- Admin profile management uses the service-role admin client in the app, so
-- avoid a profiles FOR ALL policy that can recursively check profiles.
DROP POLICY IF EXISTS "Admins full access profiles" ON profiles;
DROP POLICY IF EXISTS "Admins write opportunities" ON opportunities;
DROP POLICY IF EXISTS "Admins update opportunities" ON opportunities;
DROP POLICY IF EXISTS "Admins delete opportunities" ON opportunities;
DROP POLICY IF EXISTS "Admins read all matchings" ON matchings;
DROP POLICY IF EXISTS "Admins update matchings" ON matchings;
DROP POLICY IF EXISTS "Admins write places" ON places;
DROP POLICY IF EXISTS "Admins update places" ON places;
DROP POLICY IF EXISTS "Admins delete places" ON places;

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

-- Opportunities: public SELECT stays, admin gets write access.
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

-- Matchings: admin sees all.
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

-- Places: public SELECT stays, admin gets write access.
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
