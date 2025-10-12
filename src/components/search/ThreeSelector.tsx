import { useState } from 'react';
import { Focus, Paperclip } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import ActionButton from '../SearchInput/ActionButton.tsx';
import FunctionSelector from '../SearchInput/FunctionSelector.tsx';
import type { FunctionType } from '../SearchInput/FunctionSelector.tsx';
import SearchButton from '../SearchInput/SearchButton.tsx';
import SearchTextArea from '../SearchInput/SearchTextArea.tsx';
import FocusModal from './FocusModal.tsx';
import ProModal from '../subscription/ProModal.tsx';
import SignUpModal from '../auth/SignUpModal.tsx';
import { useSearchLimit } from '../../hooks/useSearchLimit.ts';
import { useProQuota } from '../../hooks/useProQuota.ts';
import { useSession } from '../../hooks/useSession.ts';
import type { FocusMode } from './types.ts';
import { useAccentColor } from '../../hooks/useAccentColor.ts';

export default function ThreeSelector() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedFunction, setSelectedFunction] = useState<FunctionType>('search');
  const [selectedMode, setSelectedMode] = useState<FocusMode>('focus');
  const [showFocusModal, setShowFocusModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const { decrementSearches, remainingSearches, hasSearchesLeft } = useSearchLimit();
  const { decrementProQuota, hasProQuotaLeft, canAccessPro } = useProQuota();
  const { session } = useSession();
  const accentColor = useAccentColor();

  // Function mapping for navigation
  const getFunctionRoute = (functionType: FunctionType): string => {
    switch (functionType) {
      case 'search':
        return '/search';
      case 'pro-search':
        return '/pro-search';
      case 'insights':
        return '/insights-results';
      case 'research':
        return '/research-results';
      case 'labs':
        return '/labs-results';
      case 'pro-labs':
        return '/pro-labs-results';
      default:
        return '/search';
    }
  };

  // Check if function should use pro mode
  const isProFunction = (functionType: FunctionType): boolean => {
    return ['pro-search', 'research', 'pro-labs'].includes(functionType);
  };

  const handleFunctionSelect = (functionType: FunctionType) => {
    setSelectedFunction(functionType);
  };

  const handleSignUpRequired = () => {
    setShowSignUpModal(true);
  };

  const handleSearch = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    const isProFeature = isProFunction(selectedFunction);

    // For Pro features, check Pro quota (Standard users only)
    if (isProFeature) {
      if (!canAccessPro) {
        setShowSignUpModal(true);
        return;
      }
      
      if (!hasProQuotaLeft) {
        setShowProModal(true);
        return;
      }
    }

    // For regular searches, check general search limit
    if (!isProFeature && !hasSearchesLeft) {
      setShowProModal(true);
      return;
    }

    // Decrement appropriate quota
    let success = true;
    if (isProFeature) {
      success = await decrementProQuota();
    } else {
      const result = await decrementSearches();
      success = result !== undefined ? result : false;
    }

    if (success) {
      const route = getFunctionRoute(selectedFunction);
      const proParam = isProFeature ? '&pro=true' : '';
      const modeParam = selectedMode !== 'focus' ? `&mode=${selectedMode}` : '';
      
      navigate(`${route}?q=${encodeURIComponent(trimmedQuery)}${proParam}${modeParam}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Unified container with border encompassing both input and buttons */}
      <div 
        className="relative border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#2a2a2a] transition-colors"
        style={{
          borderColor: undefined, // default
        }}
        onFocus={(e) => {
          if (e.currentTarget.contains(e.target)) {
            e.currentTarget.style.borderColor = accentColor.primary;
          }
        }}
        onBlur={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node) === false) {
            e.currentTarget.style.borderColor = '';
          }
        }}
      >
        {/* Text input area */}
        <div className="relative">
          <SearchTextArea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Button bar - inside the unified container */}
        <div className="flex items-center justify-between px-4 py-1.5">
          {/* Left side: Function Selector */}
          <div className="flex items-center gap-4">
            <FunctionSelector
              selectedFunction={selectedFunction}
              onFunctionSelect={handleFunctionSelect}
              onSignUpRequired={handleSignUpRequired}
              className="min-w-0" // Allow shrinking
            />
          </div>

          {/* Right side: Action buttons and Search Button */}
          <div className="flex items-center gap-3">
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
              onClick={() => {
                if (!session) {
                  setShowSignUpModal(true);
                } else {
                  // Handle file attachment
                  console.log('File attachment clicked');
                }
              }}
            />

            <SearchButton
              onClick={handleSearch}
              isActive={query.trim().length > 0}
              disabled={!query.trim() || !hasSearchesLeft}
            />
          </div>
        </div>
      </div>

      {/* Remaining searches indicator */}
      {session && (
        <div className="mt-2 text-center">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {remainingSearches} searches remaining today
          </span>
        </div>
      )}

      {/* Modals */}
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

      <SignUpModal 
        isOpen={showSignUpModal}
        onClose={() => setShowSignUpModal(false)}
        currentLanguage={{ code: 'en', name: 'English', flag: '🇺🇸' }}
      />
    </div>
  );
}
