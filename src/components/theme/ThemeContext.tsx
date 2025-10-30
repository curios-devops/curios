import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AccentColor, applyThemeColors } from '../../config/themeColors';
import { useSession } from '../../hooks/useSession';
import { supabase } from '../../lib/supabase.ts';

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
  const { session, isLoading } = useSession();
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [accentColor, setAccentColorState] = useState<AccentColor>(getInitialAccentColor);
  const [accentColorLoading, setAccentColorLoading] = useState(true);
  const [justLoadedFromSupabase, setJustLoadedFromSupabase] = useState(false);

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

  // Load accentColor from Supabase on sign-in, else from localStorage
  useEffect(() => {
    const fetchAccentColor = async () => {
      setAccentColorLoading(true);
      let color: AccentColor | null = null;
      if (session?.user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('accent_color')
            .eq('id', session.user.id)
            .single();
          if (!error && data?.accent_color && ['blue','green','purple','orange'].includes(data.accent_color)) {
            color = data.accent_color;
            setJustLoadedFromSupabase(true);
          }
        } catch (error) {
          // Ignore if column doesn't exist
          console.debug('Accent color column not available in profiles table');
        }
      }
      if (!color) {
        color = localStorage.getItem('accentColor') as AccentColor;
      }
      if (!color || !['blue','green','purple','orange'].includes(color)) {
        color = 'blue';
      }
      setAccentColorState(color);
      setAccentColorLoading(false);
    };
    if (!isLoading) {
      fetchAccentColor();
    }
  }, [session, isLoading]);

  useEffect(() => {
    applyTheme(theme, accentColor);
    localStorage.setItem('theme', theme);
    // Only update localStorage if not just loaded from Supabase
    if (!accentColorLoading && !justLoadedFromSupabase) {
      localStorage.setItem('accentColor', accentColor);
    }
    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme('system', accentColor);
      media.addEventListener('change', handler);
      return () => media.removeEventListener('change', handler);
    }
  }, [theme, accentColor, applyTheme, accentColorLoading, justLoadedFromSupabase]);

  // Save accentColor to Supabase if signed in and not just loaded from Supabase
  useEffect(() => {
    if (session?.user && !justLoadedFromSupabase && !accentColorLoading) {
      supabase
        .from('profiles')
        .update({ accent_color: accentColor })
        .eq('id', session.user.id)
        .then(({ error }) => {
          if (error) {
            console.debug('Failed to save accent color to database:', error);
          }
        });
    }
    if (justLoadedFromSupabase) setJustLoadedFromSupabase(false);
  }, [accentColor, session, justLoadedFromSupabase, accentColorLoading]);

  const toggleTheme = () => {
    setTheme(current => 
      current === 'dark' ? 'light' : 
      current === 'light' ? 'system' : 'dark'
    );
  };

  const setAccentColor = (color: AccentColor) => {
    setAccentColorState(color);
  };

  if (accentColorLoading) return null;

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