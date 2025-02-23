/*
  # Update Search Limits Based on User Type

  1. Changes
    - Update search limit reset function to handle Pro/Premium users differently
    - Set correct limits: 500 for Pro users, 5 for regular users
    - Add validation to ensure limits don't exceed maximums
    - Add trigger to update limits when subscription status changes

  2. Security
    - Maintain existing RLS policies
    - Add check constraints for search limits
*/

-- Drop existing trigger and function to recreate with updated logic
DROP TRIGGER IF EXISTS trigger_reset_daily_searches ON profiles;
DROP FUNCTION IF EXISTS reset_daily_searches();

-- Create improved reset function with proper limits
CREATE OR REPLACE FUNCTION reset_daily_searches()
RETURNS trigger AS $$
BEGIN
  -- Reset counter if more than 24 hours have passed
  IF NEW.searches_reset_at < now() - interval '1 day' THEN
    NEW.searches_reset_at := now();
    
    -- Set searches based on subscription status
    -- Premium/Pro users get 500 searches, regular users get 5
    NEW.remaining_searches := CASE 
      WHEN NEW.subscription_status = 'active' THEN 500
      ELSE 5
    END;
  END IF;

  -- Ensure limits are not exceeded
  IF NEW.subscription_status = 'active' THEN
    -- Pro users: cap at 500
    NEW.remaining_searches := LEAST(NEW.remaining_searches, 500);
  ELSE
    -- Regular users: cap at 5
    NEW.remaining_searches := LEAST(NEW.remaining_searches, 5);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for daily reset
CREATE TRIGGER trigger_reset_daily_searches
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION reset_daily_searches();

-- Add constraint to validate search limits
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_search_limits;
ALTER TABLE profiles ADD CONSTRAINT check_search_limits
  CHECK (
    (subscription_status = 'active' AND remaining_searches <= 500) OR
    (subscription_status != 'active' AND remaining_searches <= 5)
  );

-- Function to handle subscription status changes
CREATE OR REPLACE FUNCTION handle_subscription_change()
RETURNS trigger AS $$
BEGIN
  -- Update search limits when subscription status changes
  IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status THEN
    -- Set appropriate limit based on new status
    NEW.remaining_searches := CASE 
      WHEN NEW.subscription_status = 'active' THEN 500
      ELSE 5
    END;
    -- Reset the timer
    NEW.searches_reset_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for subscription changes
DROP TRIGGER IF EXISTS on_subscription_change ON profiles;
CREATE TRIGGER on_subscription_change
  BEFORE UPDATE OF subscription_status ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_subscription_change();

-- Update all existing profiles to have correct search limits
UPDATE profiles
SET 
  remaining_searches = CASE 
    WHEN subscription_status = 'active' THEN 500 
    ELSE 5 
  END,
  searches_reset_at = now()
WHERE 
  (subscription_status = 'active' AND remaining_searches != 500) OR
  (subscription_status != 'active' AND remaining_searches != 5);