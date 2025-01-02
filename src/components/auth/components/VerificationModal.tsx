import React, { useState } from 'react';
import { Mail, X } from 'lucide-react';
import VerificationCodeInput from './VerificationCodeInput';

interface VerificationModalProps {
  email: string;
  onClose: () => void;
}

export default function VerificationModal({ email, onClose }: VerificationModalProps) {
  const [showCodeInput, setShowCodeInput] = useState(false);

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

        <div className="flex flex-col items-center text-center">
          {/* Email Icon */}
          <div className="w-20 h-20 bg-[#222222] rounded-full flex items-center justify-center mb-6">
            <Mail className="w-10 h-10 text-white" />
          </div>

          {/* Title */}
          <h2 className="text-3xl font-medium text-white mb-4">
            Check your email
          </h2>

          {/* Subtitle */}
          <p className="text-gray-400 text-base mb-8">
            A temporary sign-in link has been sent to {email}
          </p>

          {!showCodeInput ? (
            <button
              onClick={() => setShowCodeInput(true)}
              className="w-full text-gray-400 py-3.5 rounded-lg hover:text-white transition-colors"
            >
              Enter code manually
            </button>
          ) : (
            <VerificationCodeInput 
              email={email}
              onSubmit={() => onClose()}
              onClose={() => setShowCodeInput(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}