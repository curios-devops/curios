// Turns the telemetry function's raw meters into what /tele shows: % used, where the month's
// pace will end, the day the quota runs out, and a traffic light.
//   green  ok · yellow pre-critical · red critical or unreachable · gray N.A. (no data)

export interface Meter {
  label: string;
  used: number;
  limit: number | null;
  unit: 'usd' | 'bytes' | 'users' | 'chars' | 'credits' | 'searches' | 'requests';
  kind: 'quota' | 'balance' | 'info';
  cycleStart?: string;
  cycleEnd?: string;
  burnPerDay?: number;
}
export interface Provider { id: string; name: string; reachable: boolean | null; meters: Meter[]; note?: string }

export type Level = 'ok' | 'warn' | 'critical' | 'na' | 'down';
export interface Assessment {
  level: Level | 'info';
  /** used / limit (0–1+) */
  pct: number | null;
  /** used / limit at the end of the cycle at the current pace */
  projectedPct: number | null;
  /** used at the end of the cycle at the current pace (also without a limit, e.g. $ spent) */
  projectedUsed: number | null;
  /** when the quota runs out at this pace (before the cycle ends), or now if it already did */
  exhaustAt: Date | null;
  /** prepaid balance: days left at the current spend */
  daysLeft: number | null;
}

const DAY = 864e5;
export const WARN = { pct: 0.7, projected: 0.8 };
export const CRITICAL = { pct: 0.9, projected: 1 };
const LOW_BALANCE_USD = 2;

export function assessMeter(m: Meter, now = new Date()): Assessment {
  const base: Assessment = { level: 'info', pct: null, projectedPct: null, projectedUsed: null, exhaustAt: null, daysLeft: null };

  if (m.kind === 'balance') {
    const daysLeft = m.burnPerDay && m.burnPerDay > 0 ? m.used / m.burnPerDay : null;
    const level = m.used <= 0 || (daysLeft !== null && daysLeft < 3) ? 'critical'
      : m.used < LOW_BALANCE_USD || (daysLeft !== null && daysLeft < 10) ? 'warn' : 'ok';
    return { ...base, level, daysLeft, exhaustAt: daysLeft !== null ? new Date(now.getTime() + daysLeft * DAY) : null };
  }
  if (m.kind === 'info') return base;

  // Pace over the billing cycle; in its first day a projection would be noise.
  let pace: number | null = null;
  if (m.cycleStart && m.cycleEnd) {
    const start = new Date(m.cycleStart).getTime(), end = new Date(m.cycleEnd).getTime();
    const elapsed = now.getTime() - start;
    if (elapsed >= DAY && end > start) pace = (end - start) / elapsed;
  }
  const projectedUsed = pace !== null ? m.used * pace : null;
  if (!m.limit) return { ...base, projectedUsed };

  const pct = m.used / m.limit;
  const projectedPct = projectedUsed !== null ? projectedUsed / m.limit : null;
  let exhaustAt: Date | null = null;
  if (pct >= 1) exhaustAt = now;
  else if (projectedPct !== null && projectedPct > 1 && m.cycleStart) {
    const start = new Date(m.cycleStart).getTime();
    exhaustAt = new Date(start + (now.getTime() - start) / pct);
  }
  const level = pct >= CRITICAL.pct || (projectedPct ?? 0) >= CRITICAL.projected ? 'critical'
    : pct >= WARN.pct || (projectedPct ?? 0) >= WARN.projected ? 'warn' : 'ok';
  return { level, pct, projectedPct, projectedUsed, exhaustAt, daysLeft: null };
}

const RANK: Record<Level, number> = { na: 0, ok: 1, warn: 2, critical: 3, down: 4 };

/** The provider's light: unreachable → down, no data → N.A., else its worst meter. */
export function providerLevel(p: Provider, now = new Date()): Level {
  if (p.reachable === false) return 'down';
  if (p.reachable === null || p.meters.length === 0) return 'na';
  return p.meters.reduce<Level>((worst, m) => {
    const l = assessMeter(m, now).level;
    const level: Level = l === 'info' ? 'ok' : l;
    return RANK[level] > RANK[worst] ? level : worst;
  }, 'ok');
}
