// xerj-style "DAY · NIGHT" on the desktop Home. Shown only for themes with DAY / NIGHT
// (Terra); picking one turns Auto off — the Auto switch lives in Settings.
import { useTheme } from './ThemeContext';

export default function DayNightToggle() {
  const { theme, setTheme, hasDayNight } = useTheme();
  if (!hasDayNight) return null;
  const night = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const tone = (active: boolean) => ({ color: active ? 'var(--accent-primary)' : 'var(--ui-text-muted)' });

  return (
    <div className="label-mono flex items-center gap-2" role="group" aria-label="Day or night">
      <button type="button" onClick={() => setTheme('light')} aria-pressed={!night} style={tone(!night)} className="hover:opacity-80">Day</button>
      <span aria-hidden style={tone(false)}>·</span>
      <button type="button" onClick={() => setTheme('dark')} aria-pressed={night} style={tone(night)} className="hover:opacity-80">Night</button>
    </div>
  );
}
