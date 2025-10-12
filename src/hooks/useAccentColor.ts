import { useTheme } from '../components/theme/ThemeContext';
import { getAccentColors } from '../config/themeColors';
import { useMemo } from 'react';

/**
 * Hook to get current accent colors based on theme
 * Returns CSS color values for the selected accent color
 */
export function useAccentColor() {
  const { theme, accentColor } = useTheme();
  
  const colors = useMemo(() => {
    // Determine effective theme (handle 'system' case)
    const effectiveTheme = 
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme;
    
    return getAccentColors(effectiveTheme, accentColor);
  }, [theme, accentColor]);
  
  return colors;
}

/**
 * Utility to generate Tailwind-compatible class strings using accent colors
 * Use this for dynamic styling based on accent color
 */
export function useAccentClasses() {
  const colors = useAccentColor();
  
  return {
    // Button styles
    primaryBtn: `bg-[${colors.primary}] hover:bg-[${colors.hover}] text-white`,
    
    // Border styles
    primaryBorder: `border-[${colors.primary}]`,
    hoverBorder: `hover:border-[${colors.primary}]`,
    
    // Text styles
    primaryText: `text-[${colors.primary}]`,
    darkText: `text-[${colors.dark}]`,
    
    // Background styles
    lightBg: `bg-[${colors.light}]`,
    primaryBg: `bg-[${colors.primary}]`,
    
    // Ring styles (for focus states)
    primaryRing: `ring-[${colors.primary}]`,
    
    // Direct color values for inline styles
    colors,
  };
}
