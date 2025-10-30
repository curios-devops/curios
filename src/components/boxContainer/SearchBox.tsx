import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { type LucideIcon } from 'lucide-react';

// SVG for mic icon, styled to match lucide-react icons
const MicIcon = React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>((props, ref) => (
  <svg ref={ref} width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="22" />
    <line x1="8" y1="22" x2="16" y2="22" />
  </svg>
)) as LucideIcon;
MicIcon.displayName = 'MicIcon';

import ActionButton from '../boxContainerInput/ActionButton.tsx';
import ToggleSwitch from '../boxContainerInput/ToggleSwitch.tsx';
import SearchButton from '../boxContainerInput/SearchButton.tsx';
import SearchTextArea from '../boxContainerInput/SearchTextArea.tsx';
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
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | number>();
  
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
      // Navigate to pro-search if Pro mode is enabled, otherwise regular search
      const searchPath = isPro ? '/pro-search' : '/search';
      navigate(`${searchPath}?q=${encodeURIComponent(trimmedQuery)}`);
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
            icon={MicIcon}
            label="Dictation"
            tooltip="Dictation"
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