// ProCreditsBattery — minimal battery-style status indicator for remaining Pro
// Credits, shown inline with the Login / Get Started actions. The battery shows
// the remaining credit count inside its body; the color follows a traffic-light
// convention (green → yellow → red), with a dimmed gray for exhausted. Status only.

import { useProCredits } from '../providers/ProCreditsProvider.tsx';
import type { BatteryLevel } from '../services/proCreditsService.ts';

const COLOR: Record<BatteryLevel, string> = {
  full: '#22c55e', // green
  medium: '#eab308', // yellow
  low: '#ef4444', // red
  empty: '#9ca3af', // exhausted / disabled
};

export default function ProCreditsBattery() {
  const { remaining, max, battery, loading, tier, promptUpgrade } = useProCredits();

  if (loading) return null;

  const color = COLOR[battery];
  // Guests and free users can tap the battery to be offered sign in / upgrade.
  // Pro users have nothing to promote, so it's a plain indicator.
  const clickable = tier !== 'pro';
  const title = clickable
    ? tier === 'guest'
      ? 'Sign in for more Pro Credits'
      : 'Upgrade for more Pro Credits'
    : `Pro Credits: ${remaining}/${max}`;

  return (
    <button
      type="button"
      onClick={clickable ? promptUpgrade : undefined}
      disabled={!clickable}
      title={title}
      className="inline-flex items-center self-center leading-none select-none bg-transparent border-0 p-0 m-0"
      style={{ cursor: clickable ? 'pointer' : 'default' }}
    >
      {/* Battery body with remaining credit count */}
      <div
        className="inline-flex items-center justify-center rounded-[3px] border font-semibold"
        style={{ borderColor: color, color, height: '16px', minWidth: '20px', padding: '0 3px', fontSize: '10px' }}
      >
        {remaining}
      </div>
      {/* Battery nub */}
      <div style={{ width: '2px', height: '7px', backgroundColor: color, borderRadius: '0 1px 1px 0' }} />
    </button>
  );
}
