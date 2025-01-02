/*
  # Add search tracking
  
  1. New Fields
    - remaining_searches: Track daily search quota (default 6 for free users)
    - searches_reset_at: Timestamp for daily reset
  
  2. Changes
    - Add columns with proper defaults
    - Add index for performance
    - Add trigger for daily reset
*/

-- Add search tracking columns safely
DO $$ 
BEGIN
  -- Add remaining_searches if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'remaining_searches') 
  THEN
    ALTER TABLE profiles ADD COLUMN remaining_searches integer DEFAULT 6;
  END IF;

  -- Add searches_reset_at if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'searches_reset_at') 
  THEN
    ALTER TABLE profiles ADD COLUMN searches_reset_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_searches_reset_at 
ON profiles(searches_reset_at);

-- Create or replace the reset function
CREATE OR REPLACE FUNCTION reset_daily_searches()
RETURNS trigger AS $$
BEGIN
  -- Reset counter if more than 24 hours have passed
  IF NEW.searches_reset_at < now() - interval '1 day' THEN
    NEW.searches_reset_at := now();
    -- Set searches based on subscription status
    NEW.remaining_searches := CASE 
      WHEN NEW.subscription_status = 'active' THEN 600
      ELSE 6
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Safely create the trigger
DROP TRIGGER IF EXISTS trigger_reset_daily_searches ON profiles;
CREATE TRIGGER trigger_reset_daily_searches
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION reset_daily_searches();