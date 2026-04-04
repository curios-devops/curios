// No state needed
import { Cookie } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { useTheme } from '../theme/ThemeContext';
import { useAccentColor } from '../../hooks/useAccentColor';

export default function CookieButton({ onClick, hidden, showTooltip = true }: { onClick: () => void; hidden: boolean; showTooltip?: boolean }) {
  const { t } = useTranslation();
  const { theme, accentColor: selectedAccentColor } = useTheme();
  const accentColor = useAccentColor();
  const isDarkMode = (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches));
  const isGrayAccent = selectedAccentColor === 'gray';
  const controlBackground = isGrayAccent ? accentColor.dark : accentColor.primary;
  const controlForeground = isGrayAccent ? accentColor.light : 'var(--ui-text-on-accent)';
  const controlHoverBackground = isGrayAccent ? accentColor.primary : accentColor.hover;
  const controlBorder = isGrayAccent ? accentColor.dark : accentColor.primary;
  const tooltipBackground = isGrayAccent ? accentColor.primary : 'var(--ui-bg-elevated)';
  const tooltipForeground = isDarkMode ? '#F9FAFB' : '#111827';
  const tooltipBorder = isGrayAccent ? accentColor.dark : 'var(--ui-border-subtle)';
  
  if (hidden) return null;
  
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shadow-md relative group border"
      style={{ 
        zIndex: 201,
        color: controlForeground,
        backgroundColor: controlBackground,
        borderColor: controlBorder,
        transition: 'border-color 200ms, background-color 200ms, color 200ms'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = controlHoverBackground;
        if (isGrayAccent) {
          e.currentTarget.style.color = accentColor.dark;
          e.currentTarget.style.borderColor = accentColor.dark;
        } else {
          e.currentTarget.style.borderColor = accentColor.hover;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = controlBackground;
        e.currentTarget.style.color = controlForeground;
        e.currentTarget.style.borderColor = controlBorder;
      }}
      aria-label={t('cookies')}
    >
      <Cookie size={17} className="drop-shadow" />
      {showTooltip && (
        <span
          className="absolute bottom-9 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border"
          style={{
            backgroundColor: tooltipBackground,
            color: tooltipForeground,
            borderColor: tooltipBorder,
          }}
        >
          {t('cookieTooltip')}
        </span>
      )}
    </button>
  );
}
