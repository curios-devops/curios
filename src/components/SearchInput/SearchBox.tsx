import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Focus, Paperclip } from 'lucide-react';
import ActionButton from './ActionButton';
import ToggleSwitch from './ToggleSwitch';
import SearchButton from './SearchButton';
import SearchTextArea from './SearchTextArea';
import ProModal from '../subscription/ProModal';
import ProTooltip from '../subscription/ProTooltip';
import { useSession } from '../../hooks/useSession';
import { useSearchLimit } from '../../hooks/useSearchLimit';
import { useSubscription } from '../../hooks/useSubscription';

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
    <div className="relative w-full">
      <SearchTextArea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        isPro={isPro}
      />

      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
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
              subscription={subscription}
            />
          )}
        </div>

        {/* Right side: Action buttons and Search */}
        <div className="flex items-center gap-4">
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

      <ProModal 
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
      />
    </div>
  );
}