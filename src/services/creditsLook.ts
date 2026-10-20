// How the Pro-credits indicator looks: on/off, the drawing (battery · gauge · ring) and its
// style (digital: numbers · analog: bars, needle, draining ring). A per-viewer preference
// chosen in Settings → Credits; the default comes from app-settings.md (CREDITS).
import type { BatteryLevel, ProTier } from './proCreditsService.ts';
import { appSettings } from '../config/appSettings.ts';

export type CreditsLook = 'battery' | 'gauge' | 'ring';
export type CreditsStyle = 'digital' | 'analog';
export interface CreditsDisplay {
  on: boolean;
  look: CreditsLook;
  style: CreditsStyle;
}

export const BARS = 5;

/** Filled bars out of 5, by percentage; any credit left shows at least one bar. */
export function creditBars(remaining: number, max: number): number {
  if (remaining <= 0 || max <= 0) return 0;
  return Math.max(1, Math.ceil((Math.min(remaining, max) / max) * BARS));
}

/**
 * Traffic light. Standard accounts (3 a day): 3 left green, 2 yellow, 1 red. Guests (1) are
 * green until it's spent. Pro: by bars — 3+ green, 2 yellow, 1 red.
 */
export function creditTone(tier: ProTier, remaining: number, max: number): BatteryLevel {
  if (remaining <= 0 || max <= 0) return 'empty';
  if (tier === 'free') return remaining >= max ? 'full' : remaining >= 2 ? 'medium' : 'low';
  const bars = creditBars(remaining, max);
  return bars >= 3 ? 'full' : bars === 2 ? 'medium' : 'low';
}

export function defaultCreditsDisplay(): CreditsDisplay {
  const d = appSettings.credits.display;
  return { on: d !== 'off', look: d === 'battery' ? 'battery' : 'gauge', style: 'digital' };
}

export function parseCreditsDisplay(raw: string | null): CreditsDisplay {
  const base = defaultCreditsDisplay();
  if (!raw) return base;
  try {
    const p = JSON.parse(raw) as Partial<CreditsDisplay>;
    return {
      on: typeof p.on === 'boolean' ? p.on : base.on,
      look: p.look === 'battery' || p.look === 'gauge' || p.look === 'ring' ? p.look : base.look,
      style: p.style === 'digital' || p.style === 'analog' ? p.style : base.style,
    };
  } catch {
    return base;
  }
}
