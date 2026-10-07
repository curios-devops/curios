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
export type WordmarkColor = 'pamba' | 'default' | 'gray' | 'dark';
// Accent themes. The first five are offered to visitors in Settings;
// classic_blue (our original blue) is only selectable here, to revert.
export type ThemeColorName = 'terra' | 'ocean' | 'fire' | 'sky' | 'borealis' | 'classic_blue';
export const VISITOR_THEMES: ThemeColorName[] = ['terra', 'ocean', 'fire', 'sky', 'borealis'];

// The logo icon's own gray (see CuriosLogo.tsx frame fill) — offered as a
// wordmark color option.
export const LOGO_GRAY = '#9A9A9A';

// Resolved logo look for one context (header vs sidebar).
export interface LogoConfig {
  nameFontSize: string; // "Curios" wordmark size
  showAi: boolean; // show the "AI" part of the wordmark
  aiFontSize: string;
}

export interface AppSettings {
  theme: { default: ThemeName };
  // Accent theme: default + each theme's base hex (hover/tints derived).
  themes: { default: ThemeColorName; colors: Record<ThemeColorName, string> };
  // Logo mark: frame color, center-dot color ('accent' follows the theme), pulse.
  logoMark: { iconColor: string; dotColor: string | 'accent'; dotPulse: boolean };
  banner: { enabled: boolean; text: string };
  // Shared wordmark typography (family/weight); size is per-context (L/M/S).
  wordmarkFont: { fontFamily: string; fontWeight: number; letterSpacing: string };
  wordmarkColor: WordmarkColor;
  header: { themeToggle: boolean; logo: LogoConfig };
  sidebar: { logo: LogoConfig };
  getStarted: { mode: GetStartedMode; text: string };
  credits: { display: CreditsDisplay; iconSize: number };
  // Pricing modal promo: tag above the price + struck-through regular monthly
  // price. Empty strings hide them.
  pricingPromo: { label: string; regularMonthly: string };
  // AI models. Questions are rated easy/normal/complex → luna/sol/astra (see MODELS
  // in app-settings.md); router OFF = always sol.
  models: {
    router: boolean;
    luna: string;
    sol: string;
    astra: string;
    deep: string;
    utility: string;
    image: string;
  };
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

// Logo icon size is fixed (not configurable); collapsed sidebar adds a few px.
export const LOGO_ICON_PX = 20;

// L / M / S wordmark text sizes; M is the everyday size.
const TEXT_REM: Record<Size, string> = { L: '1.25rem', M: '1.05rem', S: '0.9rem' };

const onOff = (v: string | undefined, def: boolean): boolean =>
  v === 'ON' ? true : v === 'OFF' ? false : def;

const asSize = (v: string | undefined, def: Size = 'M'): Size => {
  const s = (v || '').toUpperCase();
  return s === 'L' || s === 'M' || s === 'S' ? (s as Size) : def;
};

const asTheme = (v: string | undefined): ThemeName => {
  const t = (v || '').toLowerCase();
  if (t === 'auto' || t === 'system') return 'system';
  return t === 'dark' ? 'dark' : 'light';
};

const HEX = /^#[0-9a-f]{6}$/i;
const asHex = (v: string | undefined, def: string): string => (v && HEX.test(v.trim()) ? v.trim() : def);

const THEME_DEFAULTS: Record<ThemeColorName, string> = {
  terra: '#9C7A5B',
  ocean: '#1C8BFD',
  fire: '#D97757',
  sky: '#7C55D6',
  borealis: '#12A88C',
  classic_blue: '#4F6FE0',
};

const asThemeName = (v: string | undefined): ThemeColorName => {
  const t = (v || '').toLowerCase() as ThemeColorName;
  return t in THEME_DEFAULTS ? t : 'terra';
};

// Named logo colors; any #RRGGBB also works.
const LOGO_NAMED: Record<string, string> = {
  OCEAN_BLUE: '#1C8BFD',
  GRAY: LOGO_GRAY,
  CLASSIC_BLUE: '#4F6FE0',
  RED: '#E5484D',
};
const asLogoColor = (v: string | undefined, def: string): string => {
  const key = (v || '').trim().toUpperCase();
  return LOGO_NAMED[key] ?? asHex(v, def);
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
  bricolage: { fontFamily: "'Bricolage Grotesque', 'Inter', system-ui, sans-serif", fontWeight: 700, letterSpacing: '-0.03em' },
  michroma: { fontFamily: "'Michroma', 'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 600, letterSpacing: '-0.025em' },
  grotesk: { fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif", fontWeight: 500, letterSpacing: '-0.02em' },
} as const;

const asFont = (v: string | undefined) => {
  const f = (v || '').toLowerCase();
  return f === 'grotesk' ? WORDMARK_FONTS.grotesk : f === 'michroma' ? WORDMARK_FONTS.michroma : WORDMARK_FONTS.bricolage;
};

const asColor = (v: string | undefined): WordmarkColor => {
  const c = (v || '').toLowerCase();
  return c === 'gray' || c === 'dark' || c === 'default' ? c : 'pamba';
};

// Build a logo config from a KEY prefix (HEADER_ or SIDEBAR_). Default size M.
const logoConfig = (prefix: string): LogoConfig => ({
  nameFontSize: TEXT_REM[asSize(cfg[`${prefix}_LOGO_NAME`], 'M')],
  showAi: onOff(cfg[`${prefix}_LOGO_AI`], true),
  aiFontSize: TEXT_REM[asSize(cfg[`${prefix}_LOGO_AI_SIZE`], 'M')],
});

// Model ids are plain slugs (gpt-6.1-sol); anything else falls back to the default.
const asModel = (v: string | undefined, fallback: string): string =>
  v && /^[a-z0-9][a-z0-9._-]*$/i.test(v.trim()) ? v.trim() : fallback;

export const appSettings: AppSettings = {
  theme: {
    default: asTheme(cfg.THEME),
  },
  themes: {
    default: asThemeName(cfg.THEME_COLOR),
    colors: {
      terra: asHex(cfg.TERRA, THEME_DEFAULTS.terra),
      ocean: asHex(cfg.OCEAN, THEME_DEFAULTS.ocean),
      fire: asHex(cfg.FIRE, THEME_DEFAULTS.fire),
      sky: asHex(cfg.SKY, THEME_DEFAULTS.sky),
      borealis: asHex(cfg.BOREALIS, THEME_DEFAULTS.borealis),
      classic_blue: asHex(cfg.CLASSIC_BLUE, THEME_DEFAULTS.classic_blue),
    },
  },
  logoMark: {
    iconColor: asLogoColor(cfg.LOGO_ICON_COLOR, LOGO_NAMED.OCEAN_BLUE),
    dotColor: (cfg.LOGO_DOT_COLOR || '').trim().toUpperCase() === 'ACCENT' ? 'accent' : asLogoColor(cfg.LOGO_DOT_COLOR, LOGO_NAMED.RED),
    dotPulse: onOff(cfg.LOGO_DOT_PULSE, true),
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
  pricingPromo: {
    label: cfg.PROMO_LABEL === 'OFF' ? '' : cfg.PROMO_LABEL || '',
    regularMonthly: cfg.PROMO_REGULAR_MONTHLY === 'OFF' ? '' : cfg.PROMO_REGULAR_MONTHLY || '',
  },
  models: {
    router: onOff(cfg.MODEL_ROUTER, true),
    luna: asModel(cfg.MODEL_LUNA, 'gpt-6-luna'),
    sol: asModel(cfg.MODEL_SOL, 'gpt-6.1-sol'),
    astra: asModel(cfg.MODEL_ASTRA, 'gpt-6-astra'),
    deep: asModel(cfg.MODEL_DEEP, 'gpt-6.1-sol'),
    utility: asModel(cfg.MODEL_UTILITY, 'gpt-6-luna'),
    image: asModel(cfg.MODEL_IMAGE, 'gpt-image-2'),
  },
};
