import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Focus, Paperclip } from 'lucide-react';
import ActionButton from '../SearchInput/ActionButton';
import ToggleSwitch from '../SearchInput/ToggleSwitch';
import SearchButton from '../SearchInput/SearchButton';
import SearchTextArea from '../SearchInput/SearchTextArea';
import FocusModal from './FocusModal';
import ProModal from '../subscription/ProModal';
import ProTooltip from '../subscription/ProTooltip';
import AuthModal from '../auth/AuthModal';
import { useSession } from '../../hooks/useSession';
import { useSearchLimit } from '../../hooks/useSearchLimit';
import { useSubscription } from '../../hooks/useSubscription';
import { useUserType } from '../../hooks/useUserType';
import type { FocusMode } from './types';

export default function RegularSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isPro, setIsPro] = useState(false);
  const [selectedMode, setSelectedMode] = useState<FocusMode>('focus');
  const [showFocusModal, setShowFocusModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showProTooltip, setShowProTooltip] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const tooltipTimeoutRef = useRef<number>();
  
  const { session } = useSession();
  const { subscription } = useSubscription();
  const { 
    remainingSearches, 
    maxSearches, 
    hasSearchesLeft, 
    showWarning,
    isProDisabled,
    decrementSearches 
  } = useSearchLimit();
  const userType = useUserType();

  const handleProToggle = () => {
    if (userType === 'guest') {
      setShowAuthModal(true);
      return;
    }

    if (isProDisabled) {
      setShowProModal(true);
      return;
    }

    setIsPro(!isPro);
  };

  const handleSearch = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    if (isPro) {
      // Only check pro search quota when using pro search
      if (!hasSearchesLeft) {
        setShowProModal(true);
        return;
      }

      const success = await decrementSearches(true);
      if (!success) {
        setShowProModal(true);
        return;
      }
    }

    navigate(
      isPro 
        ? `/pro-search?q=${encodeURIComponent(trimmedQuery)}&mode=${selectedMode}`
        : `/search?q=${encodeURIComponent(trimmedQuery)}&mode=${selectedMode}`
    );
  };

  const handleTooltipEnter = () => {
    // Clear any existing timeout
    if (tooltipTimeoutRef.current) {
      window.clearTimeout(tooltipTimeoutRef.current);
    }
    setShowProTooltip(true);
  };

  const handleTooltipLeave = () => {
    // Set a timeout before hiding the tooltip
    tooltipTimeoutRef.current = window.setTimeout(() => {
      setShowProTooltip(false);
    }, 1000); // 1 second delay
  };

  return (
    <div className="relative w-full">
      <SearchTextArea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSearch();
          }
        }}
        isPro={isPro}
      />

      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ActionButton
            icon={Focus}
            label="Focus"
            tooltip="Set a focus for your sources"
            onClick={() => setShowFocusModal(true)}
            mode={selectedMode}
          />
          <ActionButton
            icon={Paperclip}
            label="Attach"
            tooltip="Attach files to your search"
            onClick={() => userType === 'guest' && setShowAuthModal(true)}
          />
        </div>

        <div className="flex items-center gap-4">
          <div 
            className="relative"
            onMouseEnter={handleTooltipEnter}
            onMouseLeave={handleTooltipLeave}
          >
            <ToggleSwitch
              isEnabled={isPro}
              onToggle={handleProToggle}
              disabled={isProDisabled}
              showWarning={showWarning}
            />
            {showProTooltip && (
              <ProTooltip 
                remainingSearches={remainingSearches}
                maxSearches={maxSearches}
                onUpgrade={() => {
                  setShowProTooltip(false);
                  setShowProModal(true);
                }}
                onSignIn={() => {
                  setShowProTooltip(false);
                  setShowAuthModal(true);
                }}
                onClose={() => setShowProTooltip(false)}
                isLoggedIn={userType !== 'guest'}
                subscription={subscription}
                alwaysShowUpgrade={!subscription?.isPro}
              />
            )}
          </div>
          <SearchButton
            onClick={handleSearch}
            isActive={query.trim().length > 0}
            disabled={!query.trim() || (isPro && !hasSearchesLeft)}
          />
        </div>
      </div>

      <FocusModal 
        isOpen={showFocusModal}
        onClose={() => setShowFocusModal(false)}
        selectedMode={selectedMode}
        onSelectMode={setSelectedMode}
      />

      <ProModal 
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
      />

      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        context="pro"
      />
    </div>
  );
}