import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';

// In-memory localStorage so the guest (localStorage-backed) path is exercised
// exactly as it runs in the browser. Must exist before the service is imported.
const store = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = globalThis;
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
} as Storage;

// Configurable Supabase stub. `mockRow` drives what the profiles read returns;
// `updates` records writes so we can assert the decrement/reset behavior.
let mockRow: Record<string, unknown> | null = null;
const updates: Record<string, unknown>[] = [];

vi.mock('../lib/supabase.ts', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: mockRow, error: mockRow ? null : { message: 'no row' } }),
        }),
      }),
      update: (payload: Record<string, unknown>) => {
        updates.push(payload);
        return { eq: async () => ({ error: null }) };
      },
    }),
  },
  handleSupabaseOperation: async <T>(op: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await op();
    } catch {
      return fallback;
    }
  },
}));

import {
  getUserTier,
  maxCreditsFor,
  getWarningState,
  getBatteryState,
  canUseProFeature,
  getCreditState,
  consumeCredit,
} from './proCreditsService.ts';

const freeSession = { user: { id: 'u1' } } as unknown as Session;

beforeEach(() => {
  store.clear();
  mockRow = null;
  updates.length = 0;
});

describe('getUserTier', () => {
  it('resolves pro when subscription is active (Stripe is source of truth)', () => {
    expect(getUserTier(freeSession, { isActive: true } as never)).toBe('pro');
  });
  it('resolves free when logged in without an active subscription', () => {
    expect(getUserTier(freeSession, { isActive: false } as never)).toBe('free');
    expect(getUserTier(freeSession, null)).toBe('free');
  });
  it('resolves guest when there is no session', () => {
    expect(getUserTier(null, null)).toBe('guest');
  });
});

describe('daily allowances (from config defaults: guest 1 / free 3 / pro 25)', () => {
  it('matches the spec per tier', () => {
    expect(maxCreditsFor('guest')).toBe(1);
    expect(maxCreditsFor('free')).toBe(3);
    expect(maxCreditsFor('pro')).toBe(25);
  });
});

describe('getWarningState — the boundaries that gate upsell/blocking UX', () => {
  it('guest: only blocks at 0 (no warning band)', () => {
    expect(getWarningState('guest', 1)).toBe('none');
    expect(getWarningState('guest', 0)).toBe('exhausted');
  });
  it('free: warns at 1, blocks at 0', () => {
    expect(getWarningState('free', 3)).toBe('none');
    expect(getWarningState('free', 2)).toBe('none');
    expect(getWarningState('free', 1)).toBe('warning');
    expect(getWarningState('free', 0)).toBe('exhausted');
  });
  it('pro: warns at <=10, blocks at 0', () => {
    expect(getWarningState('pro', 11)).toBe('none');
    expect(getWarningState('pro', 10)).toBe('warning');
    expect(getWarningState('pro', 1)).toBe('warning');
    expect(getWarningState('pro', 0)).toBe('exhausted');
  });
});

describe('getBatteryState — drives the indicator color', () => {
  it('maps the remaining/max ratio to full/medium/low/empty', () => {
    expect(getBatteryState(25, 25)).toBe('full'); // 100%
    expect(getBatteryState(13, 25)).toBe('full'); // 52%
    expect(getBatteryState(12, 25)).toBe('medium'); // 48%
    expect(getBatteryState(6, 25)).toBe('medium'); // 24%
    expect(getBatteryState(5, 25)).toBe('low'); // 20% (boundary -> low)
    expect(getBatteryState(0, 25)).toBe('empty');
  });
});

describe('canUseProFeature', () => {
  it('is true only with remaining credits', () => {
    expect(canUseProFeature(1)).toBe(true);
    expect(canUseProFeature(0)).toBe(false);
  });
});

describe('guest credit lifecycle (localStorage)', () => {
  it('consumes the single guest credit and then blocks', async () => {
    const first = await consumeCredit('guest', null, 1);
    expect(first.ok).toBe(true);
    expect(first.state.remaining).toBe(0);

    // Persisted to localStorage → next read reflects exhaustion.
    const state = await getCreditState('guest', null);
    expect(state.remaining).toBe(0);
    expect(state.canUse).toBe(false);
    expect(state.warning).toBe('exhausted');

    const second = await consumeCredit('guest', null, 0);
    expect(second.ok).toBe(false);
  });

  it('lazily resets when the stored reset day is in the past', async () => {
    store.set(
      'curios_pro_credits_guest',
      JSON.stringify({ remaining: 0, lastReset: '2000-01-01' }),
    );
    const state = await getCreditState('guest', null);
    expect(state.remaining).toBe(1); // refilled to guest max
    expect(state.canUse).toBe(true);
  });
});

describe('registered users (DB-backed)', () => {
  it('blocks consumption at zero without writing to the DB', async () => {
    const res = await consumeCredit('free', freeSession, 0);
    expect(res.ok).toBe(false);
    expect(updates).toHaveLength(0);
  });

  it('decrements and persists when credits remain', async () => {
    const res = await consumeCredit('pro', freeSession, 25);
    expect(res.ok).toBe(true);
    expect(res.state.remaining).toBe(24);
    expect(updates).toContainEqual({ remaining_pro_quota: 24 });
  });

  it('lazily resets to the tier max when the stored reset day is in the past', async () => {
    mockRow = { remaining_pro_quota: 0, pro_quota_reset_at: '2000-01-01T00:00:00Z' };
    const state = await getCreditState('free', freeSession);
    expect(state.remaining).toBe(3); // refilled to free max
    // A reset persists both the count and a fresh reset timestamp.
    expect(updates[0]).toHaveProperty('remaining_pro_quota', 3);
    expect(updates[0]).toHaveProperty('pro_quota_reset_at');
  });

  it('clamps a stale higher stored value down to the current tier max', async () => {
    // e.g. legacy default of 5 for a free user (max 3), same reset day → clamp.
    mockRow = { remaining_pro_quota: 5, pro_quota_reset_at: new Date().toISOString() };
    const state = await getCreditState('free', freeSession);
    expect(state.remaining).toBe(3);
  });
});
