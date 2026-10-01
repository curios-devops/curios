import { appSettings } from '../config/appSettings.ts';

const MESSAGE = appSettings.banner.text;

// `onUnlock` opens the Pro pricing modal; the button sits pinned on the right
// while the message scrolls behind it.
export default function PromoBanner({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div
      className="w-full py-2 overflow-hidden fixed top-0 left-0 z-[60]"
      style={{ backgroundColor: 'var(--accent-primary)' }}
    >
      {/* Two identical groups translated by -50% loop seamlessly: at -50% the
          second group lands exactly where the first began (no jump). Each group
          repeats the message enough to stay wider than the viewport (no gap). */}
      <div className="flex w-max animate-slide-infinite whitespace-nowrap">
        {[0, 1].map((group) => (
          <div key={group} className="flex shrink-0">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="inline-block text-sm font-bold px-8"
                style={{ color: 'var(--ui-text-on-accent)' }}
              >
                {MESSAGE}
              </span>
            ))}
          </div>
        ))}
      </div>
      <div
        className="absolute inset-y-0 right-0 flex items-center pl-6 pr-3"
        style={{ background: 'linear-gradient(to right, transparent, var(--accent-primary) 30%)' }}
      >
        <button
          type="button"
          onClick={onUnlock}
          className="text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--ui-text-on-accent)', color: 'var(--accent-primary)' }}
        >
          Unlock Pro →
        </button>
      </div>
    </div>
  );
}
