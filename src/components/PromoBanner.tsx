import { useAccentColor } from '../hooks/useAccentColor';

const MESSAGE = '⚽ World Cup Sale • Limited Time Only • 50% Discount • Rush Before Deal Ends! ⚽';

export default function PromoBanner() {
  const accentColor = useAccentColor();

  return (
    <div
      className="w-full py-2 overflow-hidden relative"
      style={{ backgroundColor: 'var(--ui-bg-elevated)' }}
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
                style={{ color: accentColor.primary }}
              >
                {MESSAGE}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
