-- Migration: Add accent_color column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS accent_color text NOT NULL DEFAULT 'blue';

COMMENT ON COLUMN profiles.accent_color IS 'User preferred accent color (blue, green, purple, orange)';