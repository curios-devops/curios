import { useState, useEffect } from 'react';
import SignUpModal from './auth/SignUpModal.tsx';
import { languages } from '../types/language.ts';
import { useAccentColor } from '../hooks/useAccentColor';

interface GuestSignUpBannerProps {
  isEnabled?: boolean; // Add prop to control if banner is enabled
}

export default function GuestSignUpBanner({ isEnabled = false }: GuestSignUpBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const accentColor = useAccentColor();

  // Check if cookies have been accepted to enable the banner
  useEffect(() => {
    const cookieConsent = localStorage.getItem('cookieConsent');
    if (!cookieConsent && !isEnabled) {
      setIsVisible(false);
    }
  }, [isEnabled]);

  const handleDismiss = () => {
    setIsVisible(false);
    // Store dismissal in localStorage so it doesn't show again in this session
    localStorage.setItem('guestBannerDismissed', 'true');
  };

  const handleSignUp = () => {
    setShowSignUpModal(true);
  };

  // Don't show if:
  // - Not enabled (no cookie consent yet)
  // - Dismissed in this session
  // - Cookies not accepted yet
  const cookieConsent = localStorage.getItem('cookieConsent');
  if (!isEnabled || 
      !isVisible || 
      localStorage.getItem('guestBannerDismissed') === 'true' ||
      !cookieConsent) {
    return null;
  }

  return (
    <>
      {/* Position to the right of sidebar - left margin accounts for sidebar width */}
      <div className="fixed bottom-3 left-[calc(12rem+1rem)] z-40 animate-fade-in">
        <div className="max-w-[240px]">
          {/* Content - styled like home page text */}
          <div className="text-left">
            <p className="text-gray-400 text-[10px] mb-1.5 leading-tight">
              <span className="text-gray-900 dark:text-white font-medium">You are missing out</span>
              <br />
              Create an account to get detailed answers.
            </p>

            {/* Action buttons - more subtle styling */}
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={handleSignUp}
                style={{ backgroundColor: accentColor.primary }}
                className="text-white px-2 py-1 rounded text-[10px] font-medium transition-colors hover:opacity-90"
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-gray-500 hover:text-gray-400 px-2 py-1 text-[10px] transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sign up modal */}
      {showSignUpModal && (
        <SignUpModal
          isOpen={showSignUpModal}
          onClose={() => setShowSignUpModal(false)}
          currentLanguage={languages[0]} // English
        />
      )}
    </>
  );
}
