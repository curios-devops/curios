// Internal application settings — NOT user-facing, NOT secret.
//
// The single place to tune the app's chrome (top bar, logo, banner, credits,
// defaults) WITHOUT editing component code. Safe to commit: no keys or secrets
// (those stay in .env). Anything user-configurable (their own theme/accent)
// still lives in the Settings UI; this is the operator-level baseline.
//
// STRATEGY: values below MIRROR the current UI exactly, so introducing this file
// changes nothing on screen. Flip one knob at a time to evolve the look.
//   [wired]      = a component already reads this value.
//   [not wired]  = documented here; the component still hardcodes it (wire later).

export type ThemeName = 'system' | 'light' | 'dark';
export type GetStartedMode = 'text' | 'icon';
export type CreditsDisplay = 'icon' | 'battery' | 'off';

export interface AppSettings {
  theme: {
    /** [wired] Default theme for first-time visitors (before they choose). */
    default: ThemeName;
  };
  banner: {
    /** [wired] Show the full-width promo banner across the top of the home page. */
    enabled: boolean;
    /** [wired] Banner copy — edit here, no code change needed. */
    text: string;
  };
  logo: {
    /** [not wired] Icon glyph size in px (expanded / collapsed). */
    iconSize: number;
    collapsedIconSize: number;
    /** [not wired] Show the "CuriosAI" wordmark next to the icon. */
    showWordmark: boolean;
    /** [not wired] Wordmark typography — parametric so the look is reversible.
        Current default is Michroma (wide/technical). To thin it out, swap the
        family to e.g. "'Space Grotesk', sans-serif" and drop the weight. */
    wordmark: {
      fontFamily: string;
      fontSize: string;
      fontWeight: number;
      letterSpacing: string;
    };
  };
  getStarted: {
    /** [not wired] 'text' → labelled button; 'icon' → compact person-icon button. */
    mode: GetStartedMode;
    /** [wired] Label used when mode === 'text'. */
    text: string;
  };
  credits: {
    /** [wired for on/off] 'battery' (current) | 'icon' (later) | 'off' (hide). */
    display: CreditsDisplay;
    /** [not wired] Icon/graphic size in px. */
    iconSize: number;
  };
}

export const appSettings: AppSettings = {
  theme: {
    default: 'system',
  },
  banner: {
    enabled: true,
    text: '☀️ Summer Sale • Limited Time Only • 50% Discount • Grab It Before It Melts! 🏖️',
  },
  logo: {
    iconSize: 28,
    collapsedIconSize: 32,
    showWordmark: true,
    wordmark: {
      fontFamily: "'Michroma', 'Helvetica Neue', Helvetica, Arial, sans-serif",
      fontSize: '1.125rem', // text-lg
      fontWeight: 600, // font-semibold
      letterSpacing: '-0.025em', // tracking-tight
    },
  },
  getStarted: {
    mode: 'text',
    text: 'Get Started',
  },
  credits: {
    display: 'battery',
    iconSize: 16,
  },
};
