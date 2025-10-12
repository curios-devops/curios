// Theme Accent Colors Configuration
// Implements Hue Consistency Rule: same hue (~±5°), varying only lightness & saturation
// for optimal color recognition across light/dark modes

export type AccentColor = 'blue' | 'green' | 'purple' | 'orange';

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
};

// Helper function to get current accent colors based on theme and selected color
export function getAccentColors(
  theme: 'light' | 'dark',
  accentColor: AccentColor = 'blue'
): ColorVariants {
  return accentColors[accentColor][theme];
}

// CSS variable names for easy access
export const cssVarNames = {
  primary: '--accent-primary',
  hover: '--accent-hover',
  light: '--accent-light',
  dark: '--accent-dark',
} as const;

// Apply theme colors to CSS variables
export function applyThemeColors(
  theme: 'light' | 'dark',
  accentColor: AccentColor = 'blue'
): void {
  const colors = getAccentColors(theme, accentColor);
  const root = document.documentElement;
  
  root.style.setProperty(cssVarNames.primary, colors.primary);
  root.style.setProperty(cssVarNames.hover, colors.hover);
  root.style.setProperty(cssVarNames.light, colors.light);
  root.style.setProperty(cssVarNames.dark, colors.dark);
}
