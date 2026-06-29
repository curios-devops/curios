/*
  # Rename Pro Credits columns: pro_quota -> credits

  Additive, zero-downtime rename of the daily Pro Credits columns to clearer
  names. We ADD the new columns and backfill from the old ones, leaving the old
  columns in place (dormant) so the currently-deployed frontend — which still
  reads remaining_pro_quota / pro_quota_reset_at — keeps working until the new
  code ships. The old columns can be dropped in a later migration.

    remaining_pro_quota -> remaining_credits
    pro_quota_reset_at  -> credits_reset_at

  Stripe/subscription columns are untouched.
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS remaining_credits INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS credits_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Backfill from the existing columns so no one loses their current balance.
UPDATE profiles
SET remaining_credits = remaining_pro_quota,
    credits_reset_at = pro_quota_reset_at
WHERE remaining_pro_quota IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_credits_reset_at ON profiles(credits_reset_at);
