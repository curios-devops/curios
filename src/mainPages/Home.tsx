export type UserType = 'free' | 'premium' | 'guest';

import { useState, useEffect } from 'react';
import { useSession } from '../hooks/useSession.ts';
import HelpButton from '../components/HelpButton.tsx';
import InputContainer from '../components/boxContainer/InputContainer.tsx';
import ThemeToggle from '../components/theme/ThemeToggle.tsx';
import LanguageSelector from '../components/common/LanguageSelector.tsx';
import CookieConsentModal from '../components/common/CookieConsentModal.tsx';
import CookieButton from '../components/common/CookieButton.tsx';
import GuestSignUpBanner from '../components/GuestSignUpBanner.tsx';
import StandardUserBanner from '../components/StandardUserBanner.tsx';
import SignUpModal from '../components/auth/SignUpModal.tsx';
import SignInModal from '../components/auth/SignInModal.tsx';
import { useSubscription } from '../hooks/useSubscription.ts';
import { languages } from '../types/language.ts';
import { useTranslation } from '../hooks/useTranslation.ts';
import { useAccentColor } from '../hooks/useAccentColor.ts';
import { useTheme } from '../components/theme/ThemeContext.tsx';
import type { ModeType } from '../components/boxContainerInput/ModeSelector.tsx';

export default function Home() {
  const { session } = useSession();
  const { subscription } = useSubscription(session);
  const accentColors = useAccentColor();
  const { theme, accentColor: selectedAccentColor } = useTheme();
  const isGrayAccent = selectedAccentColor === 'gray';
  const isDarkMode =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const getStartedBackground = isGrayAccent
    ? isDarkMode
      ? '#F3F4F6'
      : '#111827'
    : accentColors.primary;
  const getStartedText = isGrayAccent
    ? isDarkMode
      ? '#111827'
      : '#F3F4F6'
    : 'var(--ui-text-on-accent)';

  const getStartedHover = isGrayAccent
    ? isDarkMode
      ? '#E5E7EB'
      : '#1F2937'
    : accentColors.hover;
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [showCookieModal, setShowCookieModal] = useState(false);
  const [cookiesAccepted, setCookiesAccepted] = useState(() => !!localStorage.getItem('cookieConsent'));
  const [currentMode, setCurrentMode] = useState<ModeType>('search');

  // Dynamic subtitle based on mode
  const getModeSubtitle = (mode: ModeType): string => {
    switch (mode) {
      case 'search':
        return 'Always grounded in trusted sources.';
      case 'stories':
        return 'Based on verified knowledge sources.';
      case 'cinematic':
        return 'Visual explanations grounded in facts.';
      case 'avatar':
        return 'Guided learning from trusted knowledge.';
      default:
        return 'Always grounded in trusted sources.';
    }
  };

  const isGuest = !session; // Guest = not logged in
  const isStandard = session && !subscription?.isActive; // Logged in but not pro

  // Handle cleanup when returning from Stripe checkout (canceled or completed)
  useEffect(() => {
    const wasCheckoutPending = sessionStorage.getItem('stripe_checkout_pending');
    
    if (wasCheckoutPending === 'true') {
      console.log('Detected return from Stripe checkout - cleaning up');
      
      // Clear the flag
      sessionStorage.removeItem('stripe_checkout_pending');
      
      // Remove any Stripe-injected scripts or iframes that might cause issues
      try {
        // Remove Stripe.js script if it was loaded
        const stripeScripts = document.querySelectorAll('script[src*="stripe"]');
        stripeScripts.forEach(script => script.remove());
        
        // Remove any Stripe iframes that might have been injected
        const stripeIframes = document.querySelectorAll('iframe[name*="stripe"], iframe[src*="stripe"]');
        stripeIframes.forEach(iframe => iframe.remove());
        
        console.log('Stripe cleanup completed');
      } catch (error) {
        console.error('Error during Stripe cleanup:', error);
      }
    }
  }, []);

  const handleAcceptAllCookies = () => {
    localStorage.setItem('cookieConsent', 'all');
    setBannerEnabled(true);
    setCookiesAccepted(true);
    setShowCookieModal(false);
  };

  const handleNecessaryCookies = () => {
    localStorage.setItem('cookieConsent', 'necessary');
    setBannerEnabled(true);
    setCookiesAccepted(true);
    setShowCookieModal(false);
  };

  const handleCloseCookieModal = () => {
    setShowCookieModal(false);
  };

  const handleShowSignUp = () => {
    setShowSignUpModal(true);
  };

  const { t } = useTranslation();
  const showCookieButton = isGuest && !cookiesAccepted;

  return (
    <div
      className="min-h-screen relative transition-colors duration-200 pt-40"
      style={{
        backgroundColor: 'var(--ui-bg-primary)',
        color: 'var(--ui-text-primary)',
      }}
    >
      {/* Top right: ThemeToggle, Login and Get Started buttons */}
      {/* On desktop, show in current position. On mobile, these are hidden and shown in the header */}
      <div className="absolute top-3 right-4 flex items-center gap-3 mobile:hidden">
        <div className="w-7 h-7 flex items-center">
          <ThemeToggle />
        </div>
        <button
          className="h-9 px-4 flex items-center justify-center text-sm font-medium transition-all"
          style={{
            backgroundColor: 'transparent',
            color: 'var(--ui-text-primary)',
            border: '1px solid var(--ui-border-default)',
            borderRadius: '8px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--ui-bg-secondary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          type="button"
          onClick={() => setShowSignInModal(true)}
        >
          {t('logIn') || 'Log in'}
        </button>
        <button
          className="h-9 px-4 flex items-center justify-center text-sm font-medium transition-all"
          style={{
            backgroundColor: getStartedBackground,
            color: getStartedText,
            border: '1px solid transparent',
            borderRadius: '8px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = getStartedHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = getStartedBackground;
            e.currentTarget.style.color = getStartedText;
          }}
          type="button"
          onClick={handleShowSignUp}
        >
          {t('getStarted')}
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="flex flex-col items-center justify-center mt-2 mb-12">
          <h1
            className="text-lg sm:text-xl md:text-2xl text-center leading-tight uppercase mb-2"
            style={{
              color: 'var(--ui-text-primary)',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontWeight: '400',
              letterSpacing: '0.05em'
            }}
          >
            {t('mainTitle')}
          </h1>
          <p
            className="text-sm sm:text-base md:text-lg text-center"
            style={{
              color: '#94a3b8',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontWeight: '400',
              letterSpacing: '0.04em'
            }}
          >
            {getModeSubtitle(currentMode)}
          </p>
        </div>
        <InputContainer onModeChange={setCurrentMode} />
      </div>

      {/* Bottom near right, not overlapping cookies */}
      {/* Bottom right: Language and Help */}
      <div className="fixed bottom-2 right-4 flex items-center gap-2 z-[200]">
        <LanguageSelector />
        <HelpButton />
      </div>

      {/* Cookie button: just right of sidebar */}
      <div className="fixed bottom-2 left-56 z-[200]">
        <CookieButton onClick={() => setShowCookieModal(true)} hidden={!showCookieButton} showTooltip={!showCookieModal} />
      </div>

      {/* Guest Sign Up Banner - only show for guest users and after cookie consent */}
      {isGuest && <GuestSignUpBanner isEnabled={bannerEnabled} />}

      {/* Standard User Banner - only show for logged-in free tier users */}
      {isStandard && <StandardUserBanner />}

      {/* Cookie Consent Modal - only show when button pressed and not accepted */}
      {showCookieModal && isGuest && !cookiesAccepted && (
        <CookieConsentModal
          onAcceptAll={handleAcceptAllCookies}
          onNecessaryOnly={handleNecessaryCookies}
          onClose={handleCloseCookieModal}
          onShowSignUp={handleShowSignUp}
        />
      )}

      {/* Sign Up Modal triggered by cookie consent */}
      {showSignUpModal && (
        <SignUpModal
          isOpen={showSignUpModal}
          onClose={() => setShowSignUpModal(false)}
          currentLanguage={languages[0]} // English
        />
      )}

      {/* Sign In Modal triggered by login button */}
      {showSignInModal && (
        <SignInModal
          isOpen={showSignInModal}
          onClose={() => setShowSignInModal(false)}
          currentLanguage={languages[0]} // English
        />
      )}
    </div>
  );
}