export type AccentColor = 'blue' | 'teal' | 'purple' | 'orange' | 'gray';
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

const designSystemThemes: Record<AccentColor, { light: DesignColorSet; dark: DesignColorSet }> = {
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
      brandLight: '#38bdf8',
      brand: '#0ea5e9',
      brandDark: '#0284c7',
      brandSubtle: '#EEF3FF',
    },
    dark: {
      bg: '#0F1117',
      surface: '#161B27',
      border: '#1E2738',
      text: '#E8EDF5',
      brandLight: '#38bdf8',
      brand: '#0ea5e9',
      brandDark: '#0284c7',
      brandSubtle: '#1A2540',
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
};

export const accentTemperatureMap: Record<AccentColor, ColorTemperature> = {
  blue: 'cold',
  teal: 'cold',
  purple: 'warm',
  orange: 'warm',
  gray: 'neutral',
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

  root.setAttribute('data-temperature', temperature);
}
