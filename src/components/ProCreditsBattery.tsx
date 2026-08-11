// ProCredits indicator — remaining Pro Credits shown in the top bar. Two looks,
// chosen in app-settings.md (CREDITS):
//   BATTERY — a minimal battery with the count inside (the original).
//   DIAL    — a round gauge: remaining count big, total small, in a progress ring.
//   OFF     — hidden.
// Color follows a traffic-light convention (green → yellow → red), gray when
// exhausted. Status only; guests/free users can tap it to be offered sign in / upgrade.

import { useProCredits } from '../providers/ProCreditsProvider.tsx';
import type { BatteryLevel } from '../services/proCreditsService.ts';
import { appSettings } from '../config/appSettings.ts';

const COLOR: Record<BatteryLevel, string> = {
  full: '#22c55e', // green
  medium: '#eab308', // yellow
  low: '#ef4444', // red
  empty: '#9ca3af', // exhausted / disabled
};

export default function ProCreditsBattery() {
  const { remaining, max, battery, loading, tier, promptUpgrade } = useProCredits();

  if (appSettings.credits.display === 'off') return null;
  if (loading) return null;

  const color = COLOR[battery];
  const clickable = tier !== 'pro';
  const title = clickable
    ? tier === 'guest'
      ? 'Sign in for more Pro Credits'
      : 'Upgrade for more Pro Credits'
    : `Pro Credits: ${remaining}/${max}`;

  const isDial = appSettings.credits.display === 'dial';

  return (
    <button
      type="button"
      onClick={clickable ? promptUpgrade : undefined}
      disabled={!clickable}
      title={title}
      className="inline-flex items-center self-center leading-none select-none bg-transparent border-0 p-0 m-0"
      style={{ cursor: clickable ? 'pointer' : 'default' }}
    >
      {isDial ? <Dial remaining={remaining} max={max} color={color} /> : <Battery remaining={remaining} color={color} />}
    </button>
  );
}

function Battery({ remaining, color }: { remaining: number; color: string }) {
  return (
    <>
      <div
        className="inline-flex items-center justify-center rounded-[3px] border font-semibold"
        style={{ borderColor: color, color, height: '16px', minWidth: '20px', padding: '0 3px', fontSize: '10px' }}
      >
        {remaining}
      </div>
      <div style={{ width: '2px', height: '7px', backgroundColor: color, borderRadius: '0 1px 1px 0' }} />
    </>
  );
}

// Round gauge (see docs/General/UX credits.jpeg): remaining count big in the
// centre, total small beneath, inside a progress ring filled to remaining/max.
function Dial({ remaining, max, color }: { remaining: number; max: number; color: string }) {
  const size = 32;
  const r = 14;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.max(0, Math.min(1, remaining / max)) : 0;
  const bigFont = remaining >= 100 ? 9 : remaining >= 10 ? 11 : 12;

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r={r} fill="none" stroke="rgba(148,163,184,0.35)" strokeWidth="3" />
      <circle
        cx="16"
        cy="16"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform="rotate(-90 16 16)"
      />
      <text x="16" y="14.5" textAnchor="middle" dominantBaseline="central" fontSize={bigFont} fontWeight="700" fill={color}>
        {remaining}
      </text>
      <text x="16" y="23" textAnchor="middle" dominantBaseline="central" fontSize="7" fill="var(--ui-text-muted, #9ca3af)">
        {max}
      </text>
    </svg>
  );
}
