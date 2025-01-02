import React, { useState } from 'react';
import { X } from 'lucide-react';
import AuthHeader from './components/AuthHeader';
import GoogleButton from './components/GoogleButton';
import EmailForm from './components/EmailForm';
import Divider from './components/Divider';
import VerificationModal from './components/VerificationModal';

interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  context?: 'default' | 'pro';
}

export default function SignUpModal({ isOpen, onClose, context = 'default' }: SignUpModalProps) {
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEmailSubmit = (email: string) => {
    setVerificationEmail(email);
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

        <AuthHeader mode="signup" context={context} />

        <div className="mt-10 space-y-6">
          <GoogleButton onClick={() => {}} />
          <Divider text="or continue with email" />
          <EmailForm onSubmit={handleEmailSubmit} />
        </div>
      </div>
    </div>
  );
}