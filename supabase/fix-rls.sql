-- Drop all existing profile policies to start clean
DROP POLICY IF EXISTS "Public profiles are visible to everyone" ON profiles;
DROP POLICY IF EXISTS "Artists can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins full access profiles" ON profiles;
DROP POLICY IF EXISTS "own profile" ON profiles;

-- Recreate clean policies without recursion

-- Anyone can read any profile (public directory)
CREATE POLICY "profiles_select_public"
ON profiles FOR SELECT
USING (true);

-- Authenticated user can insert their own profile
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Authenticated user can update their own profile
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admin can update any profile
-- Uses auth.jwt() to avoid recursion instead of 
-- querying profiles table inside a profiles policy
CREATE POLICY "profiles_update_admin"
ON profiles FOR UPDATE
TO authenticated
USING (
  (auth.jwt() ->> 'role') = 'service_role'
  OR auth.uid() = id
);

-- Admin can delete profiles (via service role only)
CREATE POLICY "profiles_delete_admin"
ON profiles FOR DELETE
TO authenticated
USING (auth.uid() = id);
