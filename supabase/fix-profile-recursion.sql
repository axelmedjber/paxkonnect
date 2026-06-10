-- Emergency fix for:
-- "infinite recursion detected in policy for relation profiles"
--
-- The app's admin user management uses SUPABASE_SERVICE_ROLE_KEY server-side,
-- so authenticated admin profile policies are not required for the admin panel.
-- Keep public profile reads and artist-owned profile writes only.

DROP POLICY IF EXISTS "Admins manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins full access profiles" ON profiles;

DROP POLICY IF EXISTS "Public profiles are visible to everyone" ON profiles;
DROP POLICY IF EXISTS "Artists can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Artists can update their own profile" ON profiles;

CREATE POLICY "Public profiles are visible to everyone"
ON profiles FOR SELECT
USING (true);

CREATE POLICY "Artists can create their own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Artists can update their own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
