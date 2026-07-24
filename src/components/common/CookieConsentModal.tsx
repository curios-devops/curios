import { Cookie, X } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { useTheme } from '../theme/ThemeContext';
import { useAccentColor } from '../../hooks/useAccentColor';

interface CookieConsentModalProps {
  onAcceptAll: () => void;
  onNecessaryOnly: () => void;
  onClose: () => void;
  onShowSignUp?: () => void;
  positionRight?: boolean; // New prop to position modal on the right
}

export default function CookieConsentModal({
  onAcceptAll,
  onNecessaryOnly,
  onClose,
  onShowSignUp,
  positionRight = false
}: CookieConsentModalProps) {
  const { t } = useTranslation();
  const { accentColor: selectedAccentColor } = useTheme();
  const accentColor = useAccentColor();
  const isGrayAccent = selectedAccentColor === 'gray';
  const primaryButtonBackground = isGrayAccent ? accentColor.dark : accentColor.primary;
  const primaryButtonText = isGrayAccent ? accentColor.light : 'var(--ui-text-on-accent)';
  const primaryButtonBorder = isGrayAccent ? accentColor.dark : accentColor.primary;
  const primaryButtonHover = isGrayAccent ? accentColor.primary : accentColor.hover;

  const handleAcceptAll = () => {
    localStorage.setItem('cookieConsent', 'all');
    onAcceptAll();
    if (onShowSignUp) {
      setTimeout(() => onShowSignUp(), 100);
    }
  };

  const handleNecessaryOnly = () => {
    localStorage.setItem('cookieConsent', 'necessary');
    onNecessaryOnly();
    if (onShowSignUp) {
      setTimeout(() => onShowSignUp(), 100);
    }
  };

  const handlePrivacyPolicyClick = () => {
    window.location.href = '/policies#privacy';
  };

  // Mobile: run side-to-side with a small margin. Desktop: positioned card
  // anchored left (default) or right (when opened from the banner).
  const positionClass = positionRight
    ? 'left-3 right-3 bottom-4 sm:left-auto sm:right-4 sm:bottom-20'
    : 'left-3 right-3 bottom-4 sm:right-auto sm:left-56 sm:bottom-12';

  return (
    <div className={`fixed ${positionClass} z-[200] animate-fade-in`}>
      <div className="rounded-xl shadow-xl w-full sm:w-[360px] p-5 relative border transition-colors duration-200 bg-[#FAFBF9] border-[#E3E6E3] text-[#2A3B39] dark:bg-[#181A1B] dark:border-[#222E2A] dark:text-white">
        {/* Close (X) button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
          aria-label="Close cookie modal"
        >
          <X size={20} />
        </button>
        {/* Header with icon (plain icon — no colored circle) */}
        <div className="flex items-center gap-2 mb-2.5">
          <Cookie size={22} style={{ color: 'var(--ui-text-primary)' }} />
          <h3 className="font-semibold text-base text-[#2A3B39] dark:text-white">{t('cookiePolicy')}</h3>
        </div>

        {/* Content */}
        <div className="mb-4">
          <p className="text-sm leading-relaxed text-[#2A3B39] dark:text-gray-300">
            {t('cookieConsentText')}{' '}
            <button
              type="button"
              onClick={handlePrivacyPolicyClick}
              className="underline transition-colors"
              style={{ color: 'var(--accent-primary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--accent-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--accent-primary)';
              }}
            >
              {t('privacyPolicy')}
            </button>
            .
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-row gap-2 mt-2 justify-center">
          <button
            type="button"
            onClick={handleNecessaryOnly}
            className="h-10 w-full rounded-lg text-sm font-medium transition-colors border"
            style={{
              backgroundColor: 'var(--ui-bg-secondary)',
              color: 'var(--ui-text-primary)',
              borderColor: 'var(--ui-border-subtle)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--ui-bg-tertiary)';
              e.currentTarget.style.borderColor = isGrayAccent ? accentColor.dark : accentColor.primary;
              e.currentTarget.style.color = isGrayAccent ? accentColor.dark : accentColor.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--ui-bg-secondary)';
              e.currentTarget.style.borderColor = 'var(--ui-border-subtle)';
              e.currentTarget.style.color = 'var(--ui-text-primary)';
            }}
          >
            {t('necessaryOnly')}
          </button>
          <button
            type="button"
            onClick={handleAcceptAll}
            className="h-10 w-full rounded-lg text-sm font-medium transition-colors border"
            style={{
              backgroundColor: primaryButtonBackground,
              color: primaryButtonText,
              borderColor: primaryButtonBorder
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = primaryButtonHover;
              e.currentTarget.style.borderColor = isGrayAccent ? accentColor.dark : accentColor.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = primaryButtonBackground;
              e.currentTarget.style.borderColor = primaryButtonBorder;
            }}
          >
            {t('acceptAll')}
          </button>
        </div>
      </div>
    </div>
  );
}
