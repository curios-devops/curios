// ProCredits indicator — remaining Pro Credits shown in the top bar. The viewer picks the look
// in Settings → Credits (useCreditsDisplay; default from app-settings.md CREDITS):
//   off      — hidden.
//   battery  — digital: the count inside · analog: 5 bars.
//   gauge    — an open-bottom dial. digital: remaining big, total small · analog: a needle.
//   ring     — a full ring. digital: the percentage inside · analog: the ring alone, draining.
// Color follows a traffic light (creditTone: green → yellow → red), gray when exhausted.
// Status only; guests/free users can tap it to be offered sign in / upgrade.

import { useLocation } from 'react-router-dom';
import { useProCredits } from '../providers/ProCreditsProvider.tsx';
import type { BatteryLevel } from '../services/proCreditsService.ts';
import { BARS, creditBars, creditTone } from '../services/creditsLook.ts';
import { useCreditsDisplay } from '../hooks/useCreditsDisplay.ts';

// A first-time guest doesn't see the counter on Home; once they open any service
// page it appears and stays (remembered in localStorage).
const GUEST_SEEN_KEY = 'curios_guest_credits_seen';

const COLOR: Record<BatteryLevel, string> = {
  full: '#22c55e', // green
  medium: '#eab308', // yellow
  low: '#ef4444', // red
  empty: '#9ca3af', // exhausted / disabled
};
const TRACK = 'rgba(148,163,184,0.30)';

export default function ProCreditsBattery() {
  const { remaining, max, loading, tier, promptUpgrade } = useProCredits();
  const [display] = useCreditsDisplay();
  const isHome = useLocation().pathname === '/';

  if (!display.on) return null;
  if (loading) return null;
  if (tier === 'guest') {
    let seen = false;
    try {
      seen = localStorage.getItem(GUEST_SEEN_KEY) === '1';
      if (!seen && !isHome) {
        localStorage.setItem(GUEST_SEEN_KEY, '1');
        seen = true;
      }
    } catch { /* storage blocked — fall back to showing it off Home only */ }
    if (!seen && isHome) return null;
  }

  const color = COLOR[creditTone(tier, remaining, max)];
  const pct = max > 0 ? Math.max(0, Math.min(1, remaining / max)) : 0;
  const clickable = tier !== 'pro';
  const title = clickable
    ? tier === 'guest'
      ? 'Sign in for more Pro Credits'
      : 'Upgrade for more Pro Credits'
    : `Pro Credits: ${remaining}/${max}`;
  const analog = display.style === 'analog';

  return (
    <button
      type="button"
      onClick={clickable ? promptUpgrade : undefined}
      disabled={!clickable}
      title={title}
      className="inline-flex items-center self-center leading-none select-none bg-transparent border-0 p-0 m-0"
      style={{ cursor: clickable ? 'pointer' : 'default' }}
    >
      {display.look === 'battery' ? (
        analog ? <BatteryBars bars={creditBars(remaining, max)} color={color} /> : <Battery remaining={remaining} color={color} />
      ) : display.look === 'ring' ? (
        <Ring pct={pct} color={color} showNumber={!analog} />
      ) : (
        <Dial remaining={remaining} max={max} pct={pct} color={color} needle={analog} />
      )}
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

// Analog battery: 5 bars filled by percentage, all in the traffic-light color.
function BatteryBars({ bars, color }: { bars: number; color: string }) {
  return (
    <svg width="27" height="16" viewBox="0 0 27 16" aria-hidden="true">
      <rect x="0.75" y="0.75" width="22.5" height="14.5" rx="3" fill="none" stroke={color} strokeWidth="1.5" />
      <rect x="24.25" y="5" width="2" height="6" rx="1" fill={color} />
      {Array.from({ length: BARS }, (_, i) => (
        <rect key={i} x={3 + i * 3.6} y="3.25" width="2.8" height="9.5" rx="0.8" fill={i < bars ? color : TRACK} />
      ))}
    </svg>
  );
}

// Round dial (see docs/General/UX credits.jpeg): an open-bottom gauge — the arc
// leaves a gap at the bottom so the total number sits inside that gap, with the
// remaining count big in the centre and the arc filled to remaining/max.
// Analog: the numbers give way to a slim needle that never reaches the arc.
function Dial({ remaining, max, pct, color, needle }: { remaining: number; max: number; pct: number; color: string; needle: boolean }) {
  // Sized to match the account icon next to it (~25px arc vs its ~24px circle).
  const size = 28;
  const cx = 14, cy = 14, r = 11;
  const c = 2 * Math.PI * r;
  const GAP_DEG = 72; // opening at the bottom where the total sits
  const spanFrac = (360 - GAP_DEG) / 360; // fraction of the circle actually drawn
  const rot = 90 + GAP_DEG / 2; // start so the gap is centred at the bottom (6 o'clock)
  const trackLen = c * spanFrac;
  const valueLen = c * spanFrac * pct;
  const bigFont = remaining >= 100 ? 8 : remaining >= 10 ? 9.5 : 11;

  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <circle
        cx={cx} cy={cy} r={r} fill="none" stroke={TRACK} strokeWidth="2.75"
        strokeLinecap="round" strokeDasharray={`${trackLen} ${c}`} transform={`rotate(${rot} ${cx} ${cy})`}
      />
      <circle
        cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="2.75"
        strokeLinecap="round" strokeDasharray={`${valueLen} ${c}`} transform={`rotate(${rot} ${cx} ${cy})`}
      />
      {needle ? (
        <Needle cx={cx} cy={cy} angle={rot + (360 - GAP_DEG) * pct} color={color} />
      ) : (
        <>
          <text x={cx} y="12.75" textAnchor="middle" dominantBaseline="central" fontSize={bigFont} fontWeight="700" fill={color}>
            {remaining}
          </text>
          <text x={cx} y="24" textAnchor="middle" dominantBaseline="central" fontSize="9" fontWeight="600" fill="var(--ui-text-muted, #9ca3af)">
            {max}
          </text>
        </>
      )}
    </svg>
  );
}

// A long, thin triangle from a small hub; its tip stops short of the arc (inner edge ≈ 9.6).
function Needle({ cx, cy, angle, color }: { cx: number; cy: number; angle: number; color: string }) {
  const a = (angle * Math.PI) / 180;
  const tip = 7.4, tail = 1.6, half = 1;
  const p = (along: number, across: number) =>
    `${(cx + along * Math.cos(a) - across * Math.sin(a)).toFixed(2)},${(cy + along * Math.sin(a) + across * Math.cos(a)).toFixed(2)}`;
  return (
    <>
      <polygon points={`${p(tip, 0)} ${p(-tail, half)} ${p(-tail, -half)}`} fill={color} strokeLinejoin="round" stroke={color} strokeWidth="0.4" />
      <circle cx={cx} cy={cy} r="1.8" fill={color} />
    </>
  );
}

// Full ring that drains clockwise from 12 o'clock; digital shows the percentage (100 → 00).
function Ring({ pct, color, showNumber }: { pct: number; color: string; showNumber: boolean }) {
  const cx = 14, cy = 14, r = 11;
  const c = 2 * Math.PI * r;
  const width = showNumber ? 2.75 : 3.5;
  const value = Math.round(pct * 100);
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={TRACK} strokeWidth={width} />
      {pct > 0 && (
        <circle
          cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`} transform={`rotate(-90 ${cx} ${cy})`}
        />
      )}
      {showNumber && (
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={value >= 100 ? 8 : 10} fontWeight="700" fill={color}>
          {String(value).padStart(2, '0')}
        </text>
      )}
    </svg>
  );
}
