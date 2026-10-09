import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Monitor, Moon, Sun, X, type LucideIcon } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext.tsx';
import LanguageSelector from '../settings/LanguageSelector.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { accentColors } from '../../config/themeColors.ts';
import { VISITOR_THEMES } from '../../config/appSettings.ts';

// Themes offered to visitors (app-settings.md → THEMES).
const ACCENT_OPTIONS = VISITOR_THEMES;

// Display names for the theme dots (brand names, not translated).
const THEME_NAMES: Record<string, string> = {
  terra: 'Terra',
  ocean: 'Ocean',
  fire: 'Fire',
  sky: 'Space',
  borealis: 'Boreal',
  classic_blue: 'Classic Blue',
};

const THEME_OPTIONS: { key: 'light' | 'system' | 'dark'; icon: LucideIcon }[] = [
  { key: 'light', icon: Sun },
  { key: 'system', icon: Monitor },
  { key: 'dark', icon: Moon },
];

interface GuestSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Compact settings for guests: Theme, Accent and Language only. Signed-in
// users get the full /settings page (this mirrors its General section).
export default function GuestSettingsModal({ isOpen, onClose }: GuestSettingsModalProps) {
  const { theme, setTheme, accentColor: selectedAccentColor, setAccentColor } = useTheme();
  const { t } = useTranslation();
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  // Theme name bubble over a dot: on hover (desktop) or briefly after a tap (mobile has no hover).
  const [labelFor, setLabelFor] = useState<string | null>(null);
  const [tappedAt, setTappedAt] = useState(0);
  // Mobile fires mouseleave right after a tap — don't let it hide the bubble the tap just showed.
  const tapRef = useRef(0);
  useEffect(() => {
    if (!tappedAt) return;
    const timer = setTimeout(() => setLabelFor(null), 1500);
    return () => clearTimeout(timer);
  }, [tappedAt]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border"
        style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-default)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--ui-border-subtle)' }}>
          <h2 className="text-base font-semibold tracking-[-0.01em]" style={{ color: 'var(--ui-text-primary)' }}>{t('settings')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--ui-text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ui-text-primary)'; e.currentTarget.style.backgroundColor = 'var(--ui-bg-secondary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ui-text-muted)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
            aria-label={t('close')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="divide-y px-6" style={{ borderColor: 'var(--ui-border-subtle)' }}>
          {/* Theme */}
          <div className="py-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--ui-text-primary)' }}>{t('theme')}</h3>
              <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--ui-text-secondary)' }}>{t('settingsThemeDesc')}</p>
            </div>
            <div
              className="flex items-center gap-1 rounded-lg p-1 border"
              style={{ backgroundColor: 'var(--ui-bg-secondary)', borderColor: 'var(--ui-border-default)' }}
            >
              {THEME_OPTIONS.map(({ key, icon: Icon }) => {
                const selected = theme === key;
                const label = t(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTheme(key)}
                    title={label}
                    aria-label={label}
                    aria-pressed={selected}
                    className="px-3 py-1.5 rounded-md transition-colors flex items-center justify-center"
                    style={selected
                      ? { backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }
                      : { backgroundColor: 'transparent', color: 'var(--ui-text-secondary)' }}
                  >
                    <Icon size={16} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accent */}
          <div className="py-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--ui-text-primary)' }}>{t('settingsAccent')}</h3>
              <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--ui-text-secondary)' }}>{t('settingsAccentDesc')}</p>
            </div>
            <div className="flex gap-2">
              {ACCENT_OPTIONS.map((color) => {
                const colorConfig = accentColors[color][isDarkMode ? 'dark' : 'light'];
                const isSelected = selectedAccentColor === color;
                const name = THEME_NAMES[color] ?? color;
                return (
                  <div key={color} className="relative">
                    <button
                      type="button"
                      onClick={() => { const now = Date.now(); tapRef.current = now; setAccentColor(color); setLabelFor(color); setTappedAt(now); }}
                      onMouseEnter={() => setLabelFor(color)}
                      onMouseLeave={() => { if (Date.now() - tapRef.current > 1500) setLabelFor(null); }}
                      className={`w-6 h-6 rounded-full transition-transform ${isSelected ? 'border-2 border-gray-400 scale-110' : 'border border-transparent hover:scale-110'}`}
                      style={{ backgroundColor: colorConfig.primary, boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.2)' : undefined }}
                      aria-label={name}
                      aria-pressed={isSelected}
                    />
                    {labelFor === color && (
                      <span
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded whitespace-nowrap pointer-events-none border"
                        style={{ backgroundColor: 'var(--ui-bg-elevated)', color: 'var(--ui-text-primary)', borderColor: 'var(--ui-border-subtle)' }}
                      >
                        {name}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Language */}
          <div className="py-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--ui-text-primary)' }}>{t('language')}</h3>
              <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--ui-text-secondary)' }}>{t('settingsLanguageDesc')}</p>
            </div>
            <LanguageSelector openUp />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
