import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Focus, Paperclip } from 'lucide-react';
import ActionButton from '../SearchInput/ActionButton';
import ToggleSwitch from '../SearchInput/ToggleSwitch';
import SearchButton from '../SearchInput/SearchButton';
import SearchTextArea from '../SearchInput/SearchTextArea';
import ProModal from '../subscription/ProModal';
import ProTooltip from '../subscription/ProTooltip';
import AuthModal from '../auth/AuthModal';
import { useSession } from '../../hooks/useSession';
import { useSearchLimit } from '../../hooks/useSearchLimit';
import { useSubscription } from '../../hooks/useSubscription';
import { useUserType } from '../../hooks/useUserType';

export default function RegularSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isPro, setIsPro] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showProTooltip, setShowProTooltip] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const { session } = useSession();
  const { subscription } = useSubscription();
  const { remainingSearches, maxSearches, hasSearchesLeft, decrementSearches } = useSearchLimit();
  const userType = useUserType();

  const handleSearch = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    if (!hasSearchesLeft) {
      setShowProModal(true);
      return;
    }

    const success = await decrementSearches();
    if (success) {
      navigate(`/search?q=${encodeURIComponent(trimmedQuery)}&pro=${isPro}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleProToggle = () => {
    if (userType === 'guest') {
      setShowAuthModal(true);
      return;
    }

    if (!hasSearchesLeft) {
      setShowProModal(true);
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

      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        context="pro"
      />
    </div>
  );
}