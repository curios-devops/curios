// ProCreditsBattery — minimal battery-style status indicator for remaining Pro
// Credits, shown inline with the Login / Get Started actions. The battery holds
// 5 bars that deplete as the quota is spent; the color follows a traffic-light
// convention (green → yellow → red), with a dimmed gray for exhausted. The exact
// count lives in the hover tooltip. Status only.

import { useProCredits } from '../providers/ProCreditsProvider.tsx';
import type { BatteryLevel } from '../services/proCreditsService.ts';

const COLOR: Record<BatteryLevel, string> = {
  full: '#22c55e', // green
  medium: '#eab308', // yellow
  low: '#ef4444', // red
  empty: '#9ca3af', // exhausted / disabled
};

const TOTAL_BARS = 5;

export default function ProCreditsBattery() {
  const { remaining, max, battery, loading } = useProCredits();

  if (loading) return null;

  const color = COLOR[battery];
  // Proportional fill; keep at least one bar lit while any credit remains.
  const filledBars =
    remaining <= 0 || max <= 0 ? 0 : Math.max(1, Math.round((remaining / max) * TOTAL_BARS));

  return (
    <div className="inline-flex items-center self-center leading-none select-none" title={`Pro Credits: ${remaining}/${max}`}>
      {/* Battery body with depleting bars */}
      <div
        className="inline-flex items-center gap-[2px] rounded-[3px] border"
        style={{ borderColor: color, height: '14px', padding: '0 2px' }}
      >
        {Array.from({ length: TOTAL_BARS }).map((_, i) => (
          <span
            key={i}
            style={{
              width: '3px',
              height: '8px',
              borderRadius: '1px',
              backgroundColor: color,
              opacity: i < filledBars ? 1 : 0.2,
            }}
          />
        ))}
      </div>
      {/* Battery nub */}
      <div style={{ width: '2px', height: '6px', backgroundColor: color, borderRadius: '0 1px 1px 0' }} />
    </div>
  );
}
