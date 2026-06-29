/*
  # Add subscription start + pro flag to profiles table

  1. Changes
    - Add subscription_period_start: when the current billing period began
      (complements the existing subscription_period_end).
    - Add is_pro: a generated boolean, true whenever subscription_status = 'active'.
      Always stays in sync with subscription_status, so no webhook logic to maintain.
    - Add a partial index on is_pro for fast "active subscribers" lookups.

  2. Notes
    - is_pro is GENERATED ALWAYS ... STORED: it cannot be written directly; it is
      derived from subscription_status. Existing rows are backfilled automatically.
    - RLS policies are unchanged (users already read their own profile row).
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_period_start timestamptz;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_pro boolean
  GENERATED ALWAYS AS (subscription_status = 'active') STORED;

CREATE INDEX IF NOT EXISTS idx_profiles_is_pro ON profiles(is_pro) WHERE is_pro;
