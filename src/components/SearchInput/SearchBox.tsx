import React, { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Focus, Paperclip } from 'lucide-react';
import ActionButton from './ActionButton.tsx';
import ToggleSwitch from './ToggleSwitch.tsx';
import SearchButton from './SearchButton.tsx';
import SearchTextArea from './SearchTextArea.tsx';
import ProTooltip from '../subscription/ProTooltip.tsx';
import { useSession } from '../../hooks/useSession.ts';
import { useSearchLimit } from '../../hooks/useSearchLimit.ts';
import { useSubscription } from '../../hooks/useSubscription.ts';

// Lazy load ProModal to avoid loading Stripe unnecessarily
const ProModal = lazy(() => import('../subscription/ProModal.tsx'));

export default function SearchBox() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isPro, setIsPro] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showProTooltip, setShowProTooltip] = useState(false);
  
  const { session } = useSession();
  const { subscription } = useSubscription();
  const { remainingSearches, hasSearchesLeft, decrementSearches } = useSearchLimit();

  const handleSearch = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    if (!hasSearchesLeft) {
      setShowProModal(true);
      return;
    }

    const success = await decrementSearches();
    if (success) {
      navigate(`/search?q=${encodeURIComponent(trimmedQuery)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleProToggle = () => {
    if (!session) {
      setShowProModal(true);
      return;
    }

    if (!hasSearchesLeft) {
      setShowProTooltip(true);
      return;
    }

    setIsPro(!isPro);
  };

  return (
    <div className="w-full space-y-3">
      {/* Text input area - clean and dedicated for typing */}
      <div className="relative">
        <SearchTextArea
          value={query}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* Button bar - dedicated row for all controls */}
      <div className="flex items-center justify-between px-1">
        {/* Left side: Pro toggle */}
        <div 
          className="relative"
          onMouseEnter={() => setShowProTooltip(true)}
          onMouseLeave={() => setShowProTooltip(false)}
        >
          <ToggleSwitch
            isEnabled={isPro}
            onToggle={handleProToggle}
            disabled={!hasSearchesLeft}
          />
          {showProTooltip && (
            <ProTooltip 
              remainingSearches={remainingSearches}
              maxSearches={subscription?.isPro ? 600 : 6}
              onUpgrade={() => {
                setShowProTooltip(false);
                setShowProModal(true);
              }}
              onSignIn={() => setShowProModal(true)}
              onClose={() => setShowProTooltip(false)}
              isLoggedIn={!!session}
              subscription={subscription ? { isActive: subscription.isActive } : undefined}
            />
          )}
        </div>

        {/* Right side: Action buttons and Search */}
        <div className="flex items-center gap-3">
          <ActionButton
            icon={Focus}
            label="Focus"
            onClick={() => {}}
          />
          <ActionButton
            icon={Paperclip}
            label="Attach"
            onClick={() => {}}
          />

          <SearchButton
            onClick={handleSearch}
            isActive={query.trim().length > 0}
            disabled={!query.trim() || !hasSearchesLeft}
          />
        </div>
      </div>

      {showProModal && (
        <Suspense fallback={<div>Loading...</div>}>
          <ProModal 
            isOpen={showProModal}
            onClose={() => setShowProModal(false)}
          />
        </Suspense>
      )}
    </div>
  );
}