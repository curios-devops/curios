# Apply Profile Metadata Migration

## ⚠️ IMPORTANT: Deploy Order

1. ✅ **Code hotfix deployed** (already done - ec7cfdb)
2. ⏭️ **Apply this database migration** (follow steps below)

The app now gracefully handles missing columns, so you can apply this migration safely.

## What This Migration Does

Adds OAuth provider tracking to profiles table:
- `display_name` - User's full name from Google/OAuth
- `avatar_url` - Profile picture URL from OAuth provider
- `auth_provider` - Which provider they used (google, email, etc.)
- `last_sign_in_at` - Timestamp of last sign-in
- `last_sign_in_provider` - Provider used for most recent sign-in

## Option 1: Apply via Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/sql
2. Copy the entire contents of:
   ```
   supabase/migrations/20251120153000_profile_provider_metadata.sql
   ```
3. Paste into the SQL editor
4. Click **Run** button
5. Verify success message appears

## Option 2: Apply via Supabase CLI

```bash
# Make sure Docker is running
cd /Users/marcelo/Documents/Curios

# Link to your production project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Push the migration
supabase db push

# Verify it was applied
supabase db remote commit
```

## Option 3: Apply Manually (if CLI fails)

Run this SQL directly in Supabase SQL Editor:

```sql
-- Add new columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS auth_provider text NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS last_sign_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sign_in_provider text;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_auth_provider
  ON profiles(auth_provider);

-- Backfill existing users
UPDATE profiles AS p
SET
  display_name = COALESCE(p.display_name, NULLIF(u.raw_user_meta_data->>'full_name', ''), NULLIF(u.raw_user_meta_data->>'name', ''), split_part(COALESCE(u.email, ''), '@', 1)),
  avatar_url = COALESCE(p.avatar_url, NULLIF(u.raw_user_meta_data->>'avatar_url', ''), NULLIF(u.raw_user_meta_data->>'picture', '')),
  auth_provider = COALESCE(u.raw_app_meta_data->>'provider', p.auth_provider, 'email'),
  last_sign_in_at = COALESCE(u.last_sign_in_at, p.last_sign_in_at),
  last_sign_in_provider = COALESCE(u.raw_app_meta_data->>'provider', p.last_sign_in_provider, 'email')
FROM auth.users AS u
WHERE u.id = p.id;
```

## Verification

After applying the migration:

1. Check that new columns exist:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'profiles' 
   AND column_name IN ('display_name', 'avatar_url', 'auth_provider', 'last_sign_in_provider');
   ```

2. Verify Google OAuth users have metadata:
   ```sql
   SELECT id, email, display_name, avatar_url, auth_provider
   FROM profiles
   WHERE auth_provider = 'google'
   LIMIT 5;
   ```

3. Test Google sign-in again - errors should be gone!

## Troubleshooting

**If migration fails with "column already exists":**
- This is fine, it means the columns were partially created
- Run just the backfill query to populate existing rows

**If you see "permission denied":**
- You may need to run as postgres superuser
- Use Supabase Dashboard SQL editor which has proper permissions

**If users still show errors after migration:**
- Clear browser localStorage and try signing in again
- Check browser console for different error messages
