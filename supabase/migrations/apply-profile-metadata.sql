-- ============================================================================
-- Profile Metadata Migration - Direct SQL Execution
-- ============================================================================
-- Run this SQL script to add OAuth provider metadata tracking to profiles
-- 
-- HOW TO USE:
-- 1. Get your Supabase database connection string from:
--    https://supabase.com/dashboard/project/YOUR_PROJECT/settings/database
-- 
-- 2. Run this command in terminal:
--    psql "YOUR_CONNECTION_STRING" -f supabase/migrations/apply-profile-metadata.sql
--
-- OR copy/paste this entire file into Supabase SQL Editor and click Run
-- ============================================================================

\echo '🚀 Starting Profile Metadata Migration...'
\echo ''

-- Add new columns to profiles table
\echo '📝 Step 1: Adding new columns...'
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS auth_provider text NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS last_sign_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sign_in_provider text;

\echo '✅ Columns added'
\echo ''

-- Create index for performance
\echo '📝 Step 2: Creating index...'
CREATE INDEX IF NOT EXISTS idx_profiles_auth_provider
  ON profiles(auth_provider);

\echo '✅ Index created'
\echo ''

-- Backfill existing rows with metadata from auth.users
\echo '📝 Step 3: Backfilling existing user data...'
UPDATE profiles AS p
SET
  display_name = COALESCE(
    p.display_name, 
    NULLIF(u.raw_user_meta_data->>'full_name', ''), 
    NULLIF(u.raw_user_meta_data->>'name', ''), 
    split_part(COALESCE(u.email, ''), '@', 1)
  ),
  avatar_url = COALESCE(
    p.avatar_url, 
    NULLIF(u.raw_user_meta_data->>'avatar_url', ''), 
    NULLIF(u.raw_user_meta_data->>'picture', '')
  ),
  auth_provider = COALESCE(
    u.raw_app_meta_data->>'provider', 
    p.auth_provider, 
    'email'
  ),
  last_sign_in_at = COALESCE(u.last_sign_in_at, p.last_sign_in_at),
  last_sign_in_provider = COALESCE(
    u.raw_app_meta_data->>'provider', 
    p.last_sign_in_provider, 
    'email'
  )
FROM auth.users AS u
WHERE u.id = p.id;

\echo '✅ Data backfilled'
\echo ''

-- Update trigger to capture provider metadata for new users
\echo '📝 Step 4: Updating trigger function...'
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  provider text := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
  full_name text := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    NULLIF(NEW.raw_user_meta_data->>'user_name', ''),
    split_part(COALESCE(NEW.email, ''), '@', 1)
  );
  avatar text := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
    NULLIF(NEW.raw_user_meta_data->>'picture', ''),
    NULLIF(NEW.raw_user_meta_data->>'avatar', '')
  );
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    avatar_url,
    auth_provider,
    last_sign_in_at,
    last_sign_in_provider
  ) VALUES (
    NEW.id,
    NEW.email,
    NULLIF(full_name, ''),
    NULLIF(avatar, ''),
    provider,
    NEW.last_sign_in_at,
    provider
  )
  ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
      avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
      auth_provider = EXCLUDED.auth_provider,
      last_sign_in_at = EXCLUDED.last_sign_in_at,
      last_sign_in_provider = EXCLUDED.last_sign_in_provider;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

\echo '✅ Trigger function updated'
\echo ''

-- Verification: Show new columns
\echo '🔍 Verifying migration...'
\echo 'New columns in profiles table:'
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('display_name', 'avatar_url', 'auth_provider', 'last_sign_in_provider', 'last_sign_in_at')
ORDER BY column_name;

\echo ''
\echo 'User statistics:'
SELECT 
  COUNT(*) as total_users,
  COUNT(display_name) as users_with_names,
  COUNT(avatar_url) as users_with_avatars,
  COUNT(CASE WHEN auth_provider = 'google' THEN 1 END) as google_users,
  COUNT(CASE WHEN auth_provider = 'email' THEN 1 END) as email_users
FROM profiles;

\echo ''
\echo '✅ Migration completed successfully!'
\echo ''
\echo '📋 Sample data (first 5 users):'
SELECT 
  email,
  display_name,
  auth_provider,
  last_sign_in_provider,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 5;

\echo ''
\echo '🎉 Done! Next steps:'
\echo '1. Clear browser cache at https://curiosai.com'
\echo '2. Sign in with Google - errors should be gone!'
\echo ''
