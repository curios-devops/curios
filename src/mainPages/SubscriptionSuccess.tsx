import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, CheckCircle } from 'lucide-react';
import { supabase } from "../lib/supabase.ts";
import { useTheme } from '../components/theme/ThemeContext';
import { useTranslation } from '../hooks/useTranslation';

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  const { t } = useTranslation();

  useEffect(() => {
    const updateUserProfile = async (): Promise<void> => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          throw new Error('No authenticated user found');
        }

        // Update user profile with new subscription status and search limits
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            subscription_status: 'active',
            remaining_searches: 500, // Set to pro user limit
            searches_reset_at: new Date().toISOString()
          })
          .eq('id', session.user.id);

        if (updateError) throw updateError;
      } catch (err) {
        console.error('Error updating user profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to update subscription');
      } finally {
        setLoading(false);
      }
    };

    updateUserProfile();
  }, []);

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-black' : 'bg-gray-50'} flex flex-col items-center justify-center p-4`}>
      <div className={`max-w-md w-full ${theme === 'dark' ? 'bg-[#111111]' : 'bg-white border border-gray-200'} rounded-xl p-8 text-center shadow-lg`}>
        <div className="flex justify-center mb-6">
          <Compass className="h-12 w-12 text-[#007BFF]" />
        </div>

        {loading ? (
          <div className="animate-pulse">
            <div className={`h-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded w-3/4 mx-auto mb-4`}></div>
            <div className={`h-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded w-1/2 mx-auto`}></div>
          </div>
        ) : error ? (
          <div className="text-red-500 mb-6">
            <p>{error}</p>
            <p className="text-sm mt-2">{t('contactSupport')}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2 mb-4">
              <CheckCircle className="text-green-500" size={24} />
              <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t('welcomeToPro')}</h1>
            </div>
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
              {t('proUpgradeSuccess')}
            </p>
          </>
        )}

        <button
          onClick={() => navigate('/')}
          className="w-full bg-[#007BFF] text-white py-3 rounded-lg hover:bg-[#0056b3] transition-colors"
        >
          {t('startExploring')}
        </button>
      </div>
    </div>
  );
}
