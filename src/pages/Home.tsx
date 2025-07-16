export type UserType = 'free' | 'premium' | 'guest';

import { useState } from 'react';
import { useSession } from '../hooks/useSession.ts';
import HelpButton from '../components/HelpButton.tsx';
import InputContainer from '../components/search/InputContainer.tsx';
import ThemeToggle from '../components/theme/ThemeToggle.tsx';
import { LanguageSelector } from '../components/common/LanguageSelector.tsx';
import CookieConsentModal from '../components/common/CookieConsentModal.tsx';
import GuestSignUpBanner from '../components/GuestSignUpBanner.tsx';
import StandardUserBanner from '../components/StandardUserBanner.tsx';
import SignUpModal from '../components/auth/SignUpModal.tsx';
import { useSubscription } from '../hooks/useSubscription.ts';
import { useTranslation } from '../hooks/useTranslation.ts';
import { languages } from '../types/language.ts';

export default function Home() {
  const { session } = useSession();
  const { subscription } = useSubscription();
  const { t } = useTranslation();
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [bannerEnabled, setBannerEnabled] = useState(false);
  
  const isGuest = !session; // Guest = not logged in
  const isStandard = session && !subscription?.isActive; // Logged in but not pro

  const handleAcceptAllCookies = () => {
    // Handle accept all cookies logic
    console.log('User accepted all cookies');
    setBannerEnabled(true);
  };

  const handleNecessaryCookies = () => {
    // Handle necessary cookies only logic
    console.log('User accepted necessary cookies only');
    setBannerEnabled(true);
  };

  const handleCloseCookieModal = () => {
    // Handle close without selection (optional)
    console.log('User closed cookie modal');
  };

  const handleShowSignUp = () => {
    setShowSignUpModal(true);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1a1a] relative transition-colors duration-200 pt-40">
      <div className="absolute top-4 right-16 flex items-center gap-2">
        <LanguageSelector />
        <ThemeToggle />
      </div>

      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="flex flex-col items-center justify-center mt-10 mb-0">
          <h1 className="text-4xl md:text-5xl font-light text-center text-gray-900 dark:text-white mb-8 leading-tight font-helvetica">
            {t('mainTitle')}
          </h1>
        </div>
        <InputContainer />
      </div>

      <div className="fixed bottom-4 right-4">
        <HelpButton />
      </div>

      {/* Guest Sign Up Banner - only show for guest users and after cookie consent */}
      {isGuest && <GuestSignUpBanner isEnabled={bannerEnabled} />}

      {/* Standard User Banner - only show for logged-in free tier users */}
      {isStandard && <StandardUserBanner />}

      {/* Cookie Consent Modal - only show for guest users */}
      {isGuest && (
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
          context="default"
          currentLanguage={languages[0]} // English
        />
      )}
    </div>
  );
}