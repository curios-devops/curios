// Sidebar "Auto: On / Off" (Settings group): light by day, dark by night — sunrise / sunset
// at the reader's place, any theme. On by default; picking a mode in Settings turns it off.
import { SunMoon } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext.tsx';
import { sidebarRowClass, sidebarRowStyle, sidebarRowEnter, sidebarRowLeave } from './sidebarMenuRow.ts';

export default function SidebarAutoRow({ isCollapsed }: { isCollapsed: boolean }) {
  const { dayNightAuto, setDayNightAuto } = useTheme();
  const label = `Auto: ${dayNightAuto ? 'On' : 'Off'}`;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dayNightAuto}
      onClick={() => setDayNightAuto(!dayNightAuto)}
      className={sidebarRowClass(isCollapsed)}
      style={sidebarRowStyle}
      onMouseEnter={sidebarRowEnter}
      onMouseLeave={sidebarRowLeave}
      title="Auto: day at sunrise, night at sunset"
      aria-label={label}
    >
      <SunMoon size={20} className="shrink-0" />
      {!isCollapsed && (
        <>
          <span className="text-sm font-medium tracking-[-0.01em] flex-1 text-left">{label}</span>
          <span
            aria-hidden
            className="relative inline-block w-8 h-[18px] rounded-full border transition-colors"
            style={{
              borderColor: dayNightAuto ? 'var(--accent-primary)' : 'var(--ui-border-default)',
              backgroundColor: dayNightAuto ? 'var(--accent-primary)' : 'transparent',
            }}
          >
            <span
              className="absolute top-[2px] w-3 h-3 rounded-full transition-all"
              style={{ left: dayNightAuto ? 16 : 2, backgroundColor: dayNightAuto ? 'var(--ui-text-on-accent)' : 'var(--ui-text-muted)' }}
            />
          </span>
        </>
      )}
    </button>
  );
}
