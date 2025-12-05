import { useState } from 'react';
import { Mail, X } from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import VerificationCodeInput from './VerificationCodeInput';

interface VerificationModalProps {
  email: string;
  onClose: () => void;
}

export default function VerificationModal({ email, onClose }: VerificationModalProps) {
  const [showCodeInput, setShowCodeInput] = useState(false);
  const { theme } = useTheme();

  const handleVerificationSuccess = () => {
    // Close the modal after successful verification
    // The useSession hook will automatically detect the auth state change
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className={`${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'} w-full max-w-[480px] p-10 rounded-2xl relative`}>
        <button
          onClick={onClose}
          className={`absolute top-6 right-6 ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'} transition-colors`}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center">
          {/* Email Icon */}
          <div className={`w-20 h-20 ${theme === 'dark' ? 'bg-[#222222]' : 'bg-gray-100'} rounded-full flex items-center justify-center mb-6`}>
            <Mail className={`w-10 h-10 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`} />
          </div>

          {/* Title */}
          <h2 className={`text-3xl font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>
            Check your email
          </h2>

          {/* Subtitle */}
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} text-base mb-8`}>
            A temporary sign-in link has been sent to {email}
          </p>

          {!showCodeInput ? (
            <button
              onClick={() => setShowCodeInput(true)}
              className={`w-full ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'} py-3.5 rounded-lg transition-colors`}
            >
              Enter code manually
            </button>
          ) : (
            <VerificationCodeInput 
              email={email}
              onSubmit={handleVerificationSuccess}
              onClose={() => setShowCodeInput(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}