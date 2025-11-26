// No state needed
import { Cookie } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { useTheme } from '../theme/ThemeContext';
import { useAccentColor } from '../../hooks/useAccentColor';

export default function CookieButton({ onClick, hidden, showTooltip = true }: { onClick: () => void; hidden: boolean; showTooltip?: boolean }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const accentColor = useAccentColor();
  const isDarkMode = (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches));
  
  if (hidden) return null;
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold shadow-md relative group border
        ${isDarkMode
          ? 'bg-[#23272A] border-[#3A3F42]'
          : 'bg-[#FAFBF9] border-[#D1D5DB]'}
      `}
      style={{ 
        zIndex: 201,
        color: accentColor.primary,
        transition: 'border-color 200ms'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = accentColor.primary;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = isDarkMode ? '#3A3F42' : '#D1D5DB';
      }}
      aria-label={t('cookies')}
    >
      <Cookie size={17} className="drop-shadow" />
      {showTooltip && (
        <span
          className={`absolute bottom-9 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap font-bold
            ${isDarkMode
              ? 'bg-gray-800 text-gray-100'
              : 'bg-gray-100 text-gray-800'}
          `}
        >
          {t('cookieTooltip')}
        </span>
      )}
    </button>
  );
}
