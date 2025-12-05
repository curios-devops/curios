import { useState, useEffect } from 'react';
import { verifyOtp } from '../../../lib/auth';
import { useTheme } from '../../theme/ThemeContext';

interface VerificationCodeInputProps {
  email: string;
  onSubmit: () => void;
  onClose: () => void;
}

export default function VerificationCodeInput({ email, onSubmit, onClose }: VerificationCodeInputProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const { theme } = useTheme();

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (code.length !== 6) return;
    if (timeLeft <= 0) {
      setError('Verification code has expired. Please request a new one.');
      return;
    }
    
    setLoading(true);
    setError('');

    const response = await verifyOtp(email, code);
    
    if (!response.error && (response.user || response.session)) {
      // Wait a moment for the auth state change to propagate
      setTimeout(() => {
        onSubmit();
      }, 1000);
    } else {
      const errorMessage = response.error && typeof response.error === 'object' && 'message' in response.error
        ? (response.error as { message: string }).message
        : 'Invalid verification code';
      setError(errorMessage);
      setCode(''); // Clear the input on error
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="Enter verification code"
          value={code}
          onChange={(e) => {
            const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
            setCode(value);
            setError('');
          }}
          disabled={loading || timeLeft <= 0}
          className={`w-full ${theme === 'dark' ? 'bg-[#222222] text-white border-gray-700 placeholder-gray-500' : 'bg-gray-100 text-gray-900 border-gray-300 placeholder-gray-400'} border ${
            error ? 'border-red-500' : timeLeft <= 0 ? 'border-yellow-500' : ''
          } rounded-lg px-4 py-3.5 focus:outline-none focus:border-[#007BFF] transition-colors text-center tracking-wider text-lg`}
        />
        {timeLeft > 0 && (
          <div className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}

      {timeLeft <= 0 ? (
        <p className="text-sm text-yellow-500 text-center">
          Verification code has expired. Please request a new one.
        </p>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={code.length !== 6 || loading}
          className={`w-full py-3.5 rounded-lg transition-all ${
            code.length === 6 && !loading
              ? 'text-white'
              : theme === 'dark' 
                ? 'bg-[#222222] text-gray-500 cursor-not-allowed' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
          style={code.length === 6 && !loading ? { backgroundColor: 'var(--accent-primary)' } : undefined}
          onMouseEnter={(e) => { if (code.length === 6 && !loading) e.currentTarget.style.backgroundColor = 'var(--accent-hover)'; }}
          onMouseLeave={(e) => { if (code.length === 6 && !loading) e.currentTarget.style.backgroundColor = 'var(--accent-primary)'; }}
        >
          {loading ? 'Verifying...' : 'Continue'}
        </button>
      )}

      <button
        onClick={onClose}
        className={`w-full py-2 transition-colors text-sm ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
      >
        Back
      </button>
    </div>
  );
}