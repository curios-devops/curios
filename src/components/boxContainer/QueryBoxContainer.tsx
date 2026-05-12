import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ModeType } from '../boxContainerInput/ModeSelector.tsx';
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
import { useVoiceRecording } from '../../hooks/useVoiceRecording.ts';
import { transcribeAudioWithFallback } from '../../services/stt/transcriptionService.ts';

interface QueryBoxContainerProps {
  onModeChange?: (mode: ModeType) => void;
}

export default function QueryBoxContainer({ onModeChange }: QueryBoxContainerProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<ModeType>('search');
  const [showProModal, setShowProModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [signInContext, setSignInContext] = useState<'default' | 'reverse-image' | 'document'>('default');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [imageAttachments, setImageAttachments] = useState<ReverseImageAttachment[]>([]);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const reverseImageRef = useRef<ReverseImageSearchHandle>(null);
  const { decrementSearches, hasSearchesLeft } = useSearchLimit();
  const { decrementProQuota, hasProQuotaLeft, canAccessPro } = useProQuota();
  const { session } = useSession();
  const accentColor = useAccentColor();
  const { isRecording, startRecording, stopRecording } = useVoiceRecording();
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Notify parent when mode changes
  useEffect(() => {
    onModeChange?.(selectedMode);
  }, [selectedMode, onModeChange]);

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

  // Mode mapping for navigation
  const getModeRoute = (mode: ModeType): string => {
    switch (mode) {
      case 'search':
        return '/search';
      case 'fastsearch':
        return '/fast-search';
      case 'stories':
        return '/insights-results';
      case 'cinematic':
        return '/cinematic-results';
      case 'avatar':
        return '/avatar-search';
      default:
        return '/search';
    }
  };

  // Check if mode is a pro feature
  const isProMode = (mode: ModeType): boolean => {
    return ['stories', 'cinematic'].includes(mode);
  };

  const handleModeSelect = (mode: ModeType) => {
    setSelectedMode(mode);
  };

  const handleModeClear = () => {
    setSelectedMode('search');
  };

  const handleSearch = async () => {
    const trimmedQuery = query.trim();
    const hasImages = imageAttachments.length > 0;

    // Validate: need either text or images
    if (!trimmedQuery && !hasImages) return;

    const isProFeature = isProMode(selectedMode);

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
      const route = getModeRoute(selectedMode);
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

  // Mic button: Record and transcribe into search box (does NOT navigate)
  const handleVoiceClick = async () => {
    // If already recording, stop and transcribe
    if (isRecording) {
      try {
        setIsTranscribing(true);
        const audioBlob = await stopRecording();

        if (!audioBlob) {
          logger.error('No audio blob received from recording');
          return;
        }

        logger.info('Transcribing audio...', { size: audioBlob.size });

        // Transcribe using ElevenLabs realtime first, then fallback to Whisper
        const transcribedText = await transcribeAudioWithFallback(audioBlob);

        logger.info('Transcription complete', { text: transcribedText });

        // Set the query in the search box (user can then choose Avatar or Regular search)
        setQuery(transcribedText);

      } catch (error) {
        logger.error('Voice transcription failed', { error });
        console.error('Voice transcription error:', error);
        // TODO: Show error notification to user
      } finally {
        setIsTranscribing(false);
      }
    } else {
      // Start recording
      await startRecording();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Unified container with border encompassing input and button bar */}
      <div
        className={`relative border transition-colors flex flex-col ${imageAttachments.length > 0 ? '' : 'pt-3'}`}
        style={{
          borderColor: 'var(--ui-border-default)',
          backgroundColor: 'var(--ui-bg-elevated)',
          boxShadow: '0 4px 12px var(--ui-shadow-soft)',
          borderRadius: '10px',
        }}
        onFocus={(e) => {
          if (e.currentTarget.contains(e.target)) {
            e.currentTarget.style.borderColor = accentColor.primary;
          }
        }}
        onBlur={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node) === false) {
            e.currentTarget.style.borderColor = 'var(--ui-border-default)';
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
            mode={selectedMode}
          />
        </div>

        {/* Divider between input and button bar */}
        <div
          className="border-t mx-4"
          style={{ borderColor: 'var(--ui-border-subtle)' }}
        />

        {/* Button bar with mode selector and action buttons */}
        <ButtonBar
          selectedMode={selectedMode}
          onModeSelect={handleModeSelect}
          onModeClear={handleModeClear}
          showAttachMenu={showAttachMenu}
          setShowAttachMenu={setShowAttachMenu}
          reverseImageRef={reverseImageRef}
          onSearchClick={handleSearch}
          isSearchDisabled={!query.trim() && imageAttachments.length === 0 || !hasSearchesLeft}
          isSearchActive={query.trim().length > 0 || imageAttachments.length > 0}
          attachMenuRef={attachMenuRef}
          onVoiceClick={handleVoiceClick}
          isRecording={isRecording}
          isTranscribing={isTranscribing}
        />
      </div>

      {/* Remaining searches indicator - REMOVED as requested */}
      {/* {session && (
        <div className="mt-2 text-center">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {remainingSearches} searches remaining today
          </span>
        </div>
      )} */}

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
