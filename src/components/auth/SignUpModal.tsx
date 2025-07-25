import { useState } from 'react';
import { X } from 'lucide-react';
import GoogleButton from './buttons/GoogleButton.tsx';
import EmailForm from './components/EmailForm.tsx';
import Divider from './components/Divider.tsx';
import VerificationModal from './components/VerificationModal.tsx';
import { Language } from '../../types/language.ts';
import { useTheme } from '../theme/ThemeContext.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';
import SignInModal from './SignInModal.tsx';

interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: Language;
}

export default function SignUpModal({ isOpen, onClose }: SignUpModalProps) {
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);

  const { theme } = useTheme();
  const { t } = useTranslation();
  if (!isOpen && !showSignIn) return null;

  const handleEmailSubmit = (email: string) => {
    setVerificationEmail(email);
  };

  if (verificationEmail) {
    return <VerificationModal email={verificationEmail} onClose={onClose} />;
  }
  if (showSignIn) {
    return <SignInModal isOpen={true} onClose={() => { setShowSignIn(false); onClose(); }} currentLanguage={{ code: 'en', name: 'English', flag: '🇺🇸' }} />;
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

        {/* Custom title and subtitle for sign up */}
        <div className="text-center mb-8">
          <h2 className={`text-3xl font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Welcome</h2>
          <p className="text-gray-400 text-sm">Create your free account. No credit card needed. Upgrade anytime.</p>
        </div>
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
          <div className="pt-4 text-center text-xs text-gray-500">
            Already have an account?
            <button
              type="button"
              className="ml-1 font-semibold text-[#007BFF] hover:underline inline-flex items-center gap-1"
              onClick={() => { setShowSignIn(true); }}
            >
              Log In <span className="ml-0.5" style={{ color: '#007BFF', fontWeight: 700 }}>&rarr;</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}