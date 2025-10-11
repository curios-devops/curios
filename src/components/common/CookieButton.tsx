// No state needed
import { Cookie } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { useTheme } from '../theme/ThemeContext';

export default function CookieButton({ onClick, hidden, showTooltip = true }: { onClick: () => void; hidden: boolean; showTooltip?: boolean }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  if (hidden) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-colors shadow-md relative group border
        ${(theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches))
          ? 'bg-[#23272A] hover:bg-[#33393B] text-[#3FA9F5] border-[#23272A]'
          : 'bg-[#FAFBF9] hover:border-[#007BFF] text-[#3FA9F5] border-[#E3E6E3]'}
      `}
      aria-label={t('cookies')}
      style={{ zIndex: 201 }}
    >
      <Cookie size={17} className="drop-shadow" color="#3FA9F5" />
      {showTooltip && (
        <span
          className={`absolute bottom-9 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap font-bold
            ${theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
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
