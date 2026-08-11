// Internal application settings — NOT user-facing at runtime, NOT secret.
//
// The human-editable source of truth is /app-settings.md in the repo root — a
// plain "KEY = value" file anyone can edit without touching code. THIS file just
// parses it into a typed object the app imports. Every field validates its value
// and falls back to a safe default, so a typo in app-settings.md can never break
// the app. (Changes there, like .env, take effect on the next build/deploy.)
//
// Secrets still live in .env. Advanced/technical knobs not exposed in the simple
// file (logo typography, etc.) keep their defaults here until we choose to expose
// them.

import rawConfig from '../../app-settings.md?raw';

export type ThemeName = 'system' | 'light' | 'dark';
export type GetStartedMode = 'button' | 'icon';
export type CreditsDisplay = 'battery' | 'dial' | 'off';

export interface AppSettings {
  theme: { default: ThemeName };
  banner: { enabled: boolean; text: string };
  logo: {
    iconSize: number;
    collapsedIconSize: number;
    showWordmark: boolean;
    wordmark: { fontFamily: string; fontSize: string; fontWeight: number; letterSpacing: string };
  };
  getStarted: { mode: GetStartedMode; text: string };
  credits: { display: CreditsDisplay; iconSize: number };
}

// Read every "KEY = value" line (ALL-CAPS keys). Prose, ### titles and ``` fences
// don't match, so they're ignored. Any failure yields {} → all defaults apply.
function parseConfig(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (m) out[m[1]] = m[2].trim();
    }
  } catch {
    // fall through — callers get whatever parsed (possibly nothing)
  }
  return out;
}

const cfg = parseConfig(rawConfig);

const DEFAULT_BANNER_TEXT =
  '☀️ Summer Sale • Limited Time Only • 50% Discount • Grab It Before It Melts! 🏖️';

const onOff = (v: string | undefined, def: boolean): boolean =>
  v === 'ON' ? true : v === 'OFF' ? false : def;

const asTheme = (v: string | undefined): ThemeName => {
  const t = (v || '').toLowerCase();
  return t === 'light' || t === 'dark' || t === 'system' ? t : 'system';
};

const asCredits = (v: string | undefined): CreditsDisplay => {
  const c = (v || '').toLowerCase();
  return c === 'off' ? 'off' : c === 'dial' ? 'dial' : 'battery';
};

const asGetStarted = (v: string | undefined): GetStartedMode =>
  (v || '').toLowerCase() === 'icon' ? 'icon' : 'button';

export const appSettings: AppSettings = {
  theme: {
    default: asTheme(cfg.THEME),
  },
  banner: {
    enabled: onOff(cfg.BANNER, false),
    text: cfg.BANNER_TEXT || DEFAULT_BANNER_TEXT,
  },
  // Advanced typography — not exposed in app-settings.md yet; edit here to change.
  logo: {
    iconSize: 28,
    collapsedIconSize: 32,
    showWordmark: true,
    wordmark: {
      fontFamily: "'Michroma', 'Helvetica Neue', Helvetica, Arial, sans-serif",
      fontSize: '1.125rem',
      fontWeight: 600,
      letterSpacing: '-0.025em',
    },
  },
  getStarted: {
    mode: asGetStarted(cfg.GET_STARTED),
    text: cfg.GET_STARTED_TEXT || 'Get Started',
  },
  credits: {
    display: asCredits(cfg.CREDITS),
    iconSize: 16,
  },
};
