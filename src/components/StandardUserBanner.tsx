import { useState, lazy, Suspense } from 'react';

// Lazy load ProModal to avoid loading Stripe unnecessarily
const ProModal = lazy(() => import('./subscription/ProModal.tsx'));

export default function StandardUserBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const [showProModal, setShowProModal] = useState(false);

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
              <span className="text-white font-medium">You are missing out</span>
              <br />
              Upgrade to Pro for unlimited searches and advanced features.
            </p>

            {/* Action buttons - more subtle styling */}
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={handleUpgrade}
                className="bg-[#007BFF] hover:bg-[#0056b3] text-white px-2 py-1 rounded text-[10px] font-medium transition-colors"
              >
                Upgrade
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-gray-500 hover:text-gray-400 px-2 py-1 text-[10px] transition-colors"
              >
                Dismiss
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
