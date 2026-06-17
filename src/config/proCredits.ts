// Pro Credits configuration — the single place that maps a user tier to its
// daily credit allowance and warning threshold. All values come from the
// environment so pricing/quota can change without code changes.

// NOTE: the tier union is inlined here (not imported from proCreditsService) to avoid
// a config ↔ service import cycle. It must stay in sync with ProTier in that file.
type ProTier = 'guest' | 'free' | 'pro';

const readInt = (key: string, fallback: number): number => {
  const raw = typeof import.meta !== 'undefined' ? import.meta.env?.[key] : undefined;
  const parsed = raw != null ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
};

export interface TierConfig {
  /** Pro credits granted per day. */
  dailyCredits: number;
  /** Remaining-credit count at or below which the warning state shows. */
  warningThreshold: number;
}

export const PRO_CREDITS_CONFIG: Record<ProTier, TierConfig> = {
  guest: {
    dailyCredits: readInt('VITE_GUEST_DAILY_PRO_CREDITS', 1),
    warningThreshold: 0, // guests have a single credit; no separate warning band
  },
  free: {
    dailyCredits: readInt('VITE_FREE_DAILY_PRO_CREDITS', 3),
    warningThreshold: readInt('VITE_FREE_WARNING_THRESHOLD', 1),
  },
  pro: {
    dailyCredits: readInt('VITE_PRO_DAILY_PRO_CREDITS', 25),
    warningThreshold: readInt('VITE_PRO_WARNING_THRESHOLD', 10),
  },
};
