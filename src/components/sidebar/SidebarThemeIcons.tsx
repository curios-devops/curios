import { Contrast, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext.tsx';
import { useAccentColor } from '../../hooks/useAccentColor.ts';

// Desktop sidebar theme switch — full-width pill segmented control, icon-only
// (no room for labels in the sidebar). Sits right below the logo, above the
// nav (Home/House icon).
//
// Two independent state dimensions share this one control cluster:
//  - Light/System/Dark set `theme` (unchanged behavior).
//  - Interior (the half-filled Contrast icon, matching the reference image's
//    "system" glyph) sets the ACCENT to the existing neutral 'gray' palette —
//    a generic gray look instead of light/dark's usual accent tint. It's a
//    placeholder ("use gray for now"): it doesn't touch `theme`, so it can
//    show active alongside whichever of Light/System/Dark is also selected.
const THEME_OPTIONS = [
  { key: 'light' as const, icon: Sun, label: 'Light' },
  { key: 'system' as const, icon: Monitor, label: 'System' },
  { key: 'dark' as const, icon: Moon, label: 'Dark' },
];

export default function SidebarThemeIcons() {
  const { theme, setTheme, accentColor: selectedAccentColor, setAccentColor } = useTheme();
  const accentColor = useAccentColor();
  const isInteriorActive = selectedAccentColor === 'gray';

  const segmentStyle = (isSelected: boolean) => ({
    backgroundColor: isSelected ? 'var(--ui-bg-elevated)' : 'transparent',
    color: isSelected ? accentColor.primary : 'var(--ui-text-muted)',
    boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.12)' : undefined,
  });

  return (
    <div
      className="flex items-center gap-0.5 rounded-full p-1 w-full"
      style={{ backgroundColor: 'var(--ui-bg-secondary)' }}
      role="group"
      aria-label="Theme"
    >
      {THEME_OPTIONS.map(({ key, icon: Icon, label }) => {
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
            style={segmentStyle(isSelected)}
            onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.color = accentColor.primary; }}
            onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.color = 'var(--ui-text-muted)'; }}
          >
            <Icon size={15} />
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => setAccentColor(isInteriorActive ? 'sky' : 'gray')}
        title="Interior (gray)"
        aria-label="Interior"
        aria-pressed={isInteriorActive}
        className="flex-1 flex items-center justify-center py-1.5 rounded-full transition-colors"
        style={segmentStyle(isInteriorActive)}
        onMouseEnter={(e) => { if (!isInteriorActive) e.currentTarget.style.color = accentColor.primary; }}
        onMouseLeave={(e) => { if (!isInteriorActive) e.currentTarget.style.color = 'var(--ui-text-muted)'; }}
      >
        <Contrast size={15} />
      </button>
    </div>
  );
}
