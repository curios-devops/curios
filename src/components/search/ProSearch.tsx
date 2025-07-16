import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Focus, Paperclip, ChevronDown, Check, Sparkles, LightbulbIcon, Microscope, Brain, User } from 'lucide-react';
import ActionButton from '../SearchInput/ActionButton.tsx';
import ToggleSwitch from '../SearchInput/ToggleSwitch.tsx';
import SearchButton from '../SearchInput/SearchButton.tsx';
import SearchTextArea from '../SearchInput/SearchTextArea.tsx';
import FocusModal from './FocusModal.tsx';
import ProModal from '../subscription/ProModal.tsx';
import ProTooltip from '../subscription/ProTooltip.tsx';
import { useSearchLimit } from '../../hooks/useSearchLimit.ts';
import { useSubscription } from '../../hooks/useSubscription.ts';
import type { FocusMode } from './types.ts';

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

interface ProSearchProps {
  isProEnabled: boolean;
  searchType: 'auto' | 'pro' | 'deepResearch';
  onUpdatePreferences: (proEnabled: boolean, type: 'auto' | 'pro' | 'deepResearch') => void;
}

export default function ProSearch({ isProEnabled, searchType, onUpdatePreferences }: ProSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<FocusMode>('focus');
  const [showFocusModal, setShowFocusModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showProTooltip, setShowProTooltip] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  
  const { subscription } = useSubscription();
  const { remainingSearches, hasSearchesLeft, decrementSearches } = useSearchLimit();

  const handleSearch = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;
    
    try {
      // Pro search always requires pro features
      const success = await decrementSearches(isProEnabled);
      if (!success) {
        setShowProModal(true);
        return;
      }

      // Navigate to ProResults page with search parameters
      const searchParams = new URLSearchParams({
        q: trimmedQuery,
        mode: selectedMode,
        type: searchType,
        pro: isProEnabled.toString()
      });
      navigate(`/pro-results?${searchParams.toString()}`);
    } catch (error) {
      console.error('Pro search failed:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleTypeChange = (type: 'auto' | 'pro' | 'deepResearch') => {
    onUpdatePreferences(isProEnabled, type);
    setShowTypeDropdown(false);
  };

  const handleProToggle = () => {
    onUpdatePreferences(!isProEnabled, searchType);
  };

  const handleAttachClick = () => {
    // For pro users, attach button does nothing for now
  };

  return (
    <div className="w-full">
      {/* Unified container with border encompassing both input and buttons */}
      <div className="relative border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus-within:border-blue-500 dark:focus-within:border-blue-400 transition-colors">
        {/* Text Input Area */}
        <div className="relative">
          <SearchTextArea
            value={query}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Button Area - inside the unified container */}
        <div className="flex items-center justify-between px-4 py-1.5">
        {/* Left side: Pro Toggle and Type Selector */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ToggleSwitch
              isEnabled={isProEnabled}
              onToggle={handleProToggle}
              disabled={!hasSearchesLeft}
            />
            {isProEnabled && (
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                  className="flex items-center gap-1.5 bg-[#222222] hover:bg-[#2a2a2a] text-gray-400 px-3 py-1 rounded-lg transition-colors"
                >
                  {(() => {
                    const CurrentIcon = searchTypes.find(type => type.id === searchType)?.icon || Brain;
                    return <CurrentIcon size={16} className="text-[#007BFF]" />;
                  })()}
                  <span className="text-sm text-[#007BFF]">
                    {searchTypes.find(type => type.id === searchType)?.name || 'Auto'}
                  </span>
                  <ChevronDown size={14} className="ml-1" />
                </button>
                
                {showTypeDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-80 bg-[#1a1a1a] rounded-lg border border-gray-800 shadow-xl z-50">
                    <div className="p-1">
                      {searchTypes.map((type) => (
                        <button
                          key={type.id}
                          type="button"
                          disabled={!type.enabled}
                          onClick={() => handleTypeChange(type.id as 'auto' | 'pro' | 'deepResearch')}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left ${
                            searchType === type.id ? 'bg-[#333333]' : 'hover:bg-[#222222]'
                          } ${!type.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-center gap-2">
                            <type.icon
                              size={14}
                              className={searchType === type.id ? 'text-[#007BFF]' : 'text-gray-400'}
                            />
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className={searchType === type.id ? 'text-[#007BFF]' : 'text-gray-400'}>
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
                          {searchType === type.id && (
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
              maxSearches={subscription?.isPro ? 600 : 6}
              onUpgrade={() => {
                setShowProTooltip(false);
                setShowProModal(true);
              }}
              onClose={() => setShowProTooltip(false)}
            />
          )}
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
            onClick={handleAttachClick}
          />
          <SearchButton
            onClick={handleSearch}
            isActive={query.trim().length > 0}
            disabled={!query.trim() || !hasSearchesLeft}
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
    </div>
  );
}