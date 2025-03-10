import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Focus, Paperclip } from 'lucide-react';
import ActionButton from '../SearchInput/ActionButton';
import ToggleSwitch from '../SearchInput/ToggleSwitch';
import SearchButton from '../SearchInput/SearchButton';
import SearchTextArea from '../SearchInput/SearchTextArea';
import FocusModal from './FocusModal';
import ProModal from '../subscription/ProModal';
import ProTooltip from '../subscription/ProTooltip';
import { useSession } from '../../hooks/useSession';
import { useSearchLimit } from '../../hooks/useSearchLimit';
import { useSubscription } from '../../hooks/useSubscription';
import type { FocusMode } from './types';

export default function ProSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<FocusMode>('focus');
  const [showFocusModal, setShowFocusModal] = useState(false);
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
      navigate(`/search?q=${encodeURIComponent(trimmedQuery)}&pro=true&mode=${selectedMode}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleAttachClick = () => {
    // For pro users, attach button does nothing for now
  };

  return (
    <div className="relative w-full">
      <SearchTextArea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        isPro={true}
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
            onClick={handleAttachClick}
          />
        </div>

        <div className="flex items-center gap-4">
          <div 
            className="relative"
            onMouseEnter={() => setShowProTooltip(true)}
            onMouseLeave={() => setShowProTooltip(false)}
          >
            <ToggleSwitch
              isEnabled={true}
              onToggle={() => {}}
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
    </div>
  );
}