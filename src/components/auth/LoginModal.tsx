import React, { useState } from 'react';
import { X } from 'lucide-react';
import AuthHeader from './components/AuthHeader';
import GoogleButton from './buttons/GoogleButton';
import EmailForm from './components/EmailForm';
import Divider from './components/Divider';
import VerificationModal from './components/VerificationModal';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  context?: 'default' | 'pro';
}

export default function LoginModal({ isOpen, onClose, context = 'default' }: LoginModalProps) {
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] w-full max-w-[480px] p-10 rounded-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <AuthHeader mode="login" context={context} />

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
          <Divider text="or continue with email" />
          <EmailForm 
            mode="login"
            onSubmit={handleEmailSubmit} 
          />
        </div>
      </div>
    </div>
  );
}