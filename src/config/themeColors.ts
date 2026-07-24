// New brand palette (design-kit.md, "Midnight + Aurora" direction) — nature-named
// so no color reads as "generic AI blue". These are the ones offered in the
// picker going forward.
export type NatureAccentColor = 'ocean' | 'sky' | 'borealis' | 'fire' | 'wood' | 'dusk';

// LEGACY — the original 5 accents. Kept (not deleted) for revert/reference per
// design-kit.md; no longer offered in ThemeToggle's picker and no longer the
// default, but the type/data stays so any old saved preference still resolves.
export type LegacyAccentColor = 'blue' | 'teal' | 'purple' | 'orange' | 'gray';

export type AccentColor = NatureAccentColor | LegacyAccentColor;
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

const designSystemThemes: Record<AccentColor, { light: DesignColorSet; dark: DesignColorSet }> = {
  ...legacyDesignSystemThemes,
  ...natureDesignSystemThemes,
};

export const accentColors: Record<AccentColor, ThemeColors> = {
  gray: {
    light: {
      primary: designSystemThemes.gray.light.brand,
      hover: designSystemThemes.gray.light.brandDark,
      light: designSystemThemes.gray.light.brandSubtle,
      dark: designSystemThemes.gray.light.brandDark,
      brandLight: designSystemThemes.gray.light.brandLight,
      brandSubtle: designSystemThemes.gray.light.brandSubtle,
    },
    dark: {
      primary: designSystemThemes.gray.dark.brand,
      hover: designSystemThemes.gray.dark.brandDark,
      light: designSystemThemes.gray.dark.brandSubtle,
      dark: designSystemThemes.gray.dark.brandDark,
      brandLight: designSystemThemes.gray.dark.brandLight,
      brandSubtle: designSystemThemes.gray.dark.brandSubtle,
    },
  },
  blue: {
    light: {
      primary: designSystemThemes.blue.light.brand,
      hover: designSystemThemes.blue.light.brandDark,
      light: designSystemThemes.blue.light.brandSubtle,
      dark: designSystemThemes.blue.light.brandDark,
      brandLight: designSystemThemes.blue.light.brandLight,
      brandSubtle: designSystemThemes.blue.light.brandSubtle,
    },
    dark: {
      primary: designSystemThemes.blue.dark.brand,
      hover: designSystemThemes.blue.dark.brandDark,
      light: designSystemThemes.blue.dark.brandSubtle,
      dark: designSystemThemes.blue.dark.brandDark,
      brandLight: designSystemThemes.blue.dark.brandLight,
      brandSubtle: designSystemThemes.blue.dark.brandSubtle,
    },
  },
  orange: {
    light: {
      primary: designSystemThemes.orange.light.brand,
      hover: designSystemThemes.orange.light.brandDark,
      light: designSystemThemes.orange.light.brandSubtle,
      dark: designSystemThemes.orange.light.brandDark,
      brandLight: designSystemThemes.orange.light.brandLight,
      brandSubtle: designSystemThemes.orange.light.brandSubtle,
    },
    dark: {
      primary: designSystemThemes.orange.dark.brand,
      hover: designSystemThemes.orange.dark.brandDark,
      light: designSystemThemes.orange.dark.brandSubtle,
      dark: designSystemThemes.orange.dark.brandDark,
      brandLight: designSystemThemes.orange.dark.brandLight,
      brandSubtle: designSystemThemes.orange.dark.brandSubtle,
    },
  },
  teal: {
    light: {
      primary: designSystemThemes.teal.light.brand,
      hover: designSystemThemes.teal.light.brandDark,
      light: designSystemThemes.teal.light.brandSubtle,
      dark: designSystemThemes.teal.light.brandDark,
      brandLight: designSystemThemes.teal.light.brandLight,
      brandSubtle: designSystemThemes.teal.light.brandSubtle,
    },
    dark: {
      primary: designSystemThemes.teal.dark.brand,
      hover: designSystemThemes.teal.dark.brandDark,
      light: designSystemThemes.teal.dark.brandSubtle,
      dark: designSystemThemes.teal.dark.brandDark,
      brandLight: designSystemThemes.teal.dark.brandLight,
      brandSubtle: designSystemThemes.teal.dark.brandSubtle,
    },
  },
  purple: {
    light: {
      primary: designSystemThemes.purple.light.brand,
      hover: designSystemThemes.purple.light.brandDark,
      light: designSystemThemes.purple.light.brandSubtle,
      dark: designSystemThemes.purple.light.brandDark,
      brandLight: designSystemThemes.purple.light.brandLight,
      brandSubtle: designSystemThemes.purple.light.brandSubtle,
    },
    dark: {
      primary: designSystemThemes.purple.dark.brand,
      hover: designSystemThemes.purple.dark.brandDark,
      light: designSystemThemes.purple.dark.brandSubtle,
      dark: designSystemThemes.purple.dark.brandDark,
      brandLight: designSystemThemes.purple.dark.brandLight,
      brandSubtle: designSystemThemes.purple.dark.brandSubtle,
    },
  },
  // ── Current palette ("Midnight + Aurora") ──────────────────────────────
  ocean: {
    light: {
      primary: designSystemThemes.ocean.light.brand,
      hover: designSystemThemes.ocean.light.brandDark,
      light: designSystemThemes.ocean.light.brandSubtle,
      dark: designSystemThemes.ocean.light.brandDark,
      brandLight: designSystemThemes.ocean.light.brandLight,
      brandSubtle: designSystemThemes.ocean.light.brandSubtle,
    },
    dark: {
      primary: designSystemThemes.ocean.dark.brand,
      hover: designSystemThemes.ocean.dark.brandDark,
      light: designSystemThemes.ocean.dark.brandSubtle,
      dark: designSystemThemes.ocean.dark.brandDark,
      brandLight: designSystemThemes.ocean.dark.brandLight,
      brandSubtle: designSystemThemes.ocean.dark.brandSubtle,
    },
  },
  sky: {
    light: {
      primary: designSystemThemes.sky.light.brand,
      hover: designSystemThemes.sky.light.brandDark,
      light: designSystemThemes.sky.light.brandSubtle,
      dark: designSystemThemes.sky.light.brandDark,
      brandLight: designSystemThemes.sky.light.brandLight,
      brandSubtle: designSystemThemes.sky.light.brandSubtle,
    },
    dark: {
      primary: designSystemThemes.sky.dark.brand,
      hover: designSystemThemes.sky.dark.brandDark,
      light: designSystemThemes.sky.dark.brandSubtle,
      dark: designSystemThemes.sky.dark.brandDark,
      brandLight: designSystemThemes.sky.dark.brandLight,
      brandSubtle: designSystemThemes.sky.dark.brandSubtle,
    },
  },
  borealis: {
    light: {
      primary: designSystemThemes.borealis.light.brand,
      hover: designSystemThemes.borealis.light.brandDark,
      light: designSystemThemes.borealis.light.brandSubtle,
      dark: designSystemThemes.borealis.light.brandDark,
      brandLight: designSystemThemes.borealis.light.brandLight,
      brandSubtle: designSystemThemes.borealis.light.brandSubtle,
    },
    dark: {
      primary: designSystemThemes.borealis.dark.brand,
      hover: designSystemThemes.borealis.dark.brandDark,
      light: designSystemThemes.borealis.dark.brandSubtle,
      dark: designSystemThemes.borealis.dark.brandDark,
      brandLight: designSystemThemes.borealis.dark.brandLight,
      brandSubtle: designSystemThemes.borealis.dark.brandSubtle,
    },
  },
  fire: {
    light: {
      primary: designSystemThemes.fire.light.brand,
      hover: designSystemThemes.fire.light.brandDark,
      light: designSystemThemes.fire.light.brandSubtle,
      dark: designSystemThemes.fire.light.brandDark,
      brandLight: designSystemThemes.fire.light.brandLight,
      brandSubtle: designSystemThemes.fire.light.brandSubtle,
    },
    dark: {
      primary: designSystemThemes.fire.dark.brand,
      hover: designSystemThemes.fire.dark.brandDark,
      light: designSystemThemes.fire.dark.brandSubtle,
      dark: designSystemThemes.fire.dark.brandDark,
      brandLight: designSystemThemes.fire.dark.brandLight,
      brandSubtle: designSystemThemes.fire.dark.brandSubtle,
    },
  },
  wood: {
    light: {
      primary: designSystemThemes.wood.light.brand,
      hover: designSystemThemes.wood.light.brandDark,
      light: designSystemThemes.wood.light.brandSubtle,
      dark: designSystemThemes.wood.light.brandDark,
      brandLight: designSystemThemes.wood.light.brandLight,
      brandSubtle: designSystemThemes.wood.light.brandSubtle,
    },
    dark: {
      primary: designSystemThemes.wood.dark.brand,
      hover: designSystemThemes.wood.dark.brandDark,
      light: designSystemThemes.wood.dark.brandSubtle,
      dark: designSystemThemes.wood.dark.brandDark,
      brandLight: designSystemThemes.wood.dark.brandLight,
      brandSubtle: designSystemThemes.wood.dark.brandSubtle,
    },
  },
  dusk: {
    light: {
      primary: designSystemThemes.dusk.light.brand,
      hover: designSystemThemes.dusk.light.brandDark,
      light: designSystemThemes.dusk.light.brandSubtle,
      dark: designSystemThemes.dusk.light.brandDark,
      brandLight: designSystemThemes.dusk.light.brandLight,
      brandSubtle: designSystemThemes.dusk.light.brandSubtle,
    },
    dark: {
      primary: designSystemThemes.dusk.dark.brand,
      hover: designSystemThemes.dusk.dark.brandDark,
      light: designSystemThemes.dusk.dark.brandSubtle,
      dark: designSystemThemes.dusk.dark.brandDark,
      brandLight: designSystemThemes.dusk.dark.brandLight,
      brandSubtle: designSystemThemes.dusk.dark.brandSubtle,
    },
  },
};

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
