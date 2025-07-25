import { useState } from "react";
import { X } from 'lucide-react';
import AuthHeader from './components/AuthHeader.tsx';
import GoogleButton from './buttons/GoogleButton.tsx';
import EmailForm from './components/EmailForm.tsx';
import Divider from './components/Divider.tsx';
import VerificationModal from './components/VerificationModal.tsx';
import { Language } from '../../types/language.ts';
import { useTheme } from '../theme/ThemeContext.tsx';
import { useTranslation, TranslationKey } from '../../hooks/useTranslation.ts';
import SignUpModal from './SignUpModal.tsx';


interface SignInModalProps {
  isOpen: boolean;
  currentLanguage: Language; // Add currentLanguage prop
  onClose: () => void;
  context?: 'default' | 'pro';
}

export default function SignInModal({ isOpen, onClose, context = 'default' }: SignInModalProps) {
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  const [showSignUp, setShowSignUp] = useState(false);

  if (!isOpen) return null;

  const handleEmailSubmit = (email: string) => {
    setVerificationEmail(email);
  };

  const handleGoogleError = (error: string) => {
    setError(error);
  };

  if (verificationEmail) {
    return <VerificationModal email={verificationEmail} onClose={onClose} />;
  }

  if (showSignUp) {
    return <SignUpModal isOpen={true} onClose={() => setShowSignUp(false)} currentLanguage={{ code: 'en', name: 'English', flag: '🇺🇸' }} />;
  }

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50 ${theme === 'dark' ? 'bg-black/70' : 'bg-gray-200/70'}`}>
      <div className={`${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'} w-full max-w-[480px] p-10 rounded-2xl relative`}>
        <button
          type="button"
          onClick={onClose}
          className={`${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'} absolute top-6 right-6 transition-colors`}
          aria-label="Close modal"
        >
          <X size={20} color={theme === 'dark' ? '#9ca3af' : '#6b7280'} />
        </button>

        <div className="text-center mb-8">
          <h2 className={`text-3xl font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            {t("welcome_back" as TranslationKey)}
          </h2>
          <p className="text-gray-400 text-sm">Log in to your account</p>
        </div>

        <AuthHeader mode="signin" context={context} />

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        <div className="mt-10 space-y-6">
          <GoogleButton 
            onError={handleGoogleError}
            onSuccess={onClose}
          />
          <Divider text={t("or_continue_with_email" as TranslationKey)} />
          <EmailForm 
            mode="login"
            onSubmit={handleEmailSubmit} 
          />
          <div className="pt-4 text-center text-xs text-gray-500">
            Don’t have an account?
            <button
              type="button"
              className="ml-1 font-semibold text-[#007BFF] hover:underline inline-flex items-center gap-1"
              onClick={() => setShowSignUp(true)}
            >
              Sign up for free <span className="ml-0.5" style={{ color: '#007BFF', fontWeight: 700 }}>&rarr;</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}