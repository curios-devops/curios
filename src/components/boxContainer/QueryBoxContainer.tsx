import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import type { FunctionType } from '../boxContainerInput/FunctionSelector.tsx';
import SearchTextArea from '../boxContainerInput/SearchTextArea.tsx';
import ReverseImageSearch, { type ReverseImageSearchHandle, type ReverseImageAttachment } from './ReverseImageSearch.tsx';
import ButtonBar from './ButtonBar.tsx';
import ProModal from '../subscription/ProModal.tsx';
import SignInModal from '../auth/SignInModal.tsx';
import { useSearchLimit } from '../../hooks/useSearchLimit.ts';
import { useProQuota } from '../../hooks/useProQuota.ts';
import { useSession } from '../../hooks/useSession.ts';
import { useAccentColor } from '../../hooks/useAccentColor.ts';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { uploadMultipleImages } from '../../utils/imageUpload.ts';
import { logger } from '../../utils/logger.ts';

export default function QueryBoxContainer() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [selectedFunction, setSelectedFunction] = useState<FunctionType>('search');
  const [showProModal, setShowProModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [signInContext, setSignInContext] = useState<'default' | 'reverse-image' | 'document'>('default');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [imageAttachments, setImageAttachments] = useState<ReverseImageAttachment[]>([]);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const reverseImageRef = useRef<ReverseImageSearchHandle>(null);
  const { decrementSearches, remainingSearches, hasSearchesLeft } = useSearchLimit();
  const { decrementProQuota, hasProQuotaLeft, canAccessPro } = useProQuota();
  const { session } = useSession();
  const accentColor = useAccentColor();

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
    setSignInContext('default');
    setShowSignInModal(true);
  };

  const handleDocumentClick = () => {
    setSignInContext('document');
    setShowSignInModal(true);
  };

  const handleSearch = async () => {
    const trimmedQuery = query.trim();
    const hasImages = imageAttachments.length > 0;
    
    // Validate: need either text or images
    if (!trimmedQuery && !hasImages) return;

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

    // Upload images to get public URLs (if any)
    let imageUrls: string[] = [];
    if (hasImages) {
      try {
        logger.info('Uploading images for reverse search', { count: imageAttachments.length });
        const files = imageAttachments.map(att => att.file);
        imageUrls = await uploadMultipleImages(files);
        logger.info('Images uploaded successfully', { urls: imageUrls });
      } catch (error) {
        logger.error('Image upload failed', { error });
        // TODO: Show error notification to user
        console.error('Failed to upload images:', error);
        return; // Don't proceed if image upload fails
      }
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
      
      // Pass image URLs as URL parameters (comma-separated)
      const imageParam = imageUrls.length > 0 ? `&images=${encodeURIComponent(imageUrls.join(','))}` : '';
      
      navigate(`${route}?q=${encodeURIComponent(trimmedQuery)}${proParam}${imageParam}`);
    }
  };  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Unified container with border encompassing input and button bar */}
      <div 
        className={`relative border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#2a2a2a] transition-colors flex flex-col ${imageAttachments.length > 0 ? '' : 'pt-3'}`}
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
        {/* Reverse image attachments */}
        <ReverseImageSearch
          ref={reverseImageRef}
          onChange={setImageAttachments}
          session={session}
          onSignInRequired={() => {
            setSignInContext('reverse-image');
            setShowSignInModal(true);
          }}
        />

        {/* Text input area */}
        <div className="relative px-4 pb-3">
          <SearchTextArea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="px-0"
          />
        </div>

        {/* Button bar with function selector and action buttons */}
        <ButtonBar
          selectedFunction={selectedFunction}
          onFunctionSelect={handleFunctionSelect}
          onSignUpRequired={handleSignUpRequired}
          showAttachMenu={showAttachMenu}
          setShowAttachMenu={setShowAttachMenu}
          reverseImageRef={reverseImageRef}
          onDocumentClick={handleDocumentClick}
          onSearchClick={handleSearch}
          isSearchDisabled={!query.trim() && imageAttachments.length === 0 || !hasSearchesLeft}
          isSearchActive={query.trim().length > 0 || imageAttachments.length > 0}
          attachMenuRef={attachMenuRef}
        />
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
        onClose={() => {
          setShowSignInModal(false);
          setSignInContext('default');
        }}
        currentLanguage={{ code: 'en', name: 'English', flag: '🇺🇸' }}
        title={
          signInContext === 'reverse-image' ? t('signInUploadPhotos') :
          signInContext === 'document' ? t('signInUploadFiles') :
          undefined
        }
        subtitle={
          signInContext === 'reverse-image' ? t('analyzePhotosFree') :
          signInContext === 'document' ? t('analyzeFilesFree') :
          undefined
        }
      />
    </div>
  );
}
