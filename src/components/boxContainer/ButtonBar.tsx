import { type LucideIcon, Plus, Image as ImageIcon, Search, ChevronDown } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import ActionButton from '../boxContainerInput/ActionButton.tsx';
import ModeSelector from '../boxContainerInput/ModeSelector.tsx';
import type { ModeType } from '../boxContainerInput/ModeSelector.tsx';
import SearchButton from '../boxContainerInput/SearchButton.tsx';
import type { ReverseImageSearchHandle } from './ReverseImageSearch.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { useAccentColor } from '../../hooks/useAccentColor.ts';

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

// SVG for audio bars/waveform icon (ChatGPT style - tallest bar in middle)
const AudioBarsIcon = React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>((props, ref) => (
  <svg ref={ref} width={20} height={20} viewBox="0 0 24 24" fill="currentColor" {...props}>
    <rect x="2" y="8" width="3" height="8" rx="1.5" />
    <rect x="7" y="2" width="3" height="20" rx="1.5" />
    <rect x="12" y="4" width="3" height="16" rx="1.5" />
    <rect x="17" y="7" width="3" height="10" rx="1.5" />
  </svg>
)) as LucideIcon;
AudioBarsIcon.displayName = 'AudioBarsIcon';

interface ButtonBarProps {
  // Left side - Mode Selector
  selectedMode: ModeType;
  onModeSelect: (mode: ModeType) => void;
  onModeClear: () => void;

  // Right side - Action buttons
  showAttachMenu: boolean;
  setShowAttachMenu: (show: boolean) => void;
  reverseImageRef: React.RefObject<ReverseImageSearchHandle>;
  onSearchClick: () => void;
  isSearchDisabled: boolean;
  isSearchActive: boolean;
  attachMenuRef: React.RefObject<HTMLDivElement>;
  onVoiceClick: () => void;
  isRecording: boolean;
  isTranscribing: boolean;
}

export default function ButtonBar({
  selectedMode,
  onModeSelect,
  onModeClear,
  showAttachMenu,
  setShowAttachMenu,
  reverseImageRef,
  onSearchClick,
  isSearchDisabled,
  isSearchActive,
  attachMenuRef,
  onVoiceClick,
  isRecording,
  isTranscribing,
}: ButtonBarProps) {
  const { t } = useTranslation();
  const accentColor = useAccentColor();
  const [showModeMenu, setShowModeMenu] = useState(false);
  const modeMenuRef = useRef<HTMLDivElement>(null);

  // Close mode menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modeMenuRef.current && !modeMenuRef.current.contains(event.target as Node)) {
        setShowModeMenu(false);
      }
    };

    if (showModeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showModeMenu]);

  // Get mode label
  const getModeLabel = (mode: ModeType): string => {
    switch (mode) {
      case 'search':
        return t('search') || 'Search';
      case 'fastsearch':
        return t('fastSearch') || 'Fast Search';
      case 'stories':
        return t('stories') || 'Stories';
      case 'cinematic':
        return t('cinematic') || 'Cinematic';
      case 'movie':
        return t('movie') || 'Movie';
      case 'avatar':
        return t('avatar') || 'Avatar';
      default:
        return t('search') || 'Search';
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-1.5">
      {/* Left side: Plus button for file uploads only */}
      <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 min-w-0">
        {/* Plus button with dropdown - only file uploads */}
        <div className="relative" ref={attachMenuRef}>
          <ActionButton
            icon={Plus}
            label={t('uploadPhotosAndFiles')}
            tooltip={t('uploadPhotosAndFiles')}
            onClick={() => setShowAttachMenu(!showAttachMenu)}
          />

          {/* Dropdown menu with file upload option only */}
          {showAttachMenu && (
            <div
              className="absolute bottom-full mb-2 left-0 rounded-lg shadow-lg border overflow-hidden min-w-[240px] z-50"
              style={{
                backgroundColor: 'var(--ui-bg-elevated)',
                borderColor: 'var(--ui-border-default)',
                boxShadow: '0 14px 28px var(--ui-shadow-elevated)',
              }}
            >
              {/* Upload photos and files - combined option */}
              <button
                onClick={() => {
                  setShowAttachMenu(false);
                  reverseImageRef.current?.openFilePicker();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
                style={{ color: 'var(--ui-text-primary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--ui-bg-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <ImageIcon size={18} style={{ color: 'var(--ui-text-secondary)' }} />
                <span className="font-medium">
                  {t('uploadPhotosAndFiles')}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Mode selector dropdown - rounded rectangle style like mic button */}
        <div className="relative" ref={modeMenuRef}>
          <button
            type="button"
            onClick={() => setShowModeMenu(!showModeMenu)}
            className="h-10 px-3 rounded-lg flex items-center gap-2 transition-colors duration-200 text-gray-500 bg-gray-100 dark:bg-transparent hover:bg-gray-200 dark:hover:bg-[#2a2a2a]"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = accentColor.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '';
            }}
          >
            <Search size={16} />
            <span className="text-sm font-medium whitespace-nowrap">
              {getModeLabel(selectedMode)}
            </span>
            <ChevronDown size={14} />
          </button>

          {/* Mode dropdown menu */}
          {showModeMenu && (
            <div
              className="absolute bottom-full mb-2 left-0 rounded-lg shadow-lg border overflow-hidden min-w-[220px] z-50"
              style={{
                backgroundColor: 'var(--ui-bg-elevated)',
                borderColor: 'var(--ui-border-default)',
                boxShadow: '0 14px 28px var(--ui-shadow-elevated)',
              }}
            >
              {/* Search mode (default) - first option */}
              <button
                onClick={() => {
                  onModeSelect('search');
                  setShowModeMenu(false);
                }}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 transition-colors text-left relative"
                style={{
                  color: selectedMode === 'search' ? accentColor.primary : 'var(--ui-text-primary)',
                  fontWeight: selectedMode === 'search' ? 500 : 400,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--ui-bg-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div className="flex items-center gap-3">
                  <Search
                    size={18}
                    style={{
                      color: selectedMode === 'search' ? accentColor.primary : 'var(--ui-text-secondary)'
                    }}
                  />
                  <span className="font-medium">
                    {t('search') || 'Search'}
                  </span>
                </div>
                {selectedMode === 'search' && (
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: '#ef4444' }}
                  />
                )}
              </button>

              {/* Mode Selector - Fast Search, Stories, Avatar, Cinematic */}
              <ModeSelector
                selectedMode={selectedMode}
                onModeSelect={onModeSelect}
                onClose={() => setShowModeMenu(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Right side: Action buttons based on content state */}
      <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3">
        {!isSearchActive ? (
          // Empty search box: Show Mic (Dictate) and Bars (Avatar) buttons
          <>
            <ActionButton
              icon={MicIcon}
              label={t('dictate') || 'Dictate'}
              tooltip={t('dictate') || 'Dictate'}
              onClick={onVoiceClick}
              className={isRecording ? 'animate-pulse' : ''}
            />
            <ActionButton
              icon={AudioBarsIcon}
              label={t('voiceMode') || 'Voice mode'}
              tooltip={t('voiceMode') || 'Voice mode'}
              onClick={() => {
                // TODO: Open Avatar/Voice mode
                console.log('Voice mode clicked');
              }}
            />
          </>
        ) : (
          // Has text: Show Search/Submit button
          <SearchButton
            onClick={onSearchClick}
            isActive={isSearchActive}
            disabled={isSearchDisabled}
          />
        )}
      </div>
    </div>
  );
}
