import React, { useState } from 'react';
import { signInWithEmail } from '../../services/auth/authService';
import { validateEmail } from '../../utils/validation';
import EmailInput from './EmailInput';

interface EmailFormProps {
  onSubmit: (email: string) => void;
}

export default function EmailForm({ onSubmit }: EmailFormProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const validation = validateEmail(email);
    if (!validation.valid) {
      setError(validation.error || 'Invalid email format');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await signInWithEmail(email);
      if (response.success) {
        onSubmit(email);
      } else {
        setError(response.error || 'Failed to send magic link');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <EmailInput
        value={email}
        onChange={(value) => {
          setEmail(value);
          setError('');
        }}
        error={error}
        disabled={loading}
      />

      <button
        onClick={handleSubmit}
        disabled={!email.trim() || loading}
        className={`
          w-full 
          py-3.5 
          rounded-lg 
          transition-all
          ${email.trim() && !loading
            ? 'bg-[#007BFF] text-white hover:bg-[#0056b3]'
            : 'bg-[#222222] text-gray-500 cursor-not-allowed'
          }
        `}
      >
        {loading ? 'Sending magic link...' : 'Continue with email'}
      </button>
    </div>
  );
}