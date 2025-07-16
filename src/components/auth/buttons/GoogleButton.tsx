import { signInWithGoogle } from '../../../services/auth/google.ts';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { useTheme } from '../../theme/ThemeContext.tsx';

interface GoogleButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function GoogleButton({ onSuccess, onError }: GoogleButtonProps) {const { t } = useTranslation();
  const { theme } = useTheme();
    const handleClick = async () => {
    try {
      const response = await signInWithGoogle();
      if (response.success) {
        onSuccess?.();
      } else {
        onError?.(response.error || 'Failed to sign in with Google');
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  return (
    <button
      className={`w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-lg transition-colors ${
        theme === 'dark' ? 'bg-[#222222] text-white border-gray-700 hover:bg-[#2a2a2a]' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
      onClick={handleClick}type="button"// Make text responsive: smaller font on smaller screens


      // Make text responsive: smaller font on smaller screens
      // Consider hiding text on very small screens if needed, e.g., using md:block class and a span
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="currentColor"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="currentColor"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="currentColor"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      <span className="text-sm sm:text-base">{t('continue_with_google')}</span>
    </button>
  );
}