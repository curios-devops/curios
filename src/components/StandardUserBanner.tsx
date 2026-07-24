import { useState, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
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
    setIsVisible(false); // hide the nudge so it doesn't stack behind the Pro modal
    setShowProModal(true);
  };

  // Hide the nudge once dismissed/upgraded, but keep rendering so the Pro modal
  // (opened from "Upgrade") can still mount.
  const showNudge = isVisible && localStorage.getItem('standardBannerDismissed') !== 'true';

  return (
    <>
      {/* Centered modal (side-to-side with margin on mobile). */}
      {showNudge && createPortal(
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4 animate-fade-in" onClick={handleDismiss}>
          <div
            className="w-full max-w-md rounded-2xl border p-6 sm:p-8 relative"
            style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-default)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--ui-text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ui-text-primary)'; e.currentTarget.style.backgroundColor = 'var(--ui-bg-secondary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ui-text-muted)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
              aria-label={t('dismiss')}
            >
              <X size={20} />
            </button>

            <h2 className="text-2xl font-semibold" style={{ color: 'var(--ui-text-primary)' }}>{t('missingOut')}</h2>
            <p className="text-base mt-3 leading-relaxed" style={{ color: 'var(--ui-text-secondary)' }}>
              {t('upgradeToProMessage')}
            </p>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleUpgrade}
                style={{ backgroundColor: accentColor.primary, color: 'var(--ui-text-on-accent)' }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors hover:opacity-90"
              >
                {t('upgrade')}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-5 py-2.5 rounded-xl text-sm font-medium border transition-colors"
                style={{ color: 'var(--ui-text-secondary)', borderColor: 'var(--ui-border-default)' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--ui-bg-secondary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {t('dismiss')}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Pro modal - lazy loaded */}
      {showProModal && createPortal(
        <Suspense fallback={null}>
          <ProModal
            isOpen={showProModal}
            onClose={() => setShowProModal(false)}
          />
        </Suspense>,
        document.body,
      )}
    </>
  );
}
