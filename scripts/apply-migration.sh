#!/bin/bash
# Run this script to apply the profile metadata migration
# Usage: ./apply-migration.sh

set -e  # Exit on error

echo "🚀 Applying Profile Metadata Migration to Supabase..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get Supabase connection details
echo -e "${YELLOW}Enter your Supabase database connection string:${NC}"
echo "Find it at: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/database"
echo "Format: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
read -p "Connection string: " DB_CONNECTION

if [ -z "$DB_CONNECTION" ]; then
    echo -e "${RED}Error: Connection string cannot be empty${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Applying migration...${NC}"
echo ""

# Apply the migration
psql "$DB_CONNECTION" << 'EOF'
-- Add new columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS auth_provider text NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS last_sign_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sign_in_provider text;

-- Create index
CREATE INDEX IF NOT EXISTS idx_profiles_auth_provider
  ON profiles(auth_provider);

-- Backfill existing rows
UPDATE profiles AS p
SET
  display_name = COALESCE(p.display_name, NULLIF(u.raw_user_meta_data->>'full_name', ''), NULLIF(u.raw_user_meta_data->>'name', ''), split_part(COALESCE(u.email, ''), '@', 1)),
  avatar_url = COALESCE(p.avatar_url, NULLIF(u.raw_user_meta_data->>'avatar_url', ''), NULLIF(u.raw_user_meta_data->>'picture', '')),
  auth_provider = COALESCE(u.raw_app_meta_data->>'provider', p.auth_provider, 'email'),
  last_sign_in_at = COALESCE(u.last_sign_in_at, p.last_sign_in_at),
  last_sign_in_provider = COALESCE(u.raw_app_meta_data->>'provider', p.last_sign_in_provider, 'email')
FROM auth.users AS u
WHERE u.id = p.id;

-- Update trigger function
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

-- Verify columns were created
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('display_name', 'avatar_url', 'auth_provider', 'last_sign_in_provider', 'last_sign_in_at')
ORDER BY column_name;
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Migration applied successfully!${NC}"
    echo ""
    echo "Verifying data..."
    
    psql "$DB_CONNECTION" << 'EOF'
SELECT 
  COUNT(*) as total_users,
  COUNT(display_name) as users_with_names,
  COUNT(CASE WHEN auth_provider = 'google' THEN 1 END) as google_users,
  COUNT(CASE WHEN auth_provider = 'email' THEN 1 END) as email_users
FROM profiles;
EOF
    
    echo ""
    echo -e "${GREEN}🎉 Done! Your database is now updated.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Clear browser cache and reload https://curiosai.com"
    echo "2. Sign in with Google - errors should be gone!"
else
    echo -e "${RED}❌ Migration failed. Check error messages above.${NC}"
    exit 1
fi
