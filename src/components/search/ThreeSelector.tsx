import { useState, useRef, useEffect } from 'react';
import { type LucideIcon, Plus, Image as ImageIcon, FileText } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

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

import ActionButton from '../SearchInput/ActionButton.tsx';
import FunctionSelector from '../SearchInput/FunctionSelector.tsx';
import type { FunctionType } from '../SearchInput/FunctionSelector.tsx';
import SearchButton from '../SearchInput/SearchButton.tsx';
import SearchTextArea from '../SearchInput/SearchTextArea.tsx';
import ProModal from '../subscription/ProModal.tsx';
import SignInModal from '../auth/SignInModal.tsx';
import { useSearchLimit } from '../../hooks/useSearchLimit.ts';
import { useProQuota } from '../../hooks/useProQuota.ts';
import { useSession } from '../../hooks/useSession.ts';
import { useAccentColor } from '../../hooks/useAccentColor.ts';
import { useTranslation } from '../../hooks/useTranslation.ts';

export default function ThreeSelector() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedFunction, setSelectedFunction] = useState<FunctionType>('search');
  const [showProModal, setShowProModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const { decrementSearches, remainingSearches, hasSearchesLeft } = useSearchLimit();
  const { decrementProQuota, hasProQuotaLeft, canAccessPro } = useProQuota();
  const { session } = useSession();
  const accentColor = useAccentColor();
  const { t } = useTranslation();

  // Close attach menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target as Node)) {
        setShowAttachMenu(false);
      }
    };

    if (showAttachMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAttachMenu]);

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
    setShowSignInModal(true);
  };

  const handleSearch = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    const isProFeature = isProFunction(selectedFunction);

    // For Pro features, check Pro quota (Standard users only)
    if (isProFeature) {
      if (!canAccessPro) {
        setShowSignInModal(true);
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
      
      navigate(`${route}?q=${encodeURIComponent(trimmedQuery)}${proParam}`);
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
          {/* Left side: ThreeSelector (Function Selector) */}
          <FunctionSelector
            selectedFunction={selectedFunction}
            onFunctionSelect={handleFunctionSelect}
            onSignUpRequired={handleSignUpRequired}
            className="min-w-0" // Allow shrinking
          />

          {/* Right side: Plus, Mic, and Search Button */}
          <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3">
            {/* Attach button with dropdown */}
            <div className="relative" ref={attachMenuRef}>
              <ActionButton
                icon={Plus}
                label={t('addFilesAndMore')}
                tooltip={t('addFilesAndMore')}
                onClick={() => setShowAttachMenu(!showAttachMenu)}
              />
              
              {/* Dropdown menu */}
              {showAttachMenu && (
                <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-[#2a2a2a] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden min-w-[200px] z-50">
                  {/* Images option */}
                  <button
                    onClick={() => {
                      setShowAttachMenu(false);
                      // Do nothing for now as requested
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-[#333333] transition-colors text-left"
                  >
                    <ImageIcon size={18} className="text-gray-700 dark:text-gray-300" />
                    <span className="text-gray-900 dark:text-white font-medium">
                      {t('images')}
                    </span>
                  </button>
                  
                  {/* Documents option */}
                  <button
                    onClick={() => {
                      setShowAttachMenu(false);
                      setShowSignInModal(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-[#333333] transition-colors text-left border-t border-gray-200 dark:border-gray-700"
                  >
                    <FileText size={18} className="text-gray-700 dark:text-gray-300" />
                    <div className="flex flex-col">
                      <span className="text-gray-900 dark:text-white font-medium">
                        {t('documents')}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {t('loginRequired')}
                      </span>
                    </div>
                  </button>
                </div>
              )}
            </div>
            
            <ActionButton
              icon={MicIcon}
              label={t('askByVoice')}
              tooltip={t('askByVoice')}
              onClick={() => {}}
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
      <ProModal 
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
      />

      <SignInModal 
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        currentLanguage={{ code: 'en', name: 'English', flag: '🇺🇸' }}
      />
    </div>
  );
}
