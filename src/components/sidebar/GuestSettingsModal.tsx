import { createPortal } from 'react-dom';
import { Monitor, Moon, Sun, X, type LucideIcon } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext.tsx';
import LanguageSelector from '../settings/LanguageSelector.tsx';
import { accentColors, type NatureAccentColor } from '../../config/themeColors.ts';

const ACCENT_OPTIONS: NatureAccentColor[] = ['ocean', 'sky', 'borealis', 'fire', 'wood', 'dusk'];

const THEME_OPTIONS: { key: 'light' | 'system' | 'dark'; label: string; icon: LucideIcon }[] = [
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'system', label: 'System', icon: Monitor },
  { key: 'dark', label: 'Dark', icon: Moon },
];

interface GuestSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Compact settings for guests: Theme, Accent and Language only. Signed-in
// users get the full /settings page (this mirrors its General section).
export default function GuestSettingsModal({ isOpen, onClose }: GuestSettingsModalProps) {
  const { theme, setTheme, accentColor: selectedAccentColor, setAccentColor } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border overflow-hidden"
        style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-default)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--ui-border-subtle)' }}>
          <h2 className="text-lg font-medium" style={{ color: 'var(--ui-text-primary)' }}>Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--ui-text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ui-text-primary)'; e.currentTarget.style.backgroundColor = 'var(--ui-bg-secondary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ui-text-muted)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        <div className="divide-y px-6" style={{ borderColor: 'var(--ui-border-subtle)' }}>
          {/* Theme */}
          <div className="py-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-medium" style={{ color: 'var(--ui-text-primary)' }}>Theme</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--ui-text-secondary)' }}>How CuriosAI looks on your device</p>
            </div>
            <div
              className="flex items-center gap-1 rounded-lg p-1 border"
              style={{ backgroundColor: 'var(--ui-bg-secondary)', borderColor: 'var(--ui-border-default)' }}
            >
              {THEME_OPTIONS.map(({ key, label, icon: Icon }) => {
                const selected = theme === key;
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
              <h3 className="font-medium" style={{ color: 'var(--ui-text-primary)' }}>Accent</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--ui-text-secondary)' }}>The brand color for buttons and highlights</p>
            </div>
            <div className="flex gap-2">
              {ACCENT_OPTIONS.map((color) => {
                const colorConfig = accentColors[color][isDarkMode ? 'dark' : 'light'];
                const isSelected = selectedAccentColor === color;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAccentColor(color)}
                    className={`w-6 h-6 rounded-full transition-transform ${isSelected ? 'border-2 border-gray-400 scale-110' : 'border border-transparent hover:scale-110'}`}
                    style={{ backgroundColor: colorConfig.primary, boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.2)' : undefined }}
                    title={color.charAt(0).toUpperCase() + color.slice(1)}
                    aria-label={color}
                    aria-pressed={isSelected}
                  />
                );
              })}
            </div>
          </div>

          {/* Language */}
          <div className="py-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-medium" style={{ color: 'var(--ui-text-primary)' }}>Language</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--ui-text-secondary)' }}>Interface language</p>
            </div>
            <LanguageSelector />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
