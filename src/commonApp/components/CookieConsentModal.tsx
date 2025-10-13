import { useState, useEffect } from 'react';
import { Cookie } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { useAccentColor } from '../../../src/hooks/useAccentColor';

interface CookieConsentModalProps {
  onAcceptAll: () => void;
  onNecessaryOnly: () => void;
  onClose: () => void;
  onShowSignUp?: () => void; // Add callback for showing sign up modal
}

export default function CookieConsentModal({ 
  onAcceptAll, 
  onNecessaryOnly,
  onShowSignUp
}: CookieConsentModalProps) {
  const { t } = useTranslation();
  const accentColor = useAccentColor();
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  // Check if user has already made a choice
  useEffect(() => {
    const consentChoice = localStorage.getItem('cookieConsent');
    if (!consentChoice) {
      // Show modal after a small delay for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('cookieConsent', 'all');
    setIsVisible(false);
    onAcceptAll();
    // Show sign up modal immediately after accepting cookies
    if (onShowSignUp) {
      setTimeout(() => onShowSignUp(), 100);
    }
  };

  const handleNecessaryOnly = () => {
    localStorage.setItem('cookieConsent', 'necessary');
    setIsVisible(false);
    onNecessaryOnly();
    // Show sign up modal immediately after accepting cookies
    if (onShowSignUp) {
      setTimeout(() => onShowSignUp(), 100);
    }
  };

  const handlePrivacyPolicyClick = () => {
    navigate('/policies#privacy');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-2 left-2 sm:left-56 z-40 animate-fade-in">
      <div className="bg-[#2a2a2a] border border-gray-700 rounded-md shadow-xl max-w-[280px] p-3 relative">
        {/* Header with icon */}
        <div className="flex items-center gap-1.5 mb-2">
          <div className="p-1 rounded-full" style={{ backgroundColor: 'transparent' }}>
            <Cookie size={12} style={{ color: accentColor.primary }} />
          </div>
          <h3 className="text-white font-medium text-xs">{t('cookiePolicy')}</h3>
        </div>

        {/* Content */}
        <div className="mb-3">
          <p className="text-gray-300 text-[10px] leading-tight">
            {t('cookieConsentText')}{' '}
            <button
              type="button"
              onClick={handlePrivacyPolicyClick}
              className="underline transition-colors"
              style={{ color: accentColor.primary }}
              onMouseEnter={(e) => (e.currentTarget.style.color = accentColor.hover)}
              onMouseLeave={(e) => (e.currentTarget.style.color = accentColor.primary)}
            >
              {t('privacyPolicy')}
            </button>
            .
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleNecessaryOnly}
            className="flex-1 text-white font-medium py-1.5 px-2 rounded text-[10px] transition-colors"
            style={{ backgroundColor: accentColor.primary }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = accentColor.hover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = accentColor.primary)}
          >
            {t('necessaryOnly')}
          </button>
          <button
            type="button"
            onClick={handleAcceptAll}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-1.5 px-2 rounded text-[10px] transition-colors"
          >
            {t('acceptAll')}
          </button>
        </div>
      </div>
    </div>
  );
}
