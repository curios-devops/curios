import { useState } from 'react';
import { signInWithEmail, signUpWithEmail } from '../services/auth/authService';
import type { AuthMode } from '../services/auth/types';

export function useAuthFlow() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);

  const handleAuth = async (email: string, mode: AuthMode) => {
    setLoading(true);
    setError(null);

    try {
      const authFn = mode === 'signup' ? signUpWithEmail : signInWithEmail;
      const response = await authFn(email);

      if (!response.success) {
        throw new Error(response.error);
      }

      setVerificationEmail(email);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resetVerification = () => {
    setVerificationEmail(null);
    setError(null);
  };

  return {
    loading,
    error,
    verificationEmail,
    handleAuth,
    resetVerification
  };
}