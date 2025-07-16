import { useState } from 'react';
import { signUpWithEmail, signInWithEmail } from '../../../lib/auth.ts';
import { validateEmail } from '../../../utils/validation.ts';
import EmailInput from './EmailInput.tsx';
import { useTranslation } from '../../../hooks/useTranslation.ts';

import { useTheme } from '../../theme/ThemeContext.tsx'; // Import useTheme
interface EmailFormProps {
  mode?: 'signup' | 'login';
  onSubmit: (email: string) => void;
}


export default function EmailForm({ mode = 'signup', onSubmit }: EmailFormProps) {
  const [email, setEmail] = useState('');
  const [_error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const { theme } = useTheme(); // Get the current theme

  const handleSubmit = async () => {
    // Validate email format
    const validation = validateEmail(email);
    if (!validation.valid) {
      setError(validation.error || 'Invalid email format');
      return;
    }

    setLoading(true);
    setError('');

    const authFn = mode === 'signup' ? signUpWithEmail : signInWithEmail;
    const response = await authFn(email);

    if (!response.error) {
      onSubmit(email);
    } else {
      let errorMessage = 'An error occurred';
      if (typeof response.error === 'object' && response.error !== null && 'message' in response.error) {
        errorMessage = (response.error.message as string) || 'An error occurred';
      }
      setError(errorMessage);
    }

    setLoading(false);
  };

  return (
    <div className="space-y-3">
      <EmailInput
        value={email}
        onChange={(value) => {
          setEmail(value as string);
          setError('');
        }}
        disabled={loading}
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!email.trim() || loading}
 className={`
 w-full rounded-lg px-4 py-3 text-center font-medium transition-colors
 ${theme === 'dark' ? 'bg-[#222222] text-white border-gray-700 hover:bg-[#2a2a2a]' : 'bg-blue-500 text-white hover:bg-blue-600'}
          ${!email.trim() || loading ? 'text-gray-500 cursor-not-allowed' : 'hover:bg-[#2a2a2a]'}

        `}
        >
        {loading ? 'Please wait...' : t('continue_with_email_button')}
      </button>
    </div>
  );
}