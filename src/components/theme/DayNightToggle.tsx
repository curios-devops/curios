// xerj-style "DAY · NIGHT" with an Auto switch (sunrise → DAY, sunset → NIGHT). Shown only for
// themes with DAY / NIGHT (Terra); picking Day or Night turns Auto off.
import { useTheme } from './ThemeContext';

export default function DayNightToggle() {
  const { theme, setTheme, hasDayNight, dayNightAuto, setDayNightAuto } = useTheme();
  if (!hasDayNight) return null;
  const night = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const tone = (active: boolean) => ({ color: active ? 'var(--accent-primary)' : 'var(--ui-text-muted)' });

  return (
    <div className="label-mono flex items-center gap-2" role="group" aria-label="Day or night">
      <button type="button" onClick={() => setTheme('light')} aria-pressed={!night} style={tone(!night)} className="hover:opacity-80">Day</button>
      <span aria-hidden style={tone(false)}>·</span>
      <button type="button" onClick={() => setTheme('dark')} aria-pressed={night} style={tone(night)} className="hover:opacity-80">Night</button>
      <button
        type="button"
        role="switch"
        aria-checked={dayNightAuto}
        onClick={() => setDayNightAuto(!dayNightAuto)}
        title="Auto: day at sunrise, night at sunset"
        className="ml-2 flex items-center gap-1.5 hover:opacity-80"
        style={tone(dayNightAuto)}
      >
        Auto
        <span
          className="relative inline-block w-7 h-4 rounded-full border transition-colors"
          style={{
            borderColor: dayNightAuto ? 'var(--accent-primary)' : 'var(--ui-border-default)',
            backgroundColor: dayNightAuto ? 'var(--accent-primary)' : 'transparent',
          }}
        >
          <span
            className="absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all"
            style={{ left: dayNightAuto ? 14 : 2, backgroundColor: dayNightAuto ? 'var(--ui-text-on-accent)' : 'var(--ui-text-muted)' }}
          />
        </span>
      </button>
    </div>
  );
}
