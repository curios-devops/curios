/*
  # Capture auth provider metadata for profiles

  - Adds display/avatar/provider tracking columns
  - Backfills existing rows using auth.users metadata
  - Updates handle_new_user trigger to persist provider info for Google signups
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS auth_provider text NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS last_sign_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sign_in_provider text;

CREATE INDEX IF NOT EXISTS idx_profiles_auth_provider
  ON profiles(auth_provider);

-- Backfill existing rows with the best available metadata
UPDATE profiles AS p
SET
  display_name = COALESCE(p.display_name, NULLIF(u.raw_user_meta_data->>'full_name', ''), NULLIF(u.raw_user_meta_data->>'name', ''), split_part(COALESCE(u.email, ''), '@', 1)),
  avatar_url = COALESCE(p.avatar_url, NULLIF(u.raw_user_meta_data->>'avatar_url', ''), NULLIF(u.raw_user_meta_data->>'picture', '')),
  auth_provider = COALESCE(u.raw_app_meta_data->>'provider', p.auth_provider, 'email'),
  last_sign_in_at = COALESCE(u.last_sign_in_at, p.last_sign_in_at),
  last_sign_in_provider = COALESCE(u.raw_app_meta_data->>'provider', p.last_sign_in_provider, 'email')
FROM auth.users AS u
WHERE u.id = p.id;

-- Ensure the trigger keeps provider metadata up to date
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
