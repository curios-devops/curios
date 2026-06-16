// proCreditsService — the SINGLE authority for all Pro Feature access decisions.
//
// No feature should implement its own credit logic. This service owns:
//   tier resolution · remaining credits · warning/battery state · access checks
//   · credit consumption · lazy daily reset.
//
// Storage (reusing existing infrastructure, no new tables/columns):
//   guest      → localStorage (no DB row exists for anonymous visitors)
//   free / pro → profiles.remaining_pro_quota + profiles.pro_quota_reset_at
//                (dormant columns from 20250707000000_add_pro_quota.sql)
//
// Daily reset is lazy: every read compares today > last reset date and refills.
// No cron / scheduled jobs / background workers.

import type { Session } from '@supabase/supabase-js';
import { supabase, handleSupabaseOperation } from '../lib/supabase.ts';
import type { Subscription } from '../hooks/useSubscription.ts';
import { PRO_CREDITS_CONFIG } from '../config/proCredits.ts';

export type ProTier = 'guest' | 'free' | 'pro';
export type BatteryLevel = 'full' | 'medium' | 'low' | 'empty';
export type WarningState = 'none' | 'warning' | 'exhausted';

export interface CreditState {
  tier: ProTier;
  remaining: number;
  max: number;
  warning: WarningState;
  battery: BatteryLevel;
  canUse: boolean;
}

const GUEST_STORAGE_KEY = 'curios_pro_credits_guest';

// ── Date helpers (local day granularity) ─────────────────────────────────────
function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC day)
}

function dayKeyOf(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function needsReset(lastResetDay: string): boolean {
  return todayKey() > lastResetDay;
}

// ── Pure derivations ─────────────────────────────────────────────────────────

/** Resolve the user's tier. Subscription is the source of truth for Pro. */
export function getUserTier(
  session: Session | null,
  subscription: Subscription | null,
): ProTier {
  if (subscription?.isActive) return 'pro';
  if (session?.user) return 'free';
  return 'guest';
}

export function maxCreditsFor(tier: ProTier): number {
  return PRO_CREDITS_CONFIG[tier].dailyCredits;
}

export function getWarningState(tier: ProTier, remaining: number): WarningState {
  if (remaining <= 0) return 'exhausted';
  if (remaining <= PRO_CREDITS_CONFIG[tier].warningThreshold) return 'warning';
  return 'none';
}

export function getBatteryState(remaining: number, max: number): BatteryLevel {
  if (remaining <= 0 || max <= 0) return 'empty';
  const ratio = remaining / max;
  if (ratio > 0.5) return 'full';
  if (ratio > 0.2) return 'medium';
  return 'low';
}

export function canUseProFeature(remaining: number): boolean {
  return remaining > 0;
}

function toState(tier: ProTier, remaining: number): CreditState {
  const max = maxCreditsFor(tier);
  const clamped = Math.max(0, Math.min(remaining, max));
  return {
    tier,
    remaining: clamped,
    max,
    warning: getWarningState(tier, clamped),
    battery: getBatteryState(clamped, max),
    canUse: canUseProFeature(clamped),
  };
}

// ── Guest storage (localStorage) ─────────────────────────────────────────────
interface GuestRecord {
  remaining: number;
  lastReset: string;
}

function readGuestRecord(tier: ProTier): GuestRecord {
  const max = maxCreditsFor(tier);
  if (typeof window === 'undefined') return { remaining: max, lastReset: todayKey() };
  try {
    const raw = window.localStorage.getItem(GUEST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GuestRecord>;
      if (typeof parsed.remaining === 'number' && typeof parsed.lastReset === 'string') {
        return { remaining: parsed.remaining, lastReset: parsed.lastReset };
      }
    }
  } catch {
    /* fall through to fresh record */
  }
  return { remaining: max, lastReset: todayKey() };
}

function writeGuestRecord(record: GuestRecord): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(record));
  } catch {
    /* storage unavailable — non-fatal */
  }
}

// ── State reads (with lazy reset) ────────────────────────────────────────────

/** Read the current credit state for the tier, applying the lazy daily reset. */
export async function getCreditState(
  tier: ProTier,
  session: Session | null,
): Promise<CreditState> {
  const max = maxCreditsFor(tier);

  if (tier === 'guest' || !session?.user) {
    let record = readGuestRecord('guest');
    if (needsReset(record.lastReset)) {
      record = { remaining: maxCreditsFor('guest'), lastReset: todayKey() };
      writeGuestRecord(record);
    }
    return toState('guest', record.remaining);
  }

  // free / pro → DB
  const row = await handleSupabaseOperation(
    async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('remaining_pro_quota, pro_quota_reset_at')
        .eq('id', session.user.id)
        .single();
      if (error) throw error;
      return data;
    },
    { remaining_pro_quota: max, pro_quota_reset_at: new Date().toISOString() },
  );

  const lastResetDay = dayKeyOf((row as { pro_quota_reset_at?: string }).pro_quota_reset_at);
  if (!lastResetDay || needsReset(lastResetDay)) {
    await writeRemaining(session, max);
    return toState(tier, max);
  }

  const remaining = typeof (row as { remaining_pro_quota?: number }).remaining_pro_quota === 'number'
    ? (row as { remaining_pro_quota: number }).remaining_pro_quota
    : max;
  return toState(tier, remaining);
}

async function writeRemaining(session: Session, remaining: number): Promise<void> {
  await handleSupabaseOperation(
    async () => {
      const { error } = await supabase
        .from('profiles')
        .update({
          remaining_pro_quota: remaining,
          pro_quota_reset_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);
      if (error) throw error;
    },
    undefined,
  );
}

/**
 * Consume one Pro Credit. Returns the updated state.
 * Blocks (and leaves the count unchanged) when no credits remain.
 */
export async function consumeCredit(
  tier: ProTier,
  session: Session | null,
  currentRemaining: number,
): Promise<{ ok: boolean; state: CreditState }> {
  if (currentRemaining <= 0) {
    return { ok: false, state: toState(tier, currentRemaining) };
  }
  const next = currentRemaining - 1;

  if (tier === 'guest' || !session?.user) {
    const record = readGuestRecord('guest');
    writeGuestRecord({ remaining: Math.max(0, next), lastReset: record.lastReset || todayKey() });
    return { ok: true, state: toState('guest', next) };
  }

  // free / pro → persist the decrement, only updating its own reset day if absent.
  await handleSupabaseOperation(
    async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ remaining_pro_quota: Math.max(0, next) })
        .eq('id', session.user.id);
      if (error) throw error;
    },
    undefined,
  );
  return { ok: true, state: toState(tier, next) };
}
