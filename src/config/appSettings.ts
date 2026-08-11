// Internal application settings — NOT user-facing at runtime, NOT secret.
//
// The human-editable source of truth is /app-settings.md in the repo root — a
// plain "KEY = value" file anyone can edit without touching code. THIS file just
// parses it into a typed object the app imports. Every field validates its value
// and falls back to a safe default, so a typo in app-settings.md can never break
// the app. (Changes there, like .env, take effect on the next build/deploy.)
//
// Secrets stay in .env.

import rawConfig from '../../app-settings.md?raw';

export type ThemeName = 'system' | 'light' | 'dark';
export type GetStartedMode = 'button' | 'icon';
export type CreditsDisplay = 'battery' | 'dial' | 'off';
export type Size = 'L' | 'M' | 'S';
export type WordmarkColor = 'default' | 'gray';

// The logo icon's own gray (see CuriosLogo.tsx frame fill) — offered as a
// wordmark color option.
export const LOGO_GRAY = '#9A9A9A';

// Resolved logo look for one context (header vs sidebar).
export interface LogoConfig {
  iconSize: number; // px (expanded); collapsed adds a few px
  nameFontSize: string; // "Curios" wordmark size
  showAi: boolean; // show the "AI" part of the wordmark
  aiFontSize: string;
}

export interface AppSettings {
  theme: { default: ThemeName };
  banner: { enabled: boolean; text: string };
  // Shared wordmark typography (family/weight); size is per-context (L/M/S).
  wordmarkFont: { fontFamily: string; fontWeight: number; letterSpacing: string };
  wordmarkColor: WordmarkColor;
  header: { themeToggle: boolean; logo: LogoConfig };
  sidebar: { logo: LogoConfig };
  getStarted: { mode: GetStartedMode; text: string };
  credits: { display: CreditsDisplay; iconSize: number };
}

// Read every "KEY = value" line (ALL-CAPS keys). Prose, ### titles, ``` fences and
// ====== section rules don't match, so they're ignored. Any failure → {} → defaults.
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

// L / M / S size scales. Tuned so M is clearly smaller than the old default
// (the previous look was L-sized); M is the everyday size, L is the big option.
const ICON_PX: Record<Size, number> = { L: 28, M: 23, S: 19 };
const TEXT_REM: Record<Size, string> = { L: '1.125rem', M: '0.95rem', S: '0.82rem' };

const onOff = (v: string | undefined, def: boolean): boolean =>
  v === 'ON' ? true : v === 'OFF' ? false : def;

const asSize = (v: string | undefined, def: Size = 'M'): Size => {
  const s = (v || '').toUpperCase();
  return s === 'L' || s === 'M' || s === 'S' ? (s as Size) : def;
};

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

// Wordmark typefaces. Michroma (default) is wide/technical; Space Grotesk is a
// thinner, squarer grotesque (Perplexity-ish). Both are loaded in index.html.
const WORDMARK_FONTS = {
  michroma: { fontFamily: "'Michroma', 'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 600, letterSpacing: '-0.025em' },
  grotesk: { fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif", fontWeight: 500, letterSpacing: '-0.02em' },
} as const;

const asFont = (v: string | undefined) =>
  (v || '').toLowerCase() === 'grotesk' ? WORDMARK_FONTS.grotesk : WORDMARK_FONTS.michroma;

const asColor = (v: string | undefined): WordmarkColor =>
  (v || '').toLowerCase() === 'gray' ? 'gray' : 'default';

// Build a logo config from a KEY prefix (HEADER_ or SIDEBAR_). Default size M.
const logoConfig = (prefix: string): LogoConfig => ({
  iconSize: ICON_PX[asSize(cfg[`${prefix}_LOGO_ICON`], 'M')],
  nameFontSize: TEXT_REM[asSize(cfg[`${prefix}_LOGO_NAME`], 'M')],
  showAi: onOff(cfg[`${prefix}_LOGO_AI`], true),
  aiFontSize: TEXT_REM[asSize(cfg[`${prefix}_LOGO_AI_SIZE`], 'M')],
});

export const appSettings: AppSettings = {
  theme: {
    default: asTheme(cfg.THEME),
  },
  banner: {
    enabled: onOff(cfg.BANNER, false),
    text: cfg.BANNER_TEXT || DEFAULT_BANNER_TEXT,
  },
  wordmarkFont: asFont(cfg.LOGO_FONT),
  wordmarkColor: asColor(cfg.LOGO_COLOR),
  header: {
    themeToggle: onOff(cfg.HEADER_THEME_TOGGLE, true),
    logo: logoConfig('HEADER'),
  },
  sidebar: {
    logo: logoConfig('SIDEBAR'),
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
