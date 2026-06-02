import { useAccentColor } from '../hooks/useAccentColor';
import { useTheme } from './theme/ThemeContext';

export default function PromoBanner() {
  const accentColor = useAccentColor();
  const { theme } = useTheme();

  return (
    <div
      className="w-full py-2 overflow-hidden relative"
      style={{ backgroundColor: theme === 'dark' ? '#111111' : '#f3f4f6' }}
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
