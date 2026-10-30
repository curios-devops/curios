// Settings → Credits: show the Pro-credits indicator or hide it, and when shown pick its
// drawing (battery · gauge · ring) and style (digital: a calculator 8 · analog: a dial).
import type { ReactNode } from 'react';
import { Gauge } from 'lucide-react';
import ToggleSwitch from './ToggleSwitch';
import { useTranslation } from '../../hooks/useTranslation';
import { useCreditsDisplay } from '../../hooks/useCreditsDisplay';
import type { CreditsLook, CreditsStyle } from '../../services/creditsLook';

const svg = (children: ReactNode) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const LOOK_ICONS: Record<CreditsLook, ReactNode> = {
  battery: svg(<><rect x="2" y="7" width="17" height="10" rx="2" /><path d="M22 11v2" /><path d="M6 10.5v3M9.5 10.5v3M13 10.5v3" /></>),
  // Open at the bottom, like the gauge in the header.
  gauge: svg(<path d="M7.1 19.2A9 9 0 1 1 16.9 19.2" />),
  ring: svg(<circle cx="12" cy="12" r="9" />),
};

// The calculator 8: seven segments.
const DIGITAL_ICON = svg(
  <g strokeWidth="2.2">
    <path d="M8.5 4h7M8.5 12h7M8.5 20h7M7 5.5v5M7 13.5v5M17 5.5v5M17 13.5v5" />
  </g>,
);

function Choice<T extends string>({ options, value, onChange }: {
  options: { key: T; label: string; icon: ReactNode }[];
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
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            title={opt.label}
            aria-label={opt.label}
            aria-pressed={selected}
            className="px-2.5 py-1 rounded-md transition-colors flex items-center justify-center"
            style={selected
              ? { backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }
              : { backgroundColor: 'transparent', color: 'var(--ui-text-secondary)' }}
          >
            {opt.icon}
          </button>
        );
      })}
    </div>
  );
}

/** `compact`: the smaller type of the guest Settings window. */
export default function CreditsSetting({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const [display, setDisplay] = useCreditsDisplay();
  const looks: { key: CreditsLook; label: string; icon: ReactNode }[] = [
    { key: 'battery', label: t('creditsBattery'), icon: LOOK_ICONS.battery },
    { key: 'gauge', label: t('creditsGauge'), icon: LOOK_ICONS.gauge },
    { key: 'ring', label: t('creditsRing'), icon: LOOK_ICONS.ring },
  ];
  const styles: { key: CreditsStyle; label: string; icon: ReactNode }[] = [
    { key: 'digital', label: t('creditsDigital'), icon: DIGITAL_ICON },
    { key: 'analog', label: t('creditsAnalog'), icon: <Gauge size={18} /> },
  ];

  return (
    <div className={compact ? 'py-5' : 'py-6'}>
      <div className="flex items-center justify-between gap-3">
        <h3 className={compact ? 'text-sm font-semibold' : 'font-semibold'} style={{ color: 'var(--ui-text-primary)' }}>{t('creditsTitle')}</h3>
        <label className={`flex items-center ${compact ? 'gap-1.5 text-xs' : 'gap-2 text-sm'} font-medium cursor-pointer`} style={{ color: 'var(--ui-text-secondary)' }}>
          <ToggleSwitch checked={display.on} onChange={(on) => setDisplay({ on })} />
          <span className="w-6">{display.on ? 'On' : 'Off'}</span>
        </label>
      </div>
      <p className={`${compact ? 'text-xs mt-1.5 leading-relaxed' : 'text-sm mt-1'} text-gray-500 dark:text-gray-400`}>{t('creditsDesc')}</p>
      {display.on && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Choice options={looks} value={display.look} onChange={(look) => setDisplay({ look })} />
          <Choice options={styles} value={display.style} onChange={(style) => setDisplay({ style })} />
        </div>
      )}
    </div>
  );
}
