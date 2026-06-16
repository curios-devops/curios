import { X, BatteryWarning } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useTheme } from '../theme/ThemeContext';

interface QuotaExhaustedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Shown to Pro subscribers who have used all of their daily Pro Credits.
// Status/message only — no checkout (they already pay). Credits refill next day.
export default function QuotaExhaustedModal({ isOpen, onClose }: QuotaExhaustedModalProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 ${theme === 'dark' ? 'bg-black/70' : 'bg-gray-500/50'} flex items-center justify-center z-50`}>
      <div className={`${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'} w-full max-w-[420px] p-8 rounded-2xl relative text-center`}>
        <button
          onClick={onClose}
          className={`absolute top-5 right-5 ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'} transition-colors`}
        >
          <X size={20} />
        </button>

        <div className="flex justify-center mb-4 mt-2">
          <BatteryWarning size={40} style={{ color: 'var(--accent-primary)' }} />
        </div>

        <h2 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {t('quotaExhaustedTitle') || "You're out of Pro Credits"}
        </h2>
        <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          {t('quotaExhaustedBody') || 'Your daily Pro Credits are used up. They refresh tomorrow.'}
        </p>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-lg text-white transition-colors"
          style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
        >
          {t('gotIt') || 'Got it'}
        </button>
      </div>
    </div>
  );
}
