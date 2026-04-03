// Theme Accent Colors Configuration
// Implements Hue Consistency Rule: same hue (~±5°), varying only lightness & saturation
// for optimal color recognition across light/dark modes

export type AccentColor = 'blue' | 'green' | 'purple' | 'orange' | 'gray';
export type ColorTemperature = 'cold' | 'warm' | 'neutral';

export interface ColorVariants {
  primary: string;      // Main accent color
  hover: string;        // Hover state
  light: string;        // Lighter variant for backgrounds
  dark: string;         // Darker variant for borders/text
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

// BACKUP - Alternative color scheme (2024 palette)
// blue: #4A90E2 (light), #6CA8F5 (dark)
// green: #4EC58B (light), #5ED19C (dark)
// purple: #A16EFF (light), #B285FF (dark)
// orange: #FFA54C (light), #FF8A3D (dark)

// Accent color configurations with Hue Consistency Rule
// Dark mode colors are base; light mode derived with same hue, adjusted L/S
export const accentColors: Record<AccentColor, ThemeColors> = {
  blue: {
    light: {
      primary: '#007BFF', // Matches "Sign in for access" button color
      hover: '#0056B3',   // Standard hover state (darker)
      light: '#E3F2FF',
      dark: '#003D7A',
    },
    dark: {
      primary: '#007BFF', // Base color (standard button blue)
      hover: '#0056B3',   // Standard hover state
      light: '#1565C0',
      dark: '#3399FF',
    },
  },
  green: {
    light: {
      primary: '#28B558', // Derived from dark: same hue, reduced lightness
      hover: '#229A4A',   // Darker for hover
      light: '#D4EDDA',
      dark: '#1C7F3C',
    },
    dark: {
      primary: '#30D158', // Base color (restored from backup)
      hover: '#28B049',   // Darker for hover
      light: '#1a3d23',
      dark: '#4ADE80',
    },
  },
  purple: {
    light: {
      primary: '#4A2ED6', // Derived from dark: same hue, reduced lightness
      hover: '#3E26B5',   // Darker for hover
      light: '#E2D9F3',
      dark: '#321E94',
    },
    dark: {
      primary: '#5C3BFE', // Base color (restored from backup)
      hover: '#4A2FD6',   // Darker for hover
      light: '#2d1b4e',
      dark: '#C4B5FD',
    },
  },
  orange: {
    light: {
      primary: '#E64A19', // Derived from dark: same hue, reduced lightness
      hover: '#C23E15',   // Darker for hover
      light: '#FFE5D0',
      dark: '#A03311',
    },
    dark: {
      primary: '#FF5722', // Base color (restored from backup)
      hover: '#FF6E40',   // Lighter for hover
      light: '#4a3310',
      dark: '#FF8A65',
    },
  },
  gray: {
    light: {
      primary: '#f5f5f7',
      hover: '#ececef',
      light: '#f9f9fb',
      dark: '#141418',
    },
    dark: {
      primary: '#1c1c1f',
      hover: '#26262a',
      light: '#3a3a40',
      dark: '#f2f2f5',
    },
  },
};

export const accentTemperatureMap: Record<AccentColor, ColorTemperature> = {
  blue: 'cold',
  green: 'cold',
  purple: 'warm',
  orange: 'warm',
  gray: 'neutral',
};

const premiumPaletteByTemperature: Record<ColorTemperature, { light: GlobalPaletteTokens; dark: GlobalPaletteTokens }> = {
  cold: {
    light: {
      bgPrimary: '#f4f8ff',
      bgSecondary: '#ecf2ff',
      bgElevated: '#f8fbff',
      borderSubtle: '#d9e6ff',
      borderDefault: '#c3d8ff',
      textPrimary: '#1e2b45',
      textSecondary: '#33456a',
      textMuted: '#5d6f96',
      shadowSoft: 'rgba(45, 78, 138, 0.10)',
      shadowElevated: 'rgba(36, 66, 122, 0.18)',
      textOnAccent: '#eef5ff',
    },
    dark: {
      bgPrimary: '#111a2b',
      bgSecondary: '#172236',
      bgElevated: '#1b2942',
      borderSubtle: '#253857',
      borderDefault: '#32527c',
      textPrimary: '#e4edff',
      textSecondary: '#c2d3f5',
      textMuted: '#93a9d1',
      shadowSoft: 'rgba(10, 16, 29, 0.35)',
      shadowElevated: 'rgba(7, 12, 22, 0.48)',
      textOnAccent: '#eaf3ff',
    },
  },
  warm: {
    light: {
      bgPrimary: '#fff6f1',
      bgSecondary: '#ffeee6',
      bgElevated: '#fff9f6',
      borderSubtle: '#ffe0d2',
      borderDefault: '#ffcdb9',
      textPrimary: '#42251b',
      textSecondary: '#63382a',
      textMuted: '#8a5a49',
      shadowSoft: 'rgba(129, 70, 46, 0.10)',
      shadowElevated: 'rgba(112, 54, 34, 0.18)',
      textOnAccent: '#fff3eb',
    },
    dark: {
      bgPrimary: '#1c1411',
      bgSecondary: '#261b17',
      bgElevated: '#2d201a',
      borderSubtle: '#3f2b23',
      borderDefault: '#5c3c30',
      textPrimary: '#ffe8dc',
      textSecondary: '#f4ccba',
      textMuted: '#d49f8a',
      shadowSoft: 'rgba(17, 10, 8, 0.34)',
      shadowElevated: 'rgba(12, 8, 6, 0.48)',
      textOnAccent: '#fff2e8',
    },
  },
  neutral: {
    light: {
      bgPrimary: '#fafafa',
      bgSecondary: '#f5f5f6',
      bgElevated: '#ffffff',
      borderSubtle: '#e6e6e8',
      borderDefault: '#d6d6da',
      textPrimary: '#1f1f23',
      textSecondary: '#3a3a42',
      textMuted: '#6a6a75',
      shadowSoft: 'rgba(0, 0, 0, 0.08)',
      shadowElevated: 'rgba(0, 0, 0, 0.14)',
      textOnAccent: '#111113',
    },
    dark: {
      bgPrimary: '#111113',
      bgSecondary: '#17171a',
      bgElevated: '#1d1d22',
      borderSubtle: '#2a2a31',
      borderDefault: '#3a3a45',
      textPrimary: '#f2f2f5',
      textSecondary: '#d6d6dc',
      textMuted: '#a3a3ad',
      shadowSoft: 'rgba(0, 0, 0, 0.34)',
      shadowElevated: 'rgba(0, 0, 0, 0.48)',
      textOnAccent: '#f5f5f7',
    },
  },
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
  const temperature = getAccentTemperature(accentColor);
  return premiumPaletteByTemperature[temperature][theme];
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
