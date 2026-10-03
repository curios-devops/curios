import { appSettings } from './appSettings';

// New brand palette (design-kit.md, "Midnight + Aurora" direction) — nature-named
// so no color reads as "generic AI blue". These are the ones offered in the
// picker going forward.
export type NatureAccentColor = 'ocean' | 'sky' | 'borealis' | 'fire' | 'wood' | 'dusk';

// LEGACY — the original 5 accents. Kept (not deleted) for revert/reference per
// design-kit.md; no longer offered in ThemeToggle's picker and no longer the
// default, but the type/data stays so any old saved preference still resolves.
export type LegacyAccentColor = 'blue' | 'teal' | 'purple' | 'orange' | 'gray';

// 2026 redesign themes (app-settings.md → THEMES). terra/classic_blue are new;
// ocean and sky are re-tuned (Pamba blue; Sky is now purple).
export type CuriosThemeColor = 'terra' | 'ocean' | 'fire' | 'sky' | 'borealis' | 'classic_blue';

export type AccentColor = NatureAccentColor | LegacyAccentColor | CuriosThemeColor;
export type ColorTemperature = 'cold' | 'warm' | 'neutral';

export interface ColorVariants {
  primary: string;
  hover: string;
  light: string;
  dark: string;
  brandLight?: string;
  brandSubtle?: string;
}

export interface ThemeColors {
  light: ColorVariants;
  dark: ColorVariants;
}

export interface GlobalPaletteTokens {
  bgPrimary: string;
  bgSecondary: string;
  bgElevated: string;
  borderSubtle: string;
  borderDefault: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  shadowSoft: string;
  shadowElevated: string;
  textOnAccent: string;
}

interface DesignColorSet {
  bg: string;
  surface: string;
  border: string;
  text: string;
  brandLight: string;
  brand: string;
  brandDark: string;
  brandSubtle: string;
}

// LEGACY palette definitions — see NatureAccentColor above for the current set.
const legacyDesignSystemThemes: Record<LegacyAccentColor, { light: DesignColorSet; dark: DesignColorSet }> = {
  gray: {
    light: {
      bg: '#FAFAFA',
      surface: '#FFFFFF',
      border: '#E5E7EB',
      text: '#111827',
      brandLight: '#9CA3AF',
      brand: '#6B7280',
      brandDark: '#4B5563',
      brandSubtle: '#F3F4F6',
    },
    dark: {
      bg: '#0B0C0F',
      surface: '#111317',
      border: '#1C1F26',
      text: '#F3F4F6',
      brandLight: '#9CA3AF',
      brand: '#6B7280',
      brandDark: '#4B5563',
      brandSubtle: '#1A1D24',
    },
  },
  blue: {
    light: {
      bg: '#F4F6FA',
      surface: '#FAFBFD',
      border: '#DDE3EE',
      text: '#0F1520',
      brandLight: '#3399FF',
      brand: '#007BFF',
      brandDark: '#0056B3',
      brandSubtle: '#E3F2FF',
    },
    dark: {
      bg: '#040A14',
      surface: '#071628',
      border: '#0D2444',
      text: '#E4EFFF',
      brandLight: '#45AAFF',
      brand: '#0088EE',
      brandDark: '#005BB5',
      brandSubtle: '#050E1F',
    },
  },
  orange: {
    light: {
      bg: '#F7F3EE',
      surface: '#FDFAF7',
      border: '#E8DDD2',
      text: '#1A1410',
      brandLight: '#E07A4F',
      brand: '#C4502A',
      brandDark: '#8F3A1F',
      brandSubtle: '#F5EAE4',
    },
    dark: {
      bg: '#120F0D',
      surface: '#1A1512',
      border: '#2A221C',
      text: '#F3ECE7',
      brandLight: '#F2A07A',
      brand: '#D97757',
      brandDark: '#A34A2F',
      brandSubtle: '#2A1D17',
    },
  },
  teal: {
    light: {
      bg: '#F4F8F8',
      surface: '#FFFFFF',
      border: '#D7E6E5',
      text: '#0F1F1F',
      brandLight: '#2FB3A8',
      brand: '#1F8A8C',
      brandDark: '#16686A',
      brandSubtle: '#E6F4F3',
    },
    dark: {
      bg: '#0E1414',
      surface: '#141C1C',
      border: '#1F2C2C',
      text: '#E6F4F3',
      brandLight: '#4DD6C8',
      brand: '#1F8A8C',
      brandDark: '#16686A',
      brandSubtle: '#0F2222',
    },
  },
  purple: {
    light: {
      bg: '#F6F3FF',
      surface: '#FFFFFF',
      border: '#E4DDFF',
      text: '#1A1033',
      brandLight: '#8A6CFF',
      brand: '#6634FF',
      brandDark: '#5E30EC',
      brandSubtle: '#F0EBFF',
    },
    dark: {
      bg: '#0E0B1A',
      surface: '#151024',
      border: '#241C3D',
      text: '#EDE7FF',
      brandLight: '#9B84FF',
      brand: '#6634FF',
      brandDark: '#5E30EC',
      brandSubtle: '#1A1330',
    },
  },
};

// Current palette — "Midnight + Aurora" direction (design-kit.md). Dark values
// for ocean/sky/borealis anchor on the exact brief hexes (bg #0B1020, surface
// #151C2E, Sky's brand #6E8BFF, Borealis's brand #37E6C3); fire/wood/dusk
// extend the same system. Light variants are new — the brief was written for
// dark mode — designed to hit AA contrast on white while keeping each hue's
// character.
const natureDesignSystemThemes: Record<NatureAccentColor, { light: DesignColorSet; dark: DesignColorSet }> = {
  ocean: {
    light: {
      bg: '#F2F6FC',
      surface: '#FFFFFF',
      border: '#D6E2F5',
      text: '#0E1A2B',
      brandLight: '#5C8FFF',
      brand: '#2E6BE0',
      brandDark: '#1E4FB0',
      brandSubtle: '#E5EDFA',
    },
    dark: {
      bg: '#081018',
      surface: '#0F1D2E',
      border: '#1B2E44',
      text: '#E8F1FF',
      brandLight: '#5C8FFF',
      brand: '#2E6BE0',
      brandDark: '#1E4FB0',
      brandSubtle: '#122238',
    },
  },
  sky: {
    light: {
      bg: '#F3F5FF',
      surface: '#FFFFFF',
      border: '#DDE3FF',
      text: '#141A2E',
      brandLight: '#6E8BFF',
      brand: '#4F6FE0',
      brandDark: '#3A54C2',
      brandSubtle: '#E8ECFF',
    },
    dark: {
      // Exact "Midnight + Aurora" brief: bg #0B1020, surface #151C2E, brand (Primary) #6E8BFF.
      bg: '#0B1020',
      surface: '#151C2E',
      border: '#232C47',
      text: '#EEF2FF',
      brandLight: '#96AFFF',
      brand: '#6E8BFF',
      brandDark: '#4F6FE0',
      brandSubtle: '#1A2340',
    },
  },
  borealis: {
    light: {
      bg: '#F1FBF8',
      surface: '#FFFFFF',
      border: '#CFF0E6',
      text: '#0B2620',
      brandLight: '#37E6C3',
      brand: '#12A88C',
      brandDark: '#0C8570',
      brandSubtle: '#DFF7F0',
    },
    dark: {
      // Exact "Midnight + Aurora" brief: brand (Accent) #37E6C3.
      bg: '#081815',
      surface: '#0F211C',
      border: '#1C3A32',
      text: '#E7FFF8',
      brandLight: '#7CF3DA',
      brand: '#37E6C3',
      brandDark: '#1FB89A',
      brandSubtle: '#123027',
    },
  },
  fire: {
    light: {
      bg: '#FDF4EE',
      surface: '#FFFFFF',
      border: '#F3DCC9',
      text: '#2B1608',
      brandLight: '#FF8A54',
      brand: '#E85A25',
      brandDark: '#B5430F',
      brandSubtle: '#FBE7D8',
    },
    dark: {
      bg: '#170D08',
      surface: '#241209',
      border: '#3D2013',
      text: '#FFEDE0',
      brandLight: '#FF9466',
      brand: '#FF6B35',
      brandDark: '#D9491A',
      brandSubtle: '#2E160C',
    },
  },
  wood: {
    light: {
      bg: '#FAF6F0',
      surface: '#FFFFFF',
      border: '#E6D8C4',
      text: '#211609',
      brandLight: '#B98F5E',
      brand: '#8A6239',
      brandDark: '#664726',
      brandSubtle: '#F0E5D5',
    },
    dark: {
      bg: '#120D09',
      surface: '#1E1712',
      border: '#372A1F',
      text: '#F3E9DC',
      brandLight: '#C9A377',
      brand: '#A87A50',
      brandDark: '#7C5836',
      brandSubtle: '#241A12',
    },
  },
  dusk: {
    light: {
      bg: '#F6F3FC',
      surface: '#FFFFFF',
      border: '#E2D6F7',
      text: '#180F2B',
      brandLight: '#9F7AEA',
      brand: '#7C55D6',
      brandDark: '#5E3EB0',
      brandSubtle: '#EEE6FB',
    },
    dark: {
      bg: '#0F0B1A',
      surface: '#191228',
      border: '#2E2247',
      text: '#EFE9FF',
      brandLight: '#C0A6F5',
      brand: '#9F7AEA',
      brandDark: '#7C55D6',
      brandSubtle: '#221A38',
    },
  },
};

// ── Curios themes (2026 redesign) ──────────────────────────────────────────
// A theme = one accent hex from app-settings.md (hover / tints derived here).
// Light mode uses Vivix's neutral ground for every theme (warm off-white,
// white surfaces, warm border, near-black ink); dark mode keeps each hue
// family's existing dark palette.
const VIVIX_LIGHT = { bg: '#F9F6F4', surface: '#FFFFFF', border: '#DDD8D3', text: '#0A0A0A' };

function mix(hex: string, target: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [a, b] = [p(hex), p(target)];
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function curiosTheme(hex: string, darkBase: DesignColorSet): { light: DesignColorSet; dark: DesignColorSet } {
  return {
    light: {
      ...VIVIX_LIGHT,
      brandLight: mix(hex, '#FFFFFF', 0.25),
      brand: hex,
      brandDark: mix(hex, '#000000', 0.18),
      brandSubtle: mix(hex, '#FFFFFF', 0.88),
    },
    dark: {
      ...darkBase,
      brandLight: mix(hex, '#FFFFFF', 0.4),
      brand: mix(hex, '#FFFFFF', 0.15),
      brandDark: hex,
    },
  };
}

const t = appSettings.themes.colors;
const curiosThemes: Record<CuriosThemeColor, { light: DesignColorSet; dark: DesignColorSet }> = {
  terra: curiosTheme(t.terra, natureDesignSystemThemes.wood.dark),
  ocean: curiosTheme(t.ocean, natureDesignSystemThemes.ocean.dark),
  fire: curiosTheme(t.fire, natureDesignSystemThemes.fire.dark),
  sky: curiosTheme(t.sky, natureDesignSystemThemes.dusk.dark), // Sky is now purple
  borealis: curiosTheme(t.borealis, natureDesignSystemThemes.borealis.dark),
  classic_blue: curiosTheme(t.classic_blue, natureDesignSystemThemes.sky.dark), // our original blue
};

const designSystemThemes: Record<AccentColor, { light: DesignColorSet; dark: DesignColorSet }> = {
  ...legacyDesignSystemThemes,
  ...natureDesignSystemThemes,
  ...curiosThemes,
};

const toVariants = (p: DesignColorSet): ColorVariants => ({
  primary: p.brand,
  hover: p.brandDark,
  light: p.brandSubtle,
  dark: p.brandDark,
  brandLight: p.brandLight,
  brandSubtle: p.brandSubtle,
});

export const accentColors = Object.fromEntries(
  (Object.keys(designSystemThemes) as AccentColor[]).map((k) => [
    k,
    { light: toVariants(designSystemThemes[k].light), dark: toVariants(designSystemThemes[k].dark) },
  ]),
) as Record<AccentColor, ThemeColors>;

export const accentTemperatureMap: Record<AccentColor, ColorTemperature> = {
  // LEGACY
  blue: 'cold',
  teal: 'cold',
  purple: 'warm',
  orange: 'warm',
  gray: 'neutral',
  // Current palette
  ocean: 'cold',
  sky: 'cold',
  borealis: 'cold',
  fire: 'warm',
  wood: 'warm',
  dusk: 'warm',
  terra: 'warm',
  classic_blue: 'cold',
};

// Helper function to get current accent colors based on theme and selected color
export function getAccentColors(
  theme: 'light' | 'dark',
  accentColor: AccentColor = 'blue'
): ColorVariants {
  return accentColors[accentColor][theme];
}

export function getAccentTemperature(accentColor: AccentColor = 'blue'): ColorTemperature {
  return accentTemperatureMap[accentColor];
}

export function getGlobalPaletteTokens(
  theme: 'light' | 'dark',
  accentColor: AccentColor = 'blue'
): GlobalPaletteTokens {
  const palette = designSystemThemes[accentColor][theme];
  return {
    bgPrimary: palette.bg,
    bgSecondary: palette.surface,
    bgElevated: palette.surface,
    borderSubtle: palette.border,
    borderDefault: palette.border,
    textPrimary: palette.text,
    textSecondary: palette.text,
    textMuted: palette.text,
    shadowSoft: theme === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(0, 0, 0, 0.30)',
    shadowElevated: theme === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(0, 0, 0, 0.44)',
    textOnAccent: '#FFFFFF',
  };
}

// CSS variable names for easy access
export const cssVarNames = {
  primary: '--accent-primary',
  hover: '--accent-hover',
  light: '--accent-light',
  dark: '--accent-dark',
  bgPrimary: '--ui-bg-primary',
  bgSecondary: '--ui-bg-secondary',
  bgElevated: '--ui-bg-elevated',
  borderSubtle: '--ui-border-subtle',
  borderDefault: '--ui-border-default',
  textPrimary: '--ui-text-primary',
  textSecondary: '--ui-text-secondary',
  textMuted: '--ui-text-muted',
  shadowSoft: '--ui-shadow-soft',
  shadowElevated: '--ui-shadow-elevated',
  textOnAccent: '--ui-text-on-accent',
} as const;

// Apply theme colors to CSS variables
export function applyThemeColors(
  theme: 'light' | 'dark',
  accentColor: AccentColor = 'blue'
): void {
  const colors = getAccentColors(theme, accentColor);
  const globalTokens = getGlobalPaletteTokens(theme, accentColor);
  const temperature = getAccentTemperature(accentColor);
  const palette = designSystemThemes[accentColor][theme];
  const root = document.documentElement;

  root.style.setProperty(cssVarNames.primary, colors.primary);
  root.style.setProperty(cssVarNames.hover, colors.hover);
  root.style.setProperty(cssVarNames.light, colors.light);
  root.style.setProperty(cssVarNames.dark, colors.dark);

  root.style.setProperty(cssVarNames.bgPrimary, globalTokens.bgPrimary);
  root.style.setProperty(cssVarNames.bgSecondary, globalTokens.bgSecondary);
  root.style.setProperty(cssVarNames.bgElevated, globalTokens.bgElevated);
  root.style.setProperty(cssVarNames.borderSubtle, globalTokens.borderSubtle);
  root.style.setProperty(cssVarNames.borderDefault, globalTokens.borderDefault);
  root.style.setProperty(cssVarNames.textPrimary, globalTokens.textPrimary);
  root.style.setProperty(cssVarNames.textSecondary, globalTokens.textSecondary);
  root.style.setProperty(cssVarNames.textMuted, globalTokens.textMuted);
  root.style.setProperty(cssVarNames.shadowSoft, globalTokens.shadowSoft);
  root.style.setProperty(cssVarNames.shadowElevated, globalTokens.shadowElevated);
  root.style.setProperty(cssVarNames.textOnAccent, globalTokens.textOnAccent);

  // Override --background and --foreground so body/root follow the design system
  root.style.setProperty('--background', palette.bg);
  root.style.setProperty('--foreground', palette.text);

  root.setAttribute('data-temperature', temperature);
}
