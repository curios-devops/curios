import React, { useState, useEffect } from 'react';
import { verifyOtp } from '../../../lib/auth';

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
    
    if (response.success) {
      onSubmit();
    } else {
      setError(response.error || 'Invalid verification code');
      setCode(''); // Clear the input on error
    }

    setLoading(false);
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
          className={`w-full bg-[#222222] border ${
            error ? 'border-red-500' : timeLeft <= 0 ? 'border-yellow-500' : 'border-gray-700'
          } rounded-lg px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#007BFF] transition-colors text-center tracking-wider text-lg`}
        />
        {timeLeft > 0 && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
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
              ? 'bg-[#007BFF] text-white hover:bg-[#0056b3]'
              : 'bg-[#222222] text-gray-500 cursor-not-allowed'
          }`}
        >
          {loading ? 'Verifying...' : 'Continue'}
        </button>
      )}

      <button
        onClick={onClose}
        className="w-full text-gray-400 py-2 hover:text-white transition-colors text-sm"
      >
        Back
      </button>
    </div>
  );
}