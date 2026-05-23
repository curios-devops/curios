import { Cookie } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { useTheme } from '../theme/ThemeContext';

interface CookieBannerProps {
  onClick: () => void;
  hidden: boolean;
}

export default function CookieBanner({ onClick, hidden }: CookieBannerProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (hidden) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-0 right-0 z-[190] flex items-center gap-3 px-6 py-3 shadow-lg transition-all duration-300 hover:shadow-xl"
      style={{
        backgroundColor: isDarkMode ? '#1F2937' : '#F9FAFB',
        color: isDarkMode ? '#F9FAFB' : '#1F2937',
        borderTopLeftRadius: '16px',
        border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
        borderRight: 'none',
        borderBottom: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      aria-label={t('cookiePreferences')}
    >
      <Cookie
        size={20}
        strokeWidth={2}
        style={{
          color: isDarkMode ? '#F9FAFB' : '#374151',
          flexShrink: 0
        }}
      />
      <span
        className="text-sm font-medium whitespace-nowrap"
        style={{
          color: isDarkMode ? '#F9FAFB' : '#374151',
        }}
      >
        {t('cookiePreferences') || 'Cookie preferences'}
      </span>
    </button>
  );
}
