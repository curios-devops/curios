# Apply Accent Color Migration to Supabase Production

## Overview
This migration adds an `accent_color` column to the `profiles` table to persist user accent color preferences.

## Steps to Apply Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. **Open your Supabase project dashboard**
   - Go to https://app.supabase.com/
   - Select your production project

2. **Navigate to the SQL Editor**
   - Click on "SQL Editor" in the left sidebar

3. **Run the migration**
   - Copy and paste the following SQL:
   ```sql
   ALTER TABLE profiles 
   ADD COLUMN IF NOT EXISTS accent_color text NOT NULL DEFAULT 'blue';

   COMMENT ON COLUMN profiles.accent_color IS 'User preferred accent color (blue, green, purple, orange)';
   ```
   - Click "Run" to execute

4. **Verify the migration**
   - Go to "Table Editor" in the left sidebar
   - Select the `profiles` table
   - Confirm that the `accent_color` column now appears
   - The column should show default value `'blue'` (NOT NULL)

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed and configured:

```bash
# Make sure you're logged in
supabase login

# Link to your production project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Push the migration
supabase db push
```

## Validation

After applying the migration, test that it works:

1. **Sign in to your app**
2. **Change the accent color** (e.g., to purple)
3. **Sign out**
4. **Check the database**:
   - Go to Supabase Dashboard → Table Editor → profiles
   - Find your user row
   - Verify that `accent_color` shows "purple"
5. **Change accent color locally** (e.g., to green)
6. **Sign in again**
   - The UI should display purple (loaded from Supabase)

## Supported Accent Colors

The app supports these accent color values:
- `blue` (default)
- `green`
- `purple`
- `orange`

## Rollback (if needed)

If you need to remove the column:

```sql
ALTER TABLE profiles DROP COLUMN accent_color;
```

## Notes

- The `accent_color` column has a default value of `'blue'` (NOT NULL)
- All existing users will automatically have `'blue'` as their accent color
- The migration file is located at: `supabase/migrations/20251024_add_accent_color_column.sql`
