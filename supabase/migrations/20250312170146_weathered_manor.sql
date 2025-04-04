/*
  # Fix Pro User Search Limits

  1. Changes
    - Update reset_daily_searches function to properly reset Pro users to 500 searches
    - Fix subscription change handler to set correct limits
    - Add validation to ensure Pro users get 500 searches
    - Ensure daily reset maintains Pro user limits

  2. Security
    - Maintain existing RLS policies
    - No changes to security model needed
*/

-- Drop existing triggers first
DROP TRIGGER IF EXISTS trigger_reset_daily_searches ON profiles;
DROP TRIGGER IF EXISTS on_subscription_change ON profiles;

-- Create improved reset function with proper Pro limits
CREATE OR REPLACE FUNCTION reset_daily_searches()
RETURNS TRIGGER AS $$
BEGIN
  -- Reset counter if more than 24 hours have passed
  IF NEW.searches_reset_at < NOW() - INTERVAL '24 hours' THEN
    -- CRITICAL: Set searches based on subscription status
    -- Pro/Premium users MUST get 500 searches
    NEW.remaining_searches := CASE 
      WHEN NEW.subscription_status = 'active' THEN 500
      ELSE 5
    END;
    
    NEW.searches_reset_at := NOW();
  END IF;

  -- IMPORTANT: Always ensure Pro users have correct limit
  -- This handles cases where subscription status changes
  IF NEW.subscription_status = 'active' AND NEW.remaining_searches < 500 THEN
    NEW.remaining_searches := 500;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for daily reset
CREATE TRIGGER trigger_reset_daily_searches
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION reset_daily_searches();

-- Create function to handle subscription changes
CREATE OR REPLACE FUNCTION handle_subscription_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When subscription becomes active, ALWAYS set to 500
  IF NEW.subscription_status = 'active' AND 
     (OLD.subscription_status IS NULL OR OLD.subscription_status != 'active') THEN
    NEW.remaining_searches := 500;
    NEW.searches_reset_at := NOW();
  -- When subscription becomes inactive, set to standard limit
  ELSIF NEW.subscription_status != 'active' AND 
        (OLD.subscription_status IS NULL OR OLD.subscription_status = 'active') THEN
    NEW.remaining_searches := 5;
    NEW.searches_reset_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for subscription changes
CREATE TRIGGER on_subscription_change
  BEFORE UPDATE OF subscription_status ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_subscription_change();

-- Update all existing Pro users to have correct search limits
UPDATE profiles
SET 
  remaining_searches = 500,
  searches_reset_at = NOW()
WHERE 
  subscription_status = 'active' 
  AND remaining_searches < 500;