import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AccentColor, applyThemeColors } from '../../config/themeColors';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  accentColor: AccentColor;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setAccentColor: (color: AccentColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getInitialTheme(): Theme {
  // Check if theme was previously stored
  const storedTheme = localStorage.getItem('theme') as Theme;
  if (storedTheme && ['light', 'dark', 'system'].includes(storedTheme)) {
    return storedTheme;
  }
  
  // If user prefers dark mode, start with dark
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  
  // Default to system
  return 'system';
}

function getInitialAccentColor(): AccentColor {
  const stored = localStorage.getItem('accentColor') as AccentColor;
  if (stored && ['blue', 'green', 'purple', 'orange'].includes(stored)) {
    return stored;
  }
  return 'blue';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [accentColor, setAccentColorState] = useState<AccentColor>(getInitialAccentColor);

  const applyTheme = useCallback((mode: Theme, accent: AccentColor) => {
    let effectiveTheme: 'light' | 'dark';
    
    if (mode === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      effectiveTheme = isDark ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', effectiveTheme);
    } else {
      effectiveTheme = mode;
      document.documentElement.setAttribute('data-theme', mode);
    }
    
    // Apply accent colors as CSS variables
    applyThemeColors(effectiveTheme, accent);
  }, []);

  useEffect(() => {
    applyTheme(theme, accentColor);
    localStorage.setItem('theme', theme);
    localStorage.setItem('accentColor', accentColor);
    
    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme('system', accentColor);
      media.addEventListener('change', handler);
      return () => media.removeEventListener('change', handler);
    }
  }, [theme, accentColor, applyTheme]);

  const toggleTheme = () => {
    setTheme(current => 
      current === 'dark' ? 'light' : 
      current === 'light' ? 'system' : 'dark'
    );
  };

  const setAccentColor = (color: AccentColor) => {
    setAccentColorState(color);
  };

  return (
    <ThemeContext.Provider value={{ theme, accentColor, toggleTheme, setTheme, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}