import { X, Check } from 'lucide-react';
import { useState } from 'react';
import { useSession } from '../../hooks/useSession';
import { useTranslation } from '../../hooks/useTranslation';
import { useAccentColor } from '../../hooks/useAccentColor';
import { useTheme } from '../theme/ThemeContext';
import CheckoutButton from './CheckoutButton';

interface ProModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProModal({ isOpen, onClose }: ProModalProps) {
  const { session } = useSession();
  const { t } = useTranslation();
  const accentColor = useAccentColor();
  const { theme } = useTheme();
  const [selectedInterval, setSelectedInterval] = useState<'month' | 'year'>('month');
  const [error, setError] = useState<string | null>(null);

  // Debug: Log modal state
  console.log('ProModal state:', {
    isOpen,
    hasSession: !!session,
    userId: session?.user?.id,
    email: session?.user?.email,
  });

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 ${theme === 'dark' ? 'bg-black/70' : 'bg-gray-500/50'} flex items-center justify-center z-50`}>
      <div className={`${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'} w-full max-w-[900px] p-8 rounded-2xl relative`}>
        <button
          onClick={onClose}
          className={`absolute top-6 right-6 ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'} transition-colors z-20`}
        >
          <X size={20} />
        </button>

        <div className="text-center mb-4 mt-6">
          <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>{t('upgradeToPremium')}</h2>
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{t('unlockPremiumFeatures')}</p>
          {error && <p className="mt-2 text-red-500 text-sm">{error}</p>}

          <div className="flex justify-center items-center mt-4">
            <button
              onClick={() => setSelectedInterval('month')}
              className={`px-4 py-2 rounded-l-lg text-sm font-medium ${selectedInterval === 'month' ? 'text-white' : theme === 'dark' ? 'bg-[#333333] text-gray-400' : 'bg-gray-200 text-gray-600'}`}
              style={selectedInterval === 'month' ? { backgroundColor: accentColor.primary } : {}}
            >
              {t('monthly')}
            </button>
            <button
              onClick={() => setSelectedInterval('year')}
              className={`px-4 py-2 rounded-r-lg text-sm font-medium ${selectedInterval === 'year' ? 'text-white' : theme === 'dark' ? 'bg-[#333333] text-gray-400' : 'bg-gray-200 text-gray-600'}`}
              style={selectedInterval === 'year' ? { backgroundColor: accentColor.primary } : {}}
            >
              {t('yearly')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Standard Plan */}
          <div className={`${theme === 'dark' ? 'bg-[#222222] border-gray-800' : 'bg-gray-50 border-gray-200'} p-6 rounded-xl border flex flex-col justify-between h-full`}>
            <div>
              <div className="text-center mb-8">
                <h3 className={`text-xl font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>{t('standard')}</h3>
                <div className="flex items-center justify-center gap-2 mb-16">
                  <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-sm`}>{t('freeForever')}</span>
                </div>
              </div>

              <ul className={`space-y-4 mb-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pt-4`}>
                <Feature text={t('unlimitedBasicSearches')} theme={theme} />
                <Feature text={t('advancedSearchesPerDay')} theme={theme} />
                <Feature text={t('standardAiModel')} theme={theme} />
                <Feature text={t('createProfilePersonalize')} theme={theme} />
              </ul>
            </div>

            <button
              onClick={onClose}
              className={`w-full ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-300 hover:bg-gray-400'} text-white py-3 rounded-lg transition-colors`}
            >
              {t('continueWithStandard')}
            </button>
          </div>

          {/* Premium Plan */}
          <div className={`${theme === 'dark' ? 'bg-[#222222] border-gray-800' : 'bg-gray-50 border-gray-200'} p-6 rounded-xl border flex flex-col justify-between h-full`}>
            <div>
              <div className="text-center mb-6">
                <h3 className={`text-xl font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>{t('premium')}</h3>
                <div className="flex items-center justify-center gap-2">
                  <span className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {selectedInterval === 'month' ? '$5' : '$25'}
                  </span>
                  <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {selectedInterval === 'month' ? t('perMonth') : t('perYear')}
                  </span>
                </div>
                <div className="mt-2 h-6">
                  {selectedInterval === 'year' && (
                    <span className="text-sm" style={{ color: accentColor.primary }}>{t('save60')}</span>
                  )}
                </div>
              </div>

              <ul className={`space-y-4 mb-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} pt-4`}>
                <Feature text={t('unlimitedBasicSearches')} theme={theme} />
                <Feature text={t('advancedSearchesPerMonth')} theme={theme} />
                <Feature text={t('selectPreferredAiModel')} theme={theme} />
                <Feature text={t('uploadUnlimitedFiles')} theme={theme} />
                <Feature text={t('visualizeAnswersDalle')} theme={theme} />
              </ul>
            </div>

            <CheckoutButton
              interval={selectedInterval}
              disabled={!session?.user}
              onError={setError}
            >
              {!session?.user ? t('signInToUpgrade') : t('upgradeToPremium')}
            </CheckoutButton>
          </div>
        </div>

        {/* Maybe Later Button */}
        <button
          onClick={onClose}
          className={`mt-4 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'} transition-colors text-sm w-full text-center`}
        >
          {t('maybeLater')}
        </button>
      </div>
    </div>
  );
}

function Feature({ text, theme }: { text: string; theme: string }) {
  const accentColor = useAccentColor();
  const isDark = theme === 'dark';
  return (
    <li className={`flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
      <Check size={16} style={{ color: accentColor.primary }} />
      <span>{text}</span>
    </li>
  );
}