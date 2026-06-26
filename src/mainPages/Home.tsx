export type UserType = 'free' | 'premium' | 'guest';

import { useState, useEffect } from 'react';
import { useSession } from '../hooks/useSession.ts';
import HelpButton from '../components/HelpButton.tsx';
import InputContainer from '../components/boxContainer/InputContainer.tsx';
import ThemeToggle from '../components/theme/ThemeToggle.tsx';
import LanguageSelector from '../components/common/LanguageSelector.tsx';
import CookieConsentModal from '../components/common/CookieConsentModal.tsx';
import CookieBanner from '../components/common/CookieBanner.tsx';
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
import ProCreditsBattery from '../components/ProCreditsBattery.tsx';

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
  const [, setCurrentMode] = useState<ModeType>('search');


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
    setCookiesAccepted(true); // This will hide the banner
    setShowCookieModal(false);
  };

  const handleNecessaryCookies = () => {
    localStorage.setItem('cookieConsent', 'necessary');
    setBannerEnabled(true);
    setCookiesAccepted(true); // This will hide the banner
    setShowCookieModal(false);
  };

  const handleCloseCookieModal = () => {
    setShowCookieModal(false);
  };

  const handleShowSignUp = () => {
    setShowSignUpModal(true);
  };

  const { t } = useTranslation();
  const showCookieBanner = isGuest && !cookiesAccepted;

  return (
    <div
      className="min-h-screen relative transition-colors duration-200"
      style={{
        backgroundColor: 'var(--ui-bg-primary)',
        color: 'var(--ui-text-primary)',
        paddingTop: '160px',
      }}
    >
      {/* Calm on-brand entrance for the title + search box (replaces the old
          flying-in look): a subtle rise + fade, lightly staggered. */}
      <style>{`
        @keyframes homeRise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .home-rise { animation: homeRise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .home-rise-delay { animation-delay: 0.12s; }
        @media (prefers-reduced-motion: reduce) {
          .home-rise { animation: none; }
        }
      `}</style>

      {/* Top right: ThemeToggle, Login and Get Started buttons */}
      {/* On desktop, show in current position. On mobile, these are hidden and shown in the header */}
      {/* Pro Credits battery — centered at the top, separated from the right cluster */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 h-10 flex items-center mobile:hidden">
        <ProCreditsBattery />
      </div>

      <div className="absolute top-4 right-6 flex items-center gap-4 mobile:hidden">
        <div className="w-7 h-7 flex items-center">
          <ThemeToggle />
        </div>
        <button
          className="h-10 px-6 flex items-center justify-center font-medium transition-all"
          style={{
            backgroundColor: 'transparent',
            color: 'var(--ui-text-primary)',
            border: '1.5px solid var(--ui-border-default)',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: '500',
            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--ui-bg-secondary)';
            e.currentTarget.style.borderColor = accentColors.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'var(--ui-border-default)';
          }}
          type="button"
          onClick={() => setShowSignInModal(true)}
        >
          {t('logIn') || 'Log in'}
        </button>
        <button
          className="h-10 px-6 flex items-center justify-center font-medium transition-all"
          style={{
            backgroundColor: getStartedBackground,
            color: getStartedText,
            border: '1px solid transparent',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: '500',
            boxShadow: '0 0 0 0 transparent',
            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = getStartedHover;
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = getStartedBackground;
            e.currentTarget.style.color = getStartedText;
            e.currentTarget.style.boxShadow = '0 0 0 0 transparent';
          }}
          type="button"
          onClick={handleShowSignUp}
        >
          {t('getStarted')}
        </button>
      </div>

      <div className="max-w-[720px] mx-auto px-6 sm:px-8">
        <div className="flex flex-col items-center justify-center mb-12 home-rise">
          <h1
            className="text-center leading-tight transition-opacity duration-300"
            style={{
              color: 'var(--ui-text-primary)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              fontWeight: '600',
              letterSpacing: '-0.02em',
              fontSize: 'clamp(24px, 4vw, 42px)',
            }}
          >
            {t('mainTitle')}
          </h1>
        </div>
        <div className="home-rise home-rise-delay">
          <InputContainer onModeChange={setCurrentMode} />
        </div>
      </div>

      {/* Bottom right: Language and Help */}
      <div className="fixed bottom-2 right-4 flex items-center gap-2 z-[180]">
        <LanguageSelector />
        <HelpButton />
      </div>

      {/* Cookie banner: bottom-right, floats over language/help buttons */}
      <CookieBanner onClick={() => setShowCookieModal(true)} hidden={!showCookieBanner} />

      {/* Guest Sign Up Banner - only show for guest users and after cookie consent */}
      {isGuest && <GuestSignUpBanner isEnabled={bannerEnabled} />}

      {/* Standard User Banner - only show for logged-in free tier users */}
      {isStandard && <StandardUserBanner />}

      {/* Cookie Consent Modal - only show when banner pressed and not accepted */}
      {showCookieModal && isGuest && !cookiesAccepted && (
        <CookieConsentModal
          onAcceptAll={handleAcceptAllCookies}
          onNecessaryOnly={handleNecessaryCookies}
          onClose={handleCloseCookieModal}
          onShowSignUp={handleShowSignUp}
          positionRight={true}
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