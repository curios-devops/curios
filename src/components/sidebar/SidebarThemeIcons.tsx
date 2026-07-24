import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext.tsx';
import { useAccentColor } from '../../hooks/useAccentColor.ts';

// Desktop sidebar theme switch — full-width pill segmented control, icon-only
// (no room for labels in the sidebar). Sits right below the logo, above the
// nav (Home/House icon). Accent color lives in Settings instead (signed-in
// only) — see GeneralSection.tsx.
const OPTIONS = [
  { key: 'light' as const, icon: Sun, label: 'Light' },
  { key: 'system' as const, icon: Monitor, label: 'System' },
  { key: 'dark' as const, icon: Moon, label: 'Dark' },
];

export default function SidebarThemeIcons() {
  const { theme, setTheme } = useTheme();
  const accentColor = useAccentColor();

  return (
    <div
      className="flex items-center rounded-full p-0.5 w-full border"
      style={{
        backgroundColor: 'var(--ui-bg-secondary)',
        borderColor: 'var(--ui-border-default)',
      }}
      role="group"
      aria-label="Theme"
    >
      {OPTIONS.map(({ key, icon: Icon, label }) => {
        const isSelected = theme === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => setTheme(key)}
            title={label}
            aria-label={label}
            aria-pressed={isSelected}
            className="flex-1 flex items-center justify-center py-1.5 rounded-full transition-colors"
            style={{
              backgroundColor: isSelected ? 'var(--ui-bg-elevated)' : 'transparent',
              color: isSelected ? accentColor.primary : 'var(--ui-text-muted)',
              boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.15)' : undefined,
            }}
            onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.color = accentColor.primary; }}
            onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.color = 'var(--ui-text-muted)'; }}
          >
            <Icon size={15} />
          </button>
        );
      })}
    </div>
  );
}
