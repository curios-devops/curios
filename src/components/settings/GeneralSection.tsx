import { useState } from 'react';
import { Moon, Sun, Monitor, type LucideIcon } from 'lucide-react';
import ToggleSwitch from './ToggleSwitch';
import LanguageSelector from './LanguageSelector';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../theme/ThemeContext';

type CookieOption = 'all' | 'necessary' | 'none';

interface SegmentedOption<T extends string> {
  key: T;
  label: string;
  icon?: LucideIcon;
}

function Segmented<T extends string>({ options, value, onChange }: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      className="flex items-center gap-1 rounded-lg p-1 border"
      style={{ backgroundColor: 'var(--ui-bg-secondary)', borderColor: 'var(--ui-border-default)' }}
    >
      {options.map((opt) => {
        const selected = value === opt.key;
        const Icon = opt.icon;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5"
            style={
              selected
                ? { backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }
                : { backgroundColor: 'transparent', color: 'var(--ui-text-secondary)' }
            }
          >
            {Icon && <Icon size={15} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function GeneralSection() {
  const { theme, setTheme } = useTheme();
  const { currentLanguage } = useLanguage();

  const [cookieChoice, setCookieChoice] = useState<CookieOption>(() => {
    const stored = localStorage.getItem('cookieConsent');
    return stored === 'necessary' || stored === 'none' ? stored : 'all';
  });

  const handleCookieChange = (choice: CookieOption) => {
    setCookieChoice(choice);
    localStorage.setItem('cookieConsent', choice);
  };

  const themeOptions: SegmentedOption<'light' | 'dark' | 'system'>[] = [
    { key: 'light', label: 'Light', icon: Sun },
    { key: 'dark', label: 'Dark', icon: Moon },
    { key: 'system', label: 'System', icon: Monitor },
  ];

  const cookieOptions: SegmentedOption<CookieOption>[] = [
    { key: 'all', label: 'All' },
    { key: 'necessary', label: 'Necessary' },
    { key: 'none', label: 'None' },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-medium" style={{ color: 'var(--ui-text-primary)' }}>General</h2>
      <div className="rounded-xl border" style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-default)' }}>
        <div className="divide-y mx-6" style={{ borderColor: 'var(--ui-border-subtle)' }}>
          {/* Appearance */}
          <div className="py-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-medium" style={{ color: 'var(--ui-text-primary)' }}>Appearance</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--ui-text-secondary)' }}>How CuriosAI looks on your device</p>
              </div>
              <Segmented options={themeOptions} value={theme} onChange={setTheme} />
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
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-medium" style={{ color: 'var(--ui-text-primary)' }}>Cookies</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--ui-text-secondary)' }}>Manage cookie preferences</p>
              </div>
              <Segmented options={cookieOptions} value={cookieChoice} onChange={handleCookieChange} />
            </div>
          </div>

          {/* Auto-suggest */}
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium" style={{ color: 'var(--ui-text-primary)' }}>Auto-suggest</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--ui-text-secondary)' }}>Enable dropdown and tab-complete suggestions while typing a query</p>
              </div>
              {/* Disabled for now — feature is off */}
              <ToggleSwitch checked={false} onChange={() => {}} disabled />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
