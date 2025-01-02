import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Paperclip } from 'lucide-react';
import ActionButton from '../SearchInput/ActionButton';
import ToggleSwitch from '../SearchInput/ToggleSwitch';
import SearchButton from '../SearchInput/SearchButton';
import SearchTextArea from '../SearchInput/SearchTextArea';
import ProTooltip from './ProTooltip';
import AuthModal from '../auth/AuthModal';
import FocusModal from './FocusModal';
import FocusButton from './FocusButton';
import type { FocusMode } from './types';

export default function RegularSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [showProTooltip, setShowProTooltip] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showFocusModal, setShowFocusModal] = useState(false);
  const [focusMode, setFocusMode] = useState<FocusMode>('focus');

  const handleSearch = () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;
    navigate(`/search?q=${encodeURIComponent(trimmedQuery)}&mode=${focusMode}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleFocusModeSelect = (mode: FocusMode) => {
    // Only research and finance modes require Pro
    if (mode === 'research' || mode === 'finance') {
      setShowAuthModal(true);
      return;
    }
    setFocusMode(mode);
    setShowFocusModal(false);
  };

  return (
    <div className="relative w-full">
      <SearchTextArea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        isPro={false}
      />

      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FocusButton
            mode={focusMode}
            onClick={() => setShowFocusModal(true)}
          />
          <div className="group relative">
            <ActionButton
              icon={Paperclip}
              label="Attach"
              onClick={() => setShowAuthModal(true)}
            />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#1a1a1a] text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Attach files. Sign in to attach.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div 
            className="relative"
            onMouseEnter={() => setShowProTooltip(true)}
            onMouseLeave={() => setShowProTooltip(false)}
          >
            <ToggleSwitch
              isEnabled={false}
              onToggle={() => setShowAuthModal(true)}
              disabled={false}
            />
            {showProTooltip && (
              <ProTooltip onSignIn={() => setShowAuthModal(true)} />
            )}
          </div>
          <SearchButton
            onClick={handleSearch}
            isActive={query.trim().length > 0}
            disabled={!query.trim()}
          />
        </div>
      </div>

      <FocusModal
        isOpen={showFocusModal}
        onClose={() => setShowFocusModal(false)}
        selectedMode={focusMode}
        onSelectMode={handleFocusModeSelect}
      />

      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        context="pro"
      />
    </div>
  );
}