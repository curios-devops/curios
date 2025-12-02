import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type LucideIcon } from 'lucide-react';
import React from 'react';

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
import ThreeTabSwitch from '../boxContainerInput/ThreeTabSwitch.tsx';
import type { TabType } from '../boxContainerInput/ThreeTabSwitch.tsx';
import SearchButton from '../boxContainerInput/SearchButton.tsx';
import SearchTextArea from '../boxContainerInput/SearchTextArea.tsx';
import ProModal from '../subscription/ProModal.tsx';
import SignUpModal from '../auth/SignUpModal.tsx';
import { useSearchLimit } from '../../hooks/useSearchLimit.ts';
import { useSession } from '../../hooks/useSession.ts';
import { useSubscription } from '../../hooks/useSubscription.ts';

export default function RegularSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('search');
  const [showProModal, setShowProModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const { decrementSearches, remainingSearches, maxSearches } = useSearchLimit();
  const { session } = useSession();
  const { subscription } = useSubscription(session);
  
  // Determine the actual user type based on session and subscription
  const actualUserType: 'guest' | 'standard' | 'premium' = !session 
    ? 'guest' 
    : subscription?.isActive 
    ? 'premium' 
    : 'standard';

  const handleTabChange = (tab: TabType) => {
    // Removed legacy redirect logic - all users can now select any basic function
    setActiveTab(tab);
  };

  const handleUpgrade = () => {
    setShowProModal(true);
  };

  const handleSignIn = () => {
    setShowSignUpModal(true);
  };

  const handleSearch = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;
    
    try {
      let needsProFeatures = false;
      let targetRoute = '';
      let searchType = '';

      switch (activeTab) {
        case 'search':
          // Standard search for all users
          needsProFeatures = false;
          targetRoute = '/search';
          searchType = 'standard';
          break;
          
        case 'insights':
          // Insights search for all users
          needsProFeatures = false;
          targetRoute = '/insights-results';
          searchType = 'insights';
          break;
          
        case 'labs':
          // Labs functionality
          needsProFeatures = false;
          targetRoute = '/labs-results';
          searchType = 'labs';
          break;
          
        default:
          needsProFeatures = false;
          targetRoute = '/search';
          searchType = 'standard';
      }

      // Check if user has access for pro features
      if (needsProFeatures) {
        const success = await decrementSearches(true);
        if (!success) {
          setShowProModal(true);
          return;
        }
      }

      // Navigate to appropriate page
      const searchParams = new URLSearchParams({
        q: trimmedQuery,
        type: searchType
      });
      
      navigate(`${targetRoute}?${searchParams.toString()}`);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Unified container with border encompassing both input and buttons */}
      <div className="relative border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#2a2a2a] focus-within:border-blue-500 dark:focus-within:border-blue-400 transition-colors">
        {/* Text input area */}
        <div className="relative">
          <SearchTextArea
            key="regular-search-textarea"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<Element>) => {
              if (e.key === 'Enter' && !e.shiftKey && e.target instanceof HTMLTextAreaElement) {
                e.preventDefault();
                handleSearch(); 
              }
            }}
          />
        </div>

        {/* Button bar - inside the unified container */}
        <div className="flex items-center justify-between px-4 py-1.5">
        {/* Left side: Three Tab Switch and Internal Selectors */}
        <div className="flex items-center gap-4">
          <ThreeTabSwitch
            activeTab={activeTab}
            onTabChange={handleTabChange}
            disabled={false}
            userType={actualUserType}
            remainingSearches={remainingSearches}
            maxSearches={maxSearches}
            onUpgrade={handleUpgrade}
            onSignIn={handleSignIn}
          />
          

        </div>
        {/* Right side: Action buttons and Search Button */}
        <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3">
          <ActionButton
            icon={MicIcon}
            label="Dictation"
            tooltip="Dictation"
            onClick={() => {}}
          />

          <SearchButton
            onClick={handleSearch}
            isActive={query.trim().length > 0}
            disabled={!query.trim()}
          />
        </div>
        </div>
      </div>

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