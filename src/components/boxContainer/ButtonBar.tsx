import { type LucideIcon, Plus, Image as ImageIcon } from 'lucide-react';
import React from 'react';
import ActionButton from '../boxContainerInput/ActionButton.tsx';
import ModeSelector from '../boxContainerInput/ModeSelector.tsx';
import ModeChip from '../boxContainerInput/ModeChip.tsx';
import type { ModeType } from '../boxContainerInput/ModeSelector.tsx';
import SearchButton from '../boxContainerInput/SearchButton.tsx';
import type { ReverseImageSearchHandle } from './ReverseImageSearch.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';

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

  return (
    <div className="flex items-center justify-between px-4 py-1.5">
      {/* Left side: Plus button and mode chip */}
      <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 min-w-0">
        {/* Plus button with dropdown - includes modes and file uploads */}
        <div className="relative" ref={attachMenuRef}>
          <ActionButton
            icon={Plus}
            label={t('addFilesAndMore')}
            tooltip={t('addFilesAndMore')}
            onClick={() => setShowAttachMenu(!showAttachMenu)}
          />

          {/* Dropdown menu with files and modes */}
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

              {/* Divider before modes */}
              <div
                className="border-t"
                style={{ borderColor: 'var(--ui-border-default)' }}
              />

              {/* Mode Selector within the menu */}
              <ModeSelector
                selectedMode={selectedMode}
                onModeSelect={onModeSelect}
                onClose={() => setShowAttachMenu(false)}
              />
            </div>
          )}
        </div>

        {/* Mode chip - shows selected mode */}
        <ModeChip mode={selectedMode} onClear={onModeClear} />
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
