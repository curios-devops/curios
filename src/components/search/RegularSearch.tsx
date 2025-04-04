import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Focus, Paperclip, ChevronDown, Check, Sparkles, LightbulbIcon, Microscope, Brain, User } from 'lucide-react';

const searchTypes = [
  {
    id: 'auto',
    name: 'Auto',
    description: 'Adapts to each query',
    icon: Brain,
    color: '#007BFF',
    enabled: true
  },
  {
    id: 'pro',
    name: 'Pro',
    description: '3x more sources and detailed answers',
    icon: Sparkles,
    color: '#007BFF',
    enabled: true,
    badge: 'PRO'
  },
  {
    id: 'reasoning',
    name: 'Reasoning',
    description: 'Advanced problem solving',
    icon: LightbulbIcon,
    color: '#007BFF',
    enabled: false,
    badge: 'SOON'
  },
  {
    id: 'deep-research',
    name: 'Deep Research',
    description: 'In-depth reports on complex topics',
    icon: Microscope,
    color: '#007BFF',
    enabled: true,
    badge: 'PRO'
  },
  {
    id: 'operator',
    name: 'Operator',
    description: 'Interacts with web browsers like a human',
    icon: User,
    color: '#007BFF',
    enabled: false,
    badge: 'SOON'
  }
];
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
import { useSearchAgent } from '../../hooks/useSearchAgent';
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
  const { search } = useSearchAgent();

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
    
    try {
      const success = await decrementSearches(isPro);
      if (!success) {
        setShowProModal(true);
        return;
      }

      // Use the search agent with the appropriate mode
      const searchParams = new URLSearchParams({
        q: trimmedQuery,
        mode: selectedMode,
        type: isPro ? 'pro' : 'standard'
      });

      navigate(`/search?${searchParams.toString()}`);
    } catch (error) {
      console.error('Search failed:', error);
    }
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

  const [showAutoDropdown, setShowAutoDropdown] = useState(false);
  const [selectedSearchType, setSelectedSearchType] = useState('Auto');

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
        {/* Left side: Pro toggle */}
        <div 
          className="flex items-center gap-4">
          <div className="flex items-center gap-2">
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
            {isPro && (
              <div className="relative">
                <button 
                  onClick={() => setShowAutoDropdown(!showAutoDropdown)}
                  className="flex items-center gap-1.5 bg-[#222222] hover:bg-[#2a2a2a] text-gray-400 px-3 py-1 rounded-lg transition-colors"
                >
                {(() => {
                  const CurrentIcon = searchTypes.find(type => type.name === selectedSearchType)?.icon || Zap;
                  return <CurrentIcon size={16} className={isPro ? 'text-[#007BFF]' : 'text-gray-400'} />;
                })()}
                <span className={`text-sm ${isPro ? 'text-[#007BFF]' : 'text-gray-400'}`}>{selectedSearchType}</span>
                <ChevronDown size={14} className="ml-1" />
                </button>
                
                {showAutoDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-80 bg-[#1a1a1a] rounded-lg border border-gray-800 shadow-xl z-50">
                    <div className="p-1">
                      {searchTypes.map((type) => (
                        <button
                          key={type.id}
                          disabled={!type.enabled}
                          onClick={() => {
                            if (!type.enabled) return;
                            setSelectedSearchType(type.name);
                            setShowAutoDropdown(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left ${
                            selectedSearchType === type.name ? 'bg-[#333333]' : 'hover:bg-[#222222]'
                          } ${!type.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-center gap-2">
                            <type.icon size={16}
                              className={selectedSearchType === type.name ? 'text-[#007BFF]' : 'text-gray-400'}
                            />
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className={selectedSearchType === type.name ? 'text-[#007BFF]' : 'text-gray-400'}>
                                  {type.name}
                                </span>
                                {type.badge && (
                                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                    type.badge === 'PRO' 
                                      ? 'bg-[#007BFF] text-white' 
                                      : 'bg-yellow-500 text-black'
                                  }`}>
                                    {type.badge}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-500">{type.description}</span>
                            </div>
                          </div>
                          {selectedSearchType === type.name && (
                            <Check size={14} className="text-[#007BFF]" />
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="px-3 py-2 border-t border-gray-800">
                      <p className="text-xs text-gray-500 text-center">3 enhanced queries remaining today</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
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

        {/* Right side: Action buttons and Search */}
        <div className="flex items-center gap-4">
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