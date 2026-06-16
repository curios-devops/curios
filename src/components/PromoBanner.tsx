import { useAccentColor } from '../hooks/useAccentColor';

export default function PromoBanner() {
  const accentColor = useAccentColor();

  return (
    <div
      className="w-full py-2 overflow-hidden relative"
      style={{ backgroundColor: 'var(--ui-bg-elevated)' }}
    >
      <div className="animate-slide-infinite whitespace-nowrap">
        <span
          className="inline-block text-sm font-bold px-8"
          style={{ color: accentColor.primary }}
        >
          🎉 Spring Sale • Limited Time Only • 90% Discount • Rush Before Deal Ends! 🎉
        </span>
        <span
          className="inline-block text-sm font-bold px-8"
          style={{ color: accentColor.primary }}
        >
          🎉 Spring Sale • Limited Time Only • 90% Discount • Rush Before Deal Ends! 🎉
        </span>
        <span
          className="inline-block text-sm font-bold px-8"
          style={{ color: accentColor.primary }}
        >
          🎉 Spring Sale • Limited Time Only • 90% Discount • Rush Before Deal Ends! 🎉
        </span>
      </div>
    </div>
  );
}
