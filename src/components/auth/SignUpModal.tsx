import { useState } from 'react';
import { X } from 'lucide-react';
import AuthHeader from './components/AuthHeader.tsx';
import GoogleButton from './buttons/GoogleButton.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';
import EmailForm from './components/EmailForm.tsx'; // Assuming EmailForm is here based on previous errors
import Divider from './components/Divider.tsx';
import VerificationModal from './components/VerificationModal.tsx';
import { Language } from '../../types/language.ts';
import { useTheme } from '../theme/ThemeContext.tsx';

interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  context?: 'default' | 'pro';
  currentLanguage: Language;
}

export default function SignUpModal({ isOpen, onClose, context = 'default' }: SignUpModalProps) {
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);

  const { theme } = useTheme(); // _error is never used
  const { t } = useTranslation();
  if (!isOpen) return null;

  const handleEmailSubmit = (email: string) => {
    setVerificationEmail(email);
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
          className={`${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'} absolute top-6 right-6 transition-colors`}
          aria-label="Close modal"
        >
          <X size={20} />
        </button> 

        <AuthHeader mode="signup" context={context} />
      {/* The AuthHeader component itself should handle its own translations */}
        <div className="mt-10 space-y-6">
          <GoogleButton
            onSuccess={() => { // TODO: Handle successful Google sign-up
              onClose(); // Close modal on success
            }}
            onError={(error) => { // Explicitly type error as string
              console.error('Google sign-up error:', error);
              // TODO: Display error to user
            }}
          />
          <Divider text={t('or_continue_with_email')} />
          <EmailForm onSubmit={handleEmailSubmit} />
        </div>
      </div>
    </div>
  );
}