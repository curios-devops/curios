import { useState } from 'react';
import { signUpWithEmail, signInWithEmail } from '../../../lib/auth.ts';
import { validateEmail } from '../../../utils/validation.ts';
import EmailInput from './EmailInput.tsx';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { useAccentColor } from '../../../hooks/useAccentColor.ts';
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
  const accentColor = useAccentColor();

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
        className="w-full rounded-lg px-4 py-3 text-center font-medium transition-colors text-white"
        style={{ 
          backgroundColor: accentColor.primary,
          opacity: (!email.trim() || loading) ? 0.5 : 1,
          cursor: (!email.trim() || loading) ? 'not-allowed' : 'pointer',
          border: theme === 'dark' ? '1px solid rgba(255,255,255,0.04)' : undefined
        }}
        onMouseEnter={(e) => {
          if (email.trim() && !loading) {
            e.currentTarget.style.backgroundColor = accentColor.hover;
          }
        }}
        onMouseLeave={(e) => {
          if (email.trim() && !loading) {
            e.currentTarget.style.backgroundColor = accentColor.primary;
          }
        }}
      >
        {loading ? 'Please wait...' : t('continue_with_email_button')}
      </button>
    </div>
  );
}