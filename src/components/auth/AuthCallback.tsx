import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.ts';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        // Database trigger automatically creates profile for new users
        // Just wait a moment to ensure it's created
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
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-[#007BFF] animate-spin mx-auto mb-4" />
        <h1 className="text-2xl font-medium text-white mb-2">
          {t('completingSignIn')}
        </h1>
        <p className="text-gray-400 text-sm">
          {t('verifyingCredentials')}
        </p>
      </div>
    </div>
  );
}