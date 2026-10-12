import { describe, it, expect } from 'vitest';
import { assessMeter, providerLevel, type Meter, type Provider } from './assess.ts';

// October 2026 cycle; "now" is the 11th day at midnight (10 of 31 days elapsed).
const cycle = { cycleStart: '2026-10-01T00:00:00Z', cycleEnd: '2026-11-01T00:00:00Z' };
const now = new Date('2026-10-11T00:00:00Z');
const quota = (used: number, limit: number | null): Meter => ({ label: 'q', used, limit, unit: 'searches', kind: 'quota', ...cycle });

describe('assessMeter — quotas', () => {
  it('warns red before the quota runs out when the month pace overshoots it, and says when', () => {
    // 50% used after 10 of 31 days → ~155% by month end: still under 90% today, but must be red.
    const a = assessMeter(quota(125, 250), now);
    expect(a.pct).toBeCloseTo(0.5);
    expect(a.projectedPct).toBeCloseTo(1.55, 2);
    expect(a.level).toBe('critical');
    expect(a.exhaustAt?.toISOString().slice(0, 10)).toBe('2026-10-21'); // 10 days for half → 20 for all
  });

  it('a quota already used up is red and exhausted now (SerpAPI 250/250)', () => {
    const a = assessMeter(quota(250, 250), now);
    expect(a.level).toBe('critical');
    expect(a.exhaustAt).toEqual(now);
  });

  it('pre-critical pace (80–100% projected) is yellow, a calm pace is green', () => {
    expect(assessMeter(quota(28, 100), now).level).toBe('warn'); // → ~87%
    expect(assessMeter(quota(10, 100), now).level).toBe('ok'); // → ~31%
  });

  it('does not project from the first day of the cycle (one early burst is not a trend)', () => {
    const a = assessMeter(quota(60, 100), new Date('2026-10-01T06:00:00Z'));
    expect(a.projectedPct).toBeNull();
    expect(a.level).toBe('ok');
  });

  it('a spend without a limit still projects the month but has no light', () => {
    const a = assessMeter(quota(10, null), now);
    expect(a.projectedUsed).toBeCloseTo(31);
    expect(a.level).toBe('info');
  });
});

describe('assessMeter — prepaid balances', () => {
  const balance = (used: number, burnPerDay?: number): Meter => ({ label: 'b', used, limit: null, unit: 'usd', kind: 'balance', burnPerDay });

  it('an empty or negative balance is red (jobs will fail)', () => {
    expect(assessMeter(balance(-0.01), now).level).toBe('critical');
  });

  it('uses the spend rate for days left: under 3 days red, under 10 yellow', () => {
    expect(assessMeter(balance(20, 10), now).level).toBe('critical');
    const a = assessMeter(balance(50, 10), now);
    expect(a.daysLeft).toBe(5);
    expect(a.level).toBe('warn');
    expect(assessMeter(balance(500, 10), now).level).toBe('ok');
  });

  it('without a spend rate only a low balance warns', () => {
    expect(assessMeter(balance(1.5), now).level).toBe('warn');
    expect(assessMeter(balance(5.58), now).level).toBe('ok');
  });
});

describe('providerLevel', () => {
  const p = (reachable: boolean | null, meters: Meter[] = []): Provider => ({ id: 'x', name: 'X', reachable, meters });

  it('an unreachable API is red even with no data, so it gets investigated', () => {
    expect(providerLevel(p(false), now)).toBe('down');
  });

  it('no key or no usage data is N.A., not green', () => {
    expect(providerLevel(p(null), now)).toBe('na');
    expect(providerLevel(p(true), now)).toBe('na');
  });

  it('takes the worst of its meters', () => {
    expect(providerLevel(p(true, [quota(10, 100), quota(250, 250)]), now)).toBe('critical');
  });
});
