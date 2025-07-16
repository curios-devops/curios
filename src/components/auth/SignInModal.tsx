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

        <AuthHeader mode="signin" context={context} />

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        <div className="mt-10 space-y-6">
          <GoogleButton 
            onError={handleGoogleError}
            onSuccess={onClose} // Assuming successful sign-in also closes the modal
          />
          <Divider text={t("or_continue_with_email" as TranslationKey)} />
          <EmailForm 
            mode="login"
            onSubmit={handleEmailSubmit} 
          />
        </div>
      </div>
    </div>
  );
}