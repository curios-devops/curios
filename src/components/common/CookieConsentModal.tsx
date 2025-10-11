import { Cookie, X } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation.ts';

interface CookieConsentModalProps {
  onAcceptAll: () => void;
  onNecessaryOnly: () => void;
  onClose: () => void;
  onShowSignUp?: () => void;
}

export default function CookieConsentModal({ 
  onAcceptAll, 
  onNecessaryOnly,
  onClose,
  onShowSignUp
}: CookieConsentModalProps) {
  const { t } = useTranslation();

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

  // Modal position: just above the cookie button (left-56, bottom-12), with margin from sidebar and bottom
  return (
    <div className="fixed left-56 bottom-12 z-50 animate-fade-in" style={{ marginLeft: 0, marginBottom: 0 }}>
      <div className="rounded-md shadow-xl max-w-[320px] w-full p-4 relative border transition-colors duration-200 bg-[#FAFBF9] border-[#E3E6E3] text-[#2A3B39] dark:bg-[#181A1B] dark:border-[#222E2A] dark:text-white">
        {/* Close (X) button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
          aria-label="Close cookie modal"
        >
          <X size={18} />
        </button>
        {/* Header with icon */}
        <div className="flex items-center gap-1.5 mb-2">
          <div className="p-1 rounded-full flex items-center justify-center bg-[#3FA9F5] dark:bg-gray-700">
            <Cookie className="text-white" size={14} />
          </div>
          <h3 className="font-medium text-[10px] text-[#2A3B39] dark:text-white">{t('cookiePolicy')}</h3>
        </div>

        {/* Content */}
        <div className="mb-3">
          <p className="text-[10px] leading-tight text-[#2A3B39] dark:text-gray-300">
            {t('cookieConsentText')}{' '}
            <button
              type="button"
              onClick={handlePrivacyPolicyClick}
              className="text-blue-600 hover:text-blue-800 underline transition-colors dark:text-[#007BFF] dark:hover:text-[#0056b3]"
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
            className="h-8 w-full rounded-lg bg-[#007BFF] hover:bg-[#0056b3] text-white text-[10px] font-medium transition-colors"
          >
            {t('necessaryOnly')}
          </button>
          <button
            type="button"
            onClick={handleAcceptAll}
            className="h-8 w-full rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-[10px] font-medium transition-colors"
          >
            {t('acceptAll')}
          </button>
        </div>
      </div>
    </div>
  );
}
