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
