import { useEffect, useState, type MouseEvent } from 'react';
import { Moon, Sun } from 'lucide-react';
import ToggleSwitch from './ToggleSwitch';
import LanguageSelector from './LanguageSelector';
import { useLanguage } from '../../contexts/LanguageContext';

export default function GeneralSection() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  const { currentLanguage } = useLanguage();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!document.documentElement.classList.contains('dark') && !document.documentElement.classList.contains('light')) {
        setTheme(e.matches ? 'dark' : 'light');
        document.documentElement.classList.toggle('dark', e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const handleThemeChange = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const secondaryButtonStyle = { backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-primary)', borderColor: 'var(--ui-border-default)' } as const;
  const onButtonEnter = (e: MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.backgroundColor = 'var(--ui-border-subtle)'; };
  const onButtonLeave = (e: MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.backgroundColor = 'var(--ui-bg-secondary)'; };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-medium" style={{ color: 'var(--ui-text-primary)' }}>General</h2>
      <div className="rounded-xl border" style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-default)' }}>
        <div className="divide-y mx-6" style={{ borderColor: 'var(--ui-border-subtle)' }}>
          {/* Appearance */}
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium" style={{ color: 'var(--ui-text-primary)' }}>Appearance</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--ui-text-secondary)' }}>How CuriosAI looks on your device</p>
              </div>
              <button
                onClick={handleThemeChange}
                className="px-4 py-2 rounded-lg border transition-colors flex items-center gap-2"
                style={secondaryButtonStyle}
                onMouseEnter={onButtonEnter}
                onMouseLeave={onButtonLeave}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                {theme === 'dark' ? 'Light' : 'Dark'}
              </button>
            </div>
          </div>

          {/* Language */}
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium" style={{ color: 'var(--ui-text-primary)' }}>Language</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--ui-text-secondary)' }}>Interface language: {currentLanguage.name}</p>
              </div>
              <LanguageSelector />
            </div>
          </div>

          {/* Cookies */}
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium" style={{ color: 'var(--ui-text-primary)' }}>Cookies</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--ui-text-secondary)' }}>Manage cookie preferences</p>
              </div>
              <button
                className="px-4 py-2 rounded-lg border transition-colors"
                style={secondaryButtonStyle}
                onMouseEnter={onButtonEnter}
                onMouseLeave={onButtonLeave}
              >
                All
              </button>
            </div>
          </div>

          {/* Auto-suggest */}
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium" style={{ color: 'var(--ui-text-primary)' }}>Auto-suggest</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--ui-text-secondary)' }}>Enable dropdown and tab-complete suggestions while typing a query</p>
              </div>
              <ToggleSwitch checked={true} onChange={() => {}} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}