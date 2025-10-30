# Apply Language Column Migration

## Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/gpfccicfqynahflehpqo
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste this SQL:

```sql
-- Add language column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';

-- Add comment to document the column
COMMENT ON COLUMN profiles.language IS 'User preferred language code (e.g., en, es, fr)';
```

5. Click **Run** or press `Ctrl+Enter` (Mac: `Cmd+Enter`)
6. Verify the column was added by going to **Table Editor** → **profiles**

## Option 2: Using Supabase CLI

If you have Supabase CLI installed and linked to your project:

```bash
# Navigate to project directory
cd /Users/marcelo/Documents/Curios

# Apply the migration
supabase db push

# Or apply just this migration
supabase migration up --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.gpfccicfqynahflehpqo.supabase.co:5432/postgres"
```

## Verify the Migration

After applying, verify the column exists:

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'language';
```

You should see:
- column_name: `language`
- data_type: `text`
- column_default: `'en'::text`

## Testing

Once the migration is applied, the app will:
1. ✅ Save language preference to the database when a signed-in user changes language
2. ✅ Load saved language preference from database on sign-in
3. ✅ Fall back to localStorage and browser language for guest users
4. ✅ No more 400 errors when querying profiles table

The migration file is already created at:
`/Users/marcelo/Documents/Curios/supabase/migrations/20251024_add_language_column.sql`
