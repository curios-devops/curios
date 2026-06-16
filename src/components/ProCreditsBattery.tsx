// ProCreditsBattery — minimal macOS-style status indicator for remaining Pro
// Credits, shown inline with the Login / Get Started actions. The count sits
// INSIDE the battery; the color follows a traffic-light convention
// (green → yellow → red), with a dimmed gray for exhausted. Status only.

import { useProCredits } from '../providers/ProCreditsProvider.tsx';
import type { BatteryLevel } from '../services/proCreditsService.ts';

const COLOR: Record<BatteryLevel, string> = {
  full: '#22c55e', // green
  medium: '#eab308', // yellow
  low: '#ef4444', // red
  empty: '#9ca3af', // exhausted / disabled
};

export default function ProCreditsBattery() {
  const { remaining, max, battery, loading } = useProCredits();

  if (loading) return null;

  const color = COLOR[battery];

  return (
    <div className="inline-flex items-center self-center leading-none select-none" title={`Pro Credits: ${remaining}/${max}`}>
      {/* Battery body with the count centered inside */}
      <div
        className="inline-flex items-center justify-center rounded-[3px] border"
        style={{ borderColor: color, color, height: '18px', minWidth: '26px', padding: '0 3px' }}
      >
        <span className="text-[9px] font-bold leading-none tabular-nums">
          {remaining}/{max}
        </span>
      </div>
      {/* Battery nub */}
      <div style={{ width: '2px', height: '7px', backgroundColor: color, borderRadius: '0 1px 1px 0' }} />
    </div>
  );
}
