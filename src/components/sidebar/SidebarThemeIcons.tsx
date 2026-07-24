import { Contrast, Moon, Sun } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext.tsx';
import { useAccentColor } from '../../hooks/useAccentColor.ts';

// Desktop sidebar quick theme switch — sits right below the logo, above the
// nav (Home/House icon). Direct click, no dropdown (that's the old
// ThemeToggle, still used by the mobile header in App.tsx). Accent color is
// no longer chosen here — see Settings > General (signed-in only).
const OPTIONS = [
  { key: 'system' as const, icon: Contrast, label: 'System' },
  { key: 'light' as const, icon: Sun, label: 'Light' },
  { key: 'dark' as const, icon: Moon, label: 'Dark' },
];

export default function SidebarThemeIcons() {
  const { theme, setTheme } = useTheme();
  const accentColor = useAccentColor();

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Theme">
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
            className="flex items-center justify-center w-7 h-7 rounded-md transition-colors"
            style={{
              color: isSelected ? accentColor.primary : 'var(--ui-text-muted)',
              backgroundColor: isSelected ? 'var(--ui-bg-elevated)' : 'transparent',
            }}
            onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.color = accentColor.primary; }}
            onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.color = 'var(--ui-text-muted)'; }}
          >
            <Icon size={16} />
          </button>
        );
      })}
    </div>
  );
}
