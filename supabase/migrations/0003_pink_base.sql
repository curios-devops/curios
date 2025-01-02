/*
  # Add subscription fields to profiles table

  1. Changes
    - Add Stripe-related columns to profiles table:
      - stripe_customer_id
      - stripe_subscription_id
      - stripe_price_id
      - subscription_status
      - subscription_period_end
    
  2. Security
    - Maintain existing RLS policies
    - Users can only read their own subscription data
*/

-- Add new columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_price_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_period_end timestamptz;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);

-- Update RLS policies
CREATE POLICY "Users can read own subscription data"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);