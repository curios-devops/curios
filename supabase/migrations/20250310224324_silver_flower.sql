/*
  # Update search limits for active subscribers

  1. Changes
    - Adds a trigger function to ensure active subscribers get 500 daily searches
    - Updates existing trigger to handle search limit resets correctly

  2. Details
    - When subscription_status changes to 'active', sets remaining_searches to 500
    - When daily reset occurs, respects subscription status:
      - Active subscribers: Reset to 500 searches
      - Others: Reset to 5 searches
*/

-- Drop existing trigger function if it exists
DROP FUNCTION IF EXISTS reset_daily_searches CASCADE;

-- Create new trigger function with proper search limits
CREATE OR REPLACE FUNCTION reset_daily_searches()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if we need to reset based on searches_reset_at
  IF NEW.searches_reset_at < NOW() - INTERVAL '24 hours' THEN
    -- Set appropriate search limit based on subscription status
    IF NEW.subscription_status = 'active' THEN
      NEW.remaining_searches := 500;
    ELSE
      NEW.remaining_searches := 5;
    END IF;
    
    NEW.searches_reset_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_reset_daily_searches ON profiles;
CREATE TRIGGER trigger_reset_daily_searches
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION reset_daily_searches();

-- Create function to handle subscription status changes
CREATE OR REPLACE FUNCTION handle_subscription_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When subscription becomes active, set search limit to 500
  IF NEW.subscription_status = 'active' AND 
     (OLD.subscription_status IS NULL OR OLD.subscription_status != 'active') THEN
    NEW.remaining_searches := 500;
  -- When subscription becomes inactive, set search limit to 5
  ELSIF NEW.subscription_status != 'active' AND 
        (OLD.subscription_status IS NULL OR OLD.subscription_status = 'active') THEN
    NEW.remaining_searches := 5;
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