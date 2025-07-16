import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Focus, Paperclip } from 'lucide-react';
import ActionButton from '../SearchInput/ActionButton.tsx';
import ToggleSwitch from '../SearchInput/ToggleSwitch.tsx';
import SearchButton from '../SearchInput/SearchButton.tsx';
import SearchTextArea from '../SearchInput/SearchTextArea.tsx';
import ProModal from '../subscription/ProModal.tsx';
import ProTooltip from '../subscription/ProTooltip.tsx';
import { useSession } from '../../hooks/useSession.ts';
import { useSearchLimit } from '../../hooks/useSearchLimit.ts';
import { useSubscription } from '../../hooks/useSubscription.ts';

export default function SearchBox() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isPro, setIsPro] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showProTooltip, setShowProTooltip] = useState(false);
  const tooltipTimeoutRef = useRef<number>();
  
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

  const handleMouseEnter = () => {
    tooltipTimeoutRef.current = globalThis.setTimeout(() => {
      setShowProTooltip(true);
    }, 200);
  };

  const handleMouseLeave = () => {
    globalThis.clearTimeout(tooltipTimeoutRef.current);
    setShowProTooltip(false);
  };

  return (
    <div className="relative w-full">
      {/* Title section */}
      <div className="w-full flex justify-center mb-8">
        <h1 className="text-3xl font-bold text-center">
          <span className="text-blue-600">AI</span> Web Search
        </h1>
      </div>
      <SearchTextArea
        value={query}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      {/* Button bar - no border or division line */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
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
        </div>

        <div className="flex items-center gap-4">
          <div 
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <ToggleSwitch
              isEnabled={isPro}
              onToggle={handleProToggle}
              disabled={!hasSearchesLeft}
            />
            {showProTooltip && (
              <ProTooltip 
                remainingSearches={remainingSearches}
                maxSearches={subscription?.isPro ? 500 : 5}
                onUpgrade={() => {
                  setShowProTooltip(false);
                  setShowProModal(true);
                }}
                onClose={() => setShowProTooltip(false)}
              />
            )}
          </div>
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