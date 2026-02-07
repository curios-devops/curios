# 🚀 Apply Profile Metadata Migration - Step by Step

## ✅ Current Status
- **Hotfix deployed**: Your app now handles missing columns gracefully (commit ec7cfdb)
- **Safe to proceed**: Migration can be applied without breaking the app

---

## 📋 STEP-BY-STEP INSTRUCTIONS

### Step 1: Open Supabase Dashboard
1. Go to: **https://supabase.com/dashboard**
2. Log in to your account
3. Select your **CuriosAI project**

### Step 2: Navigate to SQL Editor
1. In the left sidebar, click **"SQL Editor"**
2. Click **"New query"** button (or press `Ctrl/Cmd + Enter`)

### Step 3: Copy the Migration SQL
Copy this entire SQL block:

```sql
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
```

### Step 4: Paste and Run
1. **Paste** the SQL into the editor
2. Click the green **"Run"** button (or press `Ctrl/Cmd + Enter`)
3. Wait for execution (should take 1-3 seconds)

### Step 5: Verify Success
You should see:
```
Success. No rows returned
```

If you see any errors, copy them and let me know!

### Step 6: Verify Columns Were Created
Run this verification query in a new SQL editor tab:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('display_name', 'avatar_url', 'auth_provider', 'last_sign_in_provider', 'last_sign_in_at')
ORDER BY column_name;
```

You should see 5 rows showing the new columns.

### Step 7: Check Existing Users Were Updated
Run this query to see if your existing users got their metadata:

```sql
SELECT 
  id,
  email,
  display_name,
  auth_provider,
  last_sign_in_provider,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 10;
```

You should see:
- `display_name` populated for users (extracted from email if needed)
- `auth_provider` set to either 'google' or 'email'
- `last_sign_in_provider` showing which method they used last

---

## ✅ What to Expect After Migration

### Google Sign-In Users Will Now Have:
- ✅ Display name from their Google account
- ✅ Avatar URL from their Google profile picture
- ✅ Provider tracking ('google' in auth_provider)
- ✅ Last sign-in timestamps

### Email Sign-In Users Will Have:
- ✅ Display name from email prefix (e.g., 'john' from john@example.com)
- ✅ Provider marked as 'email'
- ✅ All other metadata blank (as expected)

### The 400 Bad Request Errors Will:
- ✅ **DISAPPEAR** on next sign-in
- ✅ No more "column does not exist" errors in console
- ✅ App will now store and display OAuth metadata

---

## 🔍 Troubleshooting

### Error: "permission denied for table profiles"
**Solution**: You're already in the SQL Editor as admin, this shouldn't happen. If it does, contact Supabase support.

### Error: "column already exists"
**Solution**: That's fine! It means some columns were partially created. Just run the backfill UPDATE query separately:

```sql
UPDATE profiles AS p
SET
  display_name = COALESCE(p.display_name, NULLIF(u.raw_user_meta_data->>'full_name', ''), split_part(COALESCE(u.email, ''), '@', 1)),
  auth_provider = COALESCE(u.raw_app_meta_data->>'provider', 'email')
FROM auth.users AS u
WHERE u.id = p.id;
```

### Still seeing errors after migration?
1. Clear browser cache: `localStorage.clear(); sessionStorage.clear(); location.reload();`
2. Sign out completely
3. Sign in again with Google
4. Check browser console - errors should be gone!

---

## 📧 Need Help?
If you see any errors during migration:
1. Copy the EXACT error message
2. Take a screenshot of the SQL Editor showing the error
3. Let me know and I'll help troubleshoot!
