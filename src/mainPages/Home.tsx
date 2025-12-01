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
import { useSubscription } from '../hooks/useSubscription.ts';
import { languages } from '../types/language.ts';
import { useTranslation } from '../hooks/useTranslation.ts';
import { useAccentColor } from '../hooks/useAccentColor.ts';

export default function Home() {
  const { session } = useSession();
  const { subscription } = useSubscription();
  const accentColors = useAccentColor();
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [showCookieModal, setShowCookieModal] = useState(false);
  const [cookiesAccepted, setCookiesAccepted] = useState(() => !!localStorage.getItem('cookieConsent'));

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


  // Debug logs
  console.log('isGuest:', isGuest, 'cookiesAccepted:', cookiesAccepted);
  const showCookieButton = isGuest && !cookiesAccepted;
  console.log('showCookieButton:', showCookieButton);

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1a1a] relative transition-colors duration-200 pt-40">
      {/* Top right: only ThemeToggle and Get Started button */}
      {/* On desktop, show in current position. On mobile, these are hidden and shown in the header */}
      <div className="absolute top-2 right-4 flex items-start gap-2 mobile:hidden">
        <div className="w-7 h-7 flex items-start">
          <ThemeToggle />
        </div>
        <button
          className="h-7 px-3 rounded-lg flex items-center justify-center text-sm font-medium text-white transition-colors shadow-md"
          style={{
            backgroundColor: accentColors.primary,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = accentColors.hover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = accentColors.primary;
          }}
          type="button"
          onClick={handleShowSignUp}
        >
          {t('getStarted')}
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="flex flex-col items-center justify-center mt-10 mb-0">
          <h1 className="text-4xl md:text-5xl font-light text-center text-gray-900 dark:text-white mb-8 leading-tight font-helvetica">
            {t('mainTitle')}
          </h1>
        </div>
        <InputContainer />
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
    </div>
  );
}