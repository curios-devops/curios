import { useState, lazy, Suspense } from 'react';
import { useAccentColor } from '../hooks/useAccentColor';
import { useTranslation } from '../hooks/useTranslation';

// Lazy load ProModal to avoid loading Stripe unnecessarily
const ProModal = lazy(() => import('./subscription/ProModal.tsx'));

export default function StandardUserBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const [showProModal, setShowProModal] = useState(false);
  const accentColor = useAccentColor();
  const { t } = useTranslation();

  const handleDismiss = () => {
    setIsVisible(false);
    // Store dismissal in localStorage so it doesn't show again in this session
    localStorage.setItem('standardBannerDismissed', 'true');
  };

  const handleUpgrade = () => {
    setShowProModal(true);
  };

  // Don't show if dismissed or if already dismissed in this session
  if (!isVisible || localStorage.getItem('standardBannerDismissed') === 'true') {
    return null;
  }

  return (
    <>
      {/* Position to the right of sidebar - left margin accounts for sidebar width */}
      <div className="fixed bottom-3 left-[calc(12rem+1rem)] z-40 animate-fade-in">
        <div className="max-w-[240px]">
          {/* Content - styled like home page text */}
          <div className="text-left">
            <p className="text-gray-400 text-[10px] mb-1.5 leading-tight">
              <span className="text-gray-900 dark:text-white font-medium">{t('missingOut')}</span>
              <br />
              {t('upgradeToProMessage')}
            </p>

            {/* Action buttons - more subtle styling */}
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={handleUpgrade}
                style={{ backgroundColor: accentColor.primary }}
                className="text-white px-2 py-1 rounded text-[10px] font-medium transition-colors hover:opacity-90"
              >
                {t('upgrade')}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-gray-500 hover:text-gray-400 px-2 py-1 text-[10px] transition-colors"
              >
                {t('dismiss')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pro modal - lazy loaded */}
      {showProModal && (
        <Suspense fallback={<div>Loading...</div>}>
          <ProModal
            isOpen={showProModal}
            onClose={() => setShowProModal(false)}
          />
        </Suspense>
      )}
    </>
  );
}
