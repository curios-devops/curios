/*
  # Remove legacy daily-search-quota logic

  The remaining_searches / searches_reset_at columns were a legacy daily quota
  (500/day for pro, 5-6 for free). Nothing reads them anymore — gating now runs
  through the Pro Credits system (profiles.remaining_pro_quota, default
  VITE_PRO_DAILY_PRO_CREDITS = 25). These two triggers still fired on every
  profile UPDATE, re-deriving the dead columns (including resetting them to
  500/600), so we drop them.

  Columns remaining_searches / searches_reset_at are left in place (dormant, no
  longer written by the app) and can be dropped in a later migration once we're
  confident nothing external depends on them.
*/

DROP TRIGGER IF EXISTS on_subscription_update ON profiles;
DROP FUNCTION IF EXISTS handle_subscription_update();

DROP TRIGGER IF EXISTS trigger_reset_daily_searches ON profiles;
DROP FUNCTION IF EXISTS reset_daily_searches();
