/*
  # Update search limits reset logic

  1. Changes
    - Update reset_daily_searches function to check subscription status
    - Set correct search limits based on user type:
      - Pro/Premium users: 500 searches
      - Standard users: 5 searches
    
  2. Security
    - No changes to RLS policies needed
    - Maintains existing security model
*/

-- Drop existing trigger first
DROP TRIGGER IF EXISTS trigger_reset_daily_searches ON profiles;

-- Create or replace the reset function with updated logic
CREATE OR REPLACE FUNCTION reset_daily_searches()
RETURNS trigger AS $$
BEGIN
  -- Reset counter if more than 24 hours have passed
  IF NEW.searches_reset_at < now() - interval '1 day' THEN
    NEW.searches_reset_at := now();
    
    -- Set searches based on subscription status
    -- Active subscribers get 500 searches, others get 5
    NEW.remaining_searches := CASE 
      WHEN NEW.subscription_status = 'active' THEN 500
      ELSE 5
    END;
  END IF;
  
  -- Ensure Pro users always have correct limit after subscription changes
  IF NEW.subscription_status = 'active' AND NEW.subscription_status IS DISTINCT FROM OLD.subscription_status THEN
    NEW.remaining_searches := 500;
    NEW.searches_reset_at := now();
  END IF;

  -- Ensure standard users have correct limit after subscription ends
  IF NEW.subscription_status = 'inactive' AND NEW.subscription_status IS DISTINCT FROM OLD.subscription_status THEN
    NEW.remaining_searches := 5;
    NEW.searches_reset_at := now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_reset_daily_searches
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION reset_daily_searches();

-- Update all existing profiles to have correct search limits
UPDATE profiles
SET 
  remaining_searches = CASE WHEN subscription_status = 'active' THEN 500 ELSE 5 END,
  searches_reset_at = now()
WHERE searches_reset_at < now() - interval '1 day'
   OR (subscription_status = 'active' AND remaining_searches < 500)
   OR (subscription_status != 'active' AND remaining_searches > 5);