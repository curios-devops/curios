import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Focus, Paperclip } from 'lucide-react';

import ActionButton from '../SearchInput/ActionButton.tsx';
import ThreeTabSwitch from '../SearchInput/ThreeTabSwitch.tsx';
import type { TabType } from '../SearchInput/ThreeTabSwitch.tsx';
import SearchButton from '../SearchInput/SearchButton.tsx';
import SearchTextArea from '../SearchInput/SearchTextArea.tsx';
import FocusModal from './FocusModal.tsx';
import ProModal from '../subscription/ProModal.tsx';
import SignUpModal from '../auth/SignUpModal.tsx';
import { useSearchLimit } from '../../hooks/useSearchLimit.ts';
import { useSession } from '../../hooks/useSession.ts';
import { useSubscription } from '../../hooks/useSubscription.ts';
import type { FocusMode } from './types.ts';

export default function RegularSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('search');
  const [selectedMode, setSelectedMode] = useState<FocusMode>('focus');
  const [showFocusModal, setShowFocusModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const { decrementSearches, remainingSearches, maxSearches } = useSearchLimit();
  const { session } = useSession();
  const { subscription } = useSubscription();
  
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
        mode: selectedMode,
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
            onClick={() => actualUserType === 'guest' && navigate('/settings')}
          />

          <SearchButton
            onClick={handleSearch}
            isActive={query.trim().length > 0}
            disabled={!query.trim()}
          />
        </div>
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

      <SignUpModal
        isOpen={showSignUpModal}
        onClose={() => setShowSignUpModal(false)}
        context="default"
        currentLanguage={{ code: 'en', name: 'English', flag: '🇺🇸' }}
      />
    </div>
  );
}