import { type LucideIcon, Plus, Image as ImageIcon, Search, ChevronDown } from 'lucide-react';
import AutoModeIcon from '../icons/AutoModeIcon.tsx';
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ActionButton from '../boxContainerInput/ActionButton.tsx';
import ModeSelector from '../boxContainerInput/ModeSelector.tsx';
import type { ModeType } from '../boxContainerInput/ModeSelector.tsx';
import SearchButton from '../boxContainerInput/SearchButton.tsx';
import type { ReverseImageSearchHandle } from './ReverseImageSearch.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { useAccentColor } from '../../hooks/useAccentColor.ts';

// SVG for mic icon, styled to match lucide-react icons
const MicIcon = React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>((props, ref) => (
  <svg ref={ref} width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="22" />
    <line x1="8" y1="22" x2="16" y2="22" />
  </svg>
)) as LucideIcon;
MicIcon.displayName = 'MicIcon';

// SVG for audio bars/waveform icon (ChatGPT style - tallest bar in middle)
const AudioBarsIcon = React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>((props, ref) => (
  <svg ref={ref} width={18} height={18} viewBox="0 0 24 24" fill="currentColor" {...props}>
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
  isRouting?: boolean;
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
  showAttachMenu,
  setShowAttachMenu,
  reverseImageRef,
  onSearchClick,
  isRouting = false,
  isSearchDisabled,
  isSearchActive,
  attachMenuRef,
  onVoiceClick,
  isRecording,
}: ButtonBarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate(); // Voice mode → live Character with the mic open
  const accentColor = useAccentColor();
  const [showModeMenu, setShowModeMenu] = useState(false);
  // Picking a mode rolls the Roadster once before the menu closes (skipped with reduced motion).
  const [spinning, setSpinning] = useState(false);
  const spinningRef = useRef(false);
  const selectMode = (mode: ModeType) => {
    if (spinningRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onModeSelect(mode);
      return;
    }
    spinningRef.current = true;
    setSpinning(true);
    window.setTimeout(() => {
      onModeSelect(mode);
      setShowModeMenu(false);
      spinningRef.current = false;
      setSpinning(false);
    }, 600);
  };
  const modeMenuRef = useRef<HTMLDivElement>(null);
  // The menu opens toward the side with more room and scrolls inside it (it grows with "More").
  const [menuPlacement, setMenuPlacement] = useState<{ up: boolean; maxHeight: number }>({ up: true, maxHeight: 480 });
  const toggleModeMenu = () => {
    const r = modeMenuRef.current?.getBoundingClientRect();
    if (r) {
      // Above, the fixed top bar covers the first ~56px — the menu must stop below it
      // (on phones it slid under it, hiding Auto and pushing the last modes out of view).
      const above = r.top - 12 - 56, below = window.innerHeight - r.bottom - 12;
      setMenuPlacement({ up: above >= below, maxHeight: Math.max(above, below) });
    }
    setShowModeMenu(!showModeMenu);
  };

  // Close mode menu on any tap/click outside. pointerdown, not mousedown: iOS Safari sends no
  // mousedown for taps on non-clickable areas, so the menu lingered until something was tapped.
  useEffect(() => {
    const handleClickOutside = (event: PointerEvent) => {
      if (modeMenuRef.current && !modeMenuRef.current.contains(event.target as Node)) {
        setShowModeMenu(false);
      }
    };

    if (showModeMenu) {
      document.addEventListener('pointerdown', handleClickOutside);
      return () => document.removeEventListener('pointerdown', handleClickOutside);
    }
  }, [showModeMenu]);

  // Get mode label
  const getModeLabel = (mode: ModeType): string => {
    switch (mode) {
      case 'auto':
        return t('auto') || 'Auto';
      case 'search':
        return t('search') || 'Search';
      case 'fastsearch':
        // Fast Search is now the primary "Search" (legacy 'search' is hidden).
        return t('search') || 'Search';
      case 'stories':
        return t('stories') || 'Stories';
      case 'movie':
        return t('video') || 'Video';
      case 'movies':
        return t('movies') || 'Movies';
      case 'games':
        return t('games') || 'Games';
      case 'music':
        return t('music') || 'Music';
      case 'character':
        return t('character') || 'Character';
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

        {/* Mode selector dropdown - pill, matching the round icon buttons */}
        <div className="relative" ref={modeMenuRef}>
          <button
            type="button"
            onClick={toggleModeMenu}
            className="h-8 px-3 rounded-full flex items-center gap-1.5 transition-colors duration-200 text-gray-500 bg-gray-100 dark:bg-transparent hover:bg-gray-200 dark:hover:bg-night-750"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = accentColor.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '';
            }}
          >
            {selectedMode === 'auto' ? <AutoModeIcon size={15} /> : <Search size={15} />}
            <span className="text-[13px] font-medium whitespace-nowrap">
              {getModeLabel(selectedMode)}
            </span>
            <ChevronDown size={14} />
          </button>

          {/* Mode dropdown menu */}
          {/* The menu is the Tesla Roadster: it lifts off on four smoking thrusters, does a barrel
              roll, hovers, and rolls again when a mode is picked (CSS in themes.css → .rocket-menu). */}
          {showModeMenu && (
            <div className={`rocket-menu absolute ${menuPlacement.up ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 z-50`}>
              <div className={`rocket-body relative${spinning ? ' is-spinning' : ''}`}>
                <div
                  className="rounded-lg shadow-lg border overflow-x-hidden overflow-y-auto min-w-[220px]"
                  style={{
                    maxHeight: menuPlacement.maxHeight,
                    backgroundColor: 'var(--ui-bg-elevated)',
                    borderColor: 'var(--ui-border-default)',
                    boxShadow: '0 14px 28px var(--ui-shadow-elevated)',
                  }}
                >
                  {/* Mode Selector - Search (formerly Fast Search), Stories, Video, Character */}
                  <ModeSelector
                    selectedMode={selectedMode}
                    onModeSelect={selectMode}
                    onClose={() => { if (!spinningRef.current) setShowModeMenu(false); }}
                  />
                </div>
                {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
                  <span key={corner} className={`rocket-thruster rocket-thruster-${corner}`} aria-hidden>
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <i key={i} className="rocket-puff" />)}
                  </span>
                ))}
              </div>
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
              onClick={() => navigate('/character?mic=1')}
              accent
            />
          </>
        ) : (
          // Has text: Show Search/Submit button
          <SearchButton
            onClick={onSearchClick}
            isActive={isSearchActive}
            disabled={isSearchDisabled || isRouting}
            isRouting={isRouting}
          />
        )}
      </div>
    </div>
  );
}
