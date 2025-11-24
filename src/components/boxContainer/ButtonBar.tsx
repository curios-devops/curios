import { type LucideIcon, Plus, Image as ImageIcon, FileText } from 'lucide-react';
import React from 'react';
import ActionButton from '../boxContainerInput/ActionButton.tsx';
import FunctionSelector from '../boxContainerInput/FunctionSelector.tsx';
import type { FunctionType } from '../boxContainerInput/FunctionSelector.tsx';
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

interface ButtonBarProps {
  // Left side - Function Selector
  selectedFunction: FunctionType;
  onFunctionSelect: (functionType: FunctionType) => void;
  onSignUpRequired: () => void;
  onUpgrade?: () => void;
  
  // Right side - Action buttons
  showAttachMenu: boolean;
  setShowAttachMenu: (show: boolean) => void;
  reverseImageRef: React.RefObject<ReverseImageSearchHandle>;
  onDocumentClick: () => void;
  onSearchClick: () => void;
  isSearchDisabled: boolean;
  isSearchActive: boolean;
  attachMenuRef: React.RefObject<HTMLDivElement>;
}

export default function ButtonBar({
  selectedFunction,
  onFunctionSelect,
  onSignUpRequired,
  onUpgrade,
  showAttachMenu,
  setShowAttachMenu,
  reverseImageRef,
  onDocumentClick,
  onSearchClick,
  isSearchDisabled,
  isSearchActive,
  attachMenuRef,
}: ButtonBarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between px-4 py-1.5">
      {/* Left side: Plus button THEN Function Selector */}
      <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 min-w-0">
        {/* Attach button with dropdown - MOVED TO LEFT */}
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
                  reverseImageRef.current?.openFilePicker();
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
                  onDocumentClick();
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

        {/* Function Selector */}
        <FunctionSelector
          selectedFunction={selectedFunction}
          onFunctionSelect={onFunctionSelect}
          onSignUpRequired={onSignUpRequired}
          onUpgrade={onUpgrade}
          className="min-w-0" // Allow shrinking
        />
      </div>

      {/* Right side: Mic and Search Button */}
      <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3">
        <ActionButton
          icon={MicIcon}
          label={t('askByVoice')}
          tooltip={t('askByVoice')}
          onClick={() => {}}
        />
        <SearchButton
          onClick={onSearchClick}
          isActive={isSearchActive}
          disabled={isSearchDisabled}
        />
      </div>
    </div>
  );
}
