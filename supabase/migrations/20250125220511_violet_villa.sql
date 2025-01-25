/*
  # Update Subscription Fields

  1. Changes
    - Add default values for subscription fields
    - Add validation constraints
    - Update search limits for pro users

  2. Security
    - Maintain existing RLS policies
*/

-- Add default values and constraints to subscription fields
ALTER TABLE profiles
  ALTER COLUMN stripe_customer_id SET DEFAULT NULL,
  ALTER COLUMN stripe_subscription_id SET DEFAULT NULL,
  ALTER COLUMN stripe_price_id SET DEFAULT NULL,
  ALTER COLUMN subscription_status SET DEFAULT 'inactive',
  ALTER COLUMN subscription_period_end SET DEFAULT NULL,
  ALTER COLUMN remaining_searches SET DEFAULT 5;

-- Add check constraint for subscription status
ALTER TABLE profiles
  ADD CONSTRAINT valid_subscription_status 
  CHECK (subscription_status IN ('active', 'inactive', 'past_due', 'canceled', 'trialing'));

-- Create function to handle subscription updates
CREATE OR REPLACE FUNCTION handle_subscription_update()
RETURNS trigger AS $$
BEGIN
  -- Update remaining searches based on subscription status
  IF NEW.subscription_status = 'active' THEN
    NEW.remaining_searches := 500;
  ELSE
    NEW.remaining_searches := 5;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for subscription updates
DROP TRIGGER IF EXISTS on_subscription_update ON profiles;
CREATE TRIGGER on_subscription_update
  BEFORE UPDATE OF subscription_status ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_subscription_update();