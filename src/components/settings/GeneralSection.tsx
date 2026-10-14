import { useState } from 'react';
import { Moon, Sun, Monitor, type LucideIcon } from 'lucide-react';
import ToggleSwitch from './ToggleSwitch';
import LanguageSelector from './LanguageSelector';
import NarratorVoiceSelect from './NarratorVoiceSelect';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from '../../hooks/useTranslation';
import { accentColors } from '../../config/themeColors';
import { THEME_NAMES, VISITOR_THEMES } from '../../config/appSettings';

// Themes offered to visitors (app-settings.md → THEMES).
const ACCENT_OPTIONS = VISITOR_THEMES;

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
  const { theme, setTheme, accentColor: selectedAccentColor, setAccentColor, dayNightAuto, setDayNightAuto } = useTheme();
  const { autoDetect, setAutoDetect } = useLanguage();
  const { t } = useTranslation();
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

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
  // Auto (every theme): light at sunrise, dark at sunset.
  const autoSwitch = (
    <label className="flex items-center gap-2 text-sm font-medium cursor-pointer" style={{ color: 'var(--ui-text-secondary)' }}>
      Auto
      <ToggleSwitch checked={dayNightAuto} onChange={setDayNightAuto} />
      <span className="w-6 text-xs">{dayNightAuto ? 'On' : 'Off'}</span>
    </label>
  );

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
          {/* Same rows as the Settings window, for every theme (a theme changes looks, not controls). */}
          {/* Appearance … Auto (right); the description; then light / dark / system. */}
          <div className="py-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-medium" style={{ color: 'var(--ui-text-primary)' }}>{t('appearance')}</h3>
              {autoSwitch}
            </div>
            <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">{t('settingsThemeDesc')}</p>
            <div className="mt-3 flex">
              <Segmented options={themeOptions} value={theme} onChange={setTheme} />
            </div>
          </div>

          {/* Themes: title, description, then the dots. */}
          <div className="py-6">
            <h3 className="font-medium" style={{ color: 'var(--ui-text-primary)' }}>{t('accentColor')}</h3>
            <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">{t('themeDesc')}</p>
            <div className="flex gap-2 mt-3">
              {ACCENT_OPTIONS.map((color) => {
                const colorConfig = accentColors[color][isDarkMode ? 'dark' : 'light'];
                const isSelected = selectedAccentColor === color;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAccentColor(color)}
                    className={`w-6 h-6 rounded-full transition-transform ${isSelected ? 'border-2 border-gray-400 scale-110' : 'border border-transparent hover:scale-110'}`}
                    style={{
                      backgroundColor: colorConfig.primary,
                      boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.2)' : undefined,
                    }}
                    title={THEME_NAMES[color]}
                    aria-label={THEME_NAMES[color]}
                    aria-pressed={isSelected}
                  />
                );
              })}
            </div>
          </div>

          {/* Language … Auto Detect (right): follows each question's language; off keeps the one picked here. */}
          <div className="py-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-medium" style={{ color: 'var(--ui-text-primary)' }}>{t('language')}</h3>
              <label
                className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                style={{ color: 'var(--ui-text-secondary)' }}
                title={t('languageAutoTip')}
              >
                Auto Detect
                <ToggleSwitch checked={autoDetect} onChange={setAutoDetect} />
                <span className="w-6 text-xs">{autoDetect ? 'On' : 'Off'}</span>
              </label>
            </div>
            <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">{t('settingsLanguageDesc')}</p>
            <div className="mt-3">
              <LanguageSelector />
            </div>
          </div>

          {/* Narrator voice */}
          <div className="py-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-medium" style={{ color: 'var(--ui-text-primary)' }}>{t('settingsNarrator')}</h3>
                <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">{t('settingsNarratorDesc')}</p>
              </div>
              <NarratorVoiceSelect />
            </div>
          </div>

          {/* Cookies */}
          <div className="py-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-medium" style={{ color: 'var(--ui-text-primary)' }}>Cookies</h3>
                <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">Manage cookie preferences</p>
              </div>
              <Segmented options={cookieOptions} value={cookieChoice} onChange={handleCookieChange} />
            </div>
          </div>

          {/* Auto-suggest */}
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium" style={{ color: 'var(--ui-text-primary)' }}>Auto-suggest</h3>
                <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">Enable dropdown and tab-complete suggestions while typing a query</p>
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
