import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { AccentColor, applyThemeColors } from '../../config/themeColors';
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
const validAccentColors: AccentColor[] = ['blue', 'teal', 'purple', 'orange', 'gray'];

function normalizeAccentColor(color: string | null | undefined): AccentColor | null {
  if (color === 'green') return 'teal';
  if (color && validAccentColors.includes(color as AccentColor)) return color as AccentColor;
  return null;
}

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('theme') as Theme;
  if (stored && ['light', 'dark', 'system'].includes(stored)) return stored;
  return 'system';
}

function getInitialAccentColor(): AccentColor {
  return normalizeAccentColor(localStorage.getItem('accentColor')) ?? 'blue';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [accentColor, setAccentColorState] = useState<AccentColor>(getInitialAccentColor);
  // Store only userId (stable string) — not the full session object.
  // This means Supabase TOKEN_REFRESHED events won't cascade through context.
  const [userId, setUserId] = useState<string | null>(null);

  // Auth subscription — only extract userId, ignore everything else.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Apply theme to DOM. Only re-runs when theme or accent actually changes.
  useEffect(() => {
    const effective: 'light' | 'dark' =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        : theme;

    document.documentElement.setAttribute('data-theme', effective);
    applyThemeColors(effective, accentColor);
    localStorage.setItem('theme', theme);
    localStorage.setItem('accentColor', accentColor);

    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => {
        const isDark = media.matches;
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        applyThemeColors(isDark ? 'dark' : 'light', accentColor);
      };
      media.addEventListener('change', handler);
      return () => media.removeEventListener('change', handler);
    }
  }, [theme, accentColor]);

  // Load accent from Supabase once per user (non-blocking).
  // userId is a string — same user ID === no re-run, unlike session objects.
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('accent_color')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        const color = normalizeAccentColor(data?.accent_color);
        if (color) setAccentColorState(color);
      })
      .catch(() => {});
  }, [userId]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);

  const toggleTheme = useCallback(() => {
    setThemeState(c => c === 'dark' ? 'light' : c === 'light' ? 'system' : 'dark');
  }, []);

  // Save accent inline — no separate effect needed.
  const setAccentColor = useCallback((color: AccentColor) => {
    setAccentColorState(color);
    if (userId) {
      supabase.from('profiles').update({ accent_color: color }).eq('id', userId).catch(() => {});
    }
  }, [userId]);

  // Memoize context value so consumers only re-render when theme/accent change,
  // not when Supabase fires TOKEN_REFRESHED and userId is the same string.
  const value = useMemo(
    () => ({ theme, accentColor, toggleTheme, setTheme, setAccentColor }),
    [theme, accentColor, toggleTheme, setTheme, setAccentColor]
  );

  return (
    <ThemeContext.Provider value={value}>
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
