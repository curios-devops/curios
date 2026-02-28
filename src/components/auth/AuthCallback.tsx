import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.ts';
import { env } from '../../config/env.ts';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useTheme } from '../theme/ThemeContext';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { theme } = useTheme();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Debugging: log which Supabase project/url the client is using
        console.info('Auth callback running - supabase URL:', env.supabase.url);

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('Error getting session after callback:', sessionError);
        }

        // Also try to get the user object directly (helps confirm server-side user creation)
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.warn('getUser returned error:', userError);
        }

        console.info('Auth callback session:', session ?? null);
        console.info('Auth callback user:', userData ?? null);

        // Database trigger automatically creates profile for new users
        // Wait a short moment to allow any DB trigger to run (if present)
        if (session?.user) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        navigate('/');
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-black' : 'bg-white'} flex items-center justify-center`}>
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-[#007BFF] animate-spin mx-auto mb-4" />
        <h1 className={`text-2xl font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>
          {t('completingSignIn')}
        </h1>
        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} text-sm`}>
          {t('verifyingCredentials')}
        </p>
      </div>
    </div>
  );
}