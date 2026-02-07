# 🚀 Apply Migration - 3 Easy Methods

## ⚡ Quick Start (Choose ONE method)

### Method 1: Bash Script (Recommended - Fully Automated)

```bash
cd /Users/marcelo/Documents/Curios
./scripts/apply-migration.sh
```

**When prompted:**
1. Get your connection string from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/database
2. Look for "Connection string" → "URI" 
3. Copy the full string (format: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`)
4. Paste it when the script asks
5. Script will automatically apply migration and verify success

---

### Method 2: Direct psql Command

```bash
cd /Users/marcelo/Documents/Curios

# Replace YOUR_CONNECTION_STRING with actual connection string
psql "YOUR_CONNECTION_STRING" -f supabase/migrations/apply-profile-metadata.sql
```

**Get connection string:**
1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/database
2. Copy "Connection string" → "URI"
3. Replace `[YOUR-PASSWORD]` with your actual database password

---

### Method 3: Copy/Paste in Supabase Dashboard (No CLI needed)

1. **Open Supabase SQL Editor:**
   - Go to: https://supabase.com/dashboard
   - Select your CuriosAI project
   - Click "SQL Editor" in sidebar
   - Click "New query"

2. **Copy the SQL:**
   ```bash
   cat /Users/marcelo/Documents/Curios/supabase/migrations/20251120153000_profile_provider_metadata.sql
   ```

3. **Paste and Run:**
   - Paste the entire SQL into the editor
   - Click the green "Run" button
   - Wait 1-3 seconds

4. **Verify Success:**
   You should see output showing:
   - 5 new columns created
   - User statistics
   - Sample data from profiles table

---

## 🔍 Verification

After applying migration, run this query to verify:

```sql
SELECT 
  column_name, 
  data_type
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('display_name', 'avatar_url', 'auth_provider');
```

You should see 3 rows returned.

---

## ✅ What Happens Next

1. **Google Sign-In users will have:**
   - ✅ Display name from Google account
   - ✅ Avatar URL from profile picture
   - ✅ Provider tracking ('google')

2. **Email Sign-In users will have:**
   - ✅ Display name from email prefix
   - ✅ Provider marked as 'email'

3. **The 400 errors will:**
   - ✅ Disappear completely
   - ✅ No more console errors

---

## 🆘 Troubleshooting

### "psql: command not found"
Install PostgreSQL client:
```bash
brew install postgresql
```

### "connection refused" or "timeout"
Check if your IP is whitelisted in Supabase:
- Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/database
- Scroll to "Network Restrictions"
- Click "Add restriction" → "Allow my IP"

### "permission denied"
You're using the connection string correctly - this shouldn't happen.
Use Method 3 (Supabase Dashboard) instead.

### "column already exists"
That's fine! It means the migration partially ran.
Run just the UPDATE query to backfill data:
```sql
UPDATE profiles AS p
SET
  display_name = COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  auth_provider = COALESCE(u.raw_app_meta_data->>'provider', 'email')
FROM auth.users AS u
WHERE u.id = p.id;
```

---

## 📝 Files Reference

- **Bash Script:** `scripts/apply-migration.sh`
- **SQL File:** `supabase/migrations/apply-profile-metadata.sql`
- **Original Migration:** `supabase/migrations/20251120153000_profile_provider_metadata.sql`

---

## ⏱️ Time Required

- Method 1 (Bash): 1 minute
- Method 2 (psql): 30 seconds
- Method 3 (Dashboard): 2 minutes

Choose whichever is easiest for you! 🚀
