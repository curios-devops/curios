/*
  # Add language column to profiles table

  1. Changes
    - Add `language` column to `profiles` table
      - Type: text
      - Default: 'en' (English)
      - Not null
    
  2. Notes
    - This allows users to save their preferred language
    - Default to English for existing users
*/

-- Add language column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';

-- Add comment to document the column
COMMENT ON COLUMN profiles.language IS 'User preferred language code (e.g., en, es, fr)';
