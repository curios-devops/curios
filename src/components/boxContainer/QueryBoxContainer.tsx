import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ModeType } from '../boxContainerInput/ModeSelector.tsx';
import SearchTextArea from '../boxContainerInput/SearchTextArea.tsx';
import ReverseImageSearch, { type ReverseImageSearchHandle, type ReverseImageAttachment } from './ReverseImageSearch.tsx';
import ButtonBar from './ButtonBar.tsx';
import SignInModal from '../auth/SignInModal.tsx';
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
  const [selectedMode, setSelectedMode] = useState<ModeType>('fastsearch');
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [signInContext, setSignInContext] = useState<'default' | 'reverse-image' | 'document'>('default');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [imageAttachments, setImageAttachments] = useState<ReverseImageAttachment[]>([]);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const reverseImageRef = useRef<ReverseImageSearchHandle>(null);
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
      case 'movie':
        return '/movie-results';
      case 'avatar':
        return '/avatar-search';
      default:
        return '/search';
    }
  };

  const handleModeSelect = (mode: ModeType) => {
    setSelectedMode(mode);
  };

  const handleModeClear = () => {
    setSelectedMode('fastsearch');
  };

  const handleSearch = async () => {
    const trimmedQuery = query.trim();
    const hasImages = imageAttachments.length > 0;

    // Validate: need either text or images
    if (!trimmedQuery && !hasImages) return;

    // Regular search is free and open for all users — no quota gating.

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

    const route = getModeRoute(selectedMode);

    // Pass image URLs as URL parameters (comma-separated)
    const imageParam = imageUrls.length > 0 ? `&images=${encodeURIComponent(imageUrls.join(','))}` : '';

    navigate(`${route}?q=${encodeURIComponent(trimmedQuery)}${imageParam}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
      {/* Retroillumination wrapper for 3D glow effect */}
      <div
        className="relative transition-all duration-300"
        style={{
          filter: 'drop-shadow(0 0 0 transparent)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.filter = `drop-shadow(0 0 20px ${accentColor.primary}40) drop-shadow(0 0 40px ${accentColor.primary}20)`;
        }}
        onMouseLeave={(e) => {
          const searchBox = e.currentTarget.querySelector('[data-search-box]');
          const isFocused = searchBox?.contains(document.activeElement);
          if (!isFocused) {
            e.currentTarget.style.filter = 'drop-shadow(0 0 0 transparent)';
          }
        }}
      >
        {/* Unified container with border encompassing input and button bar */}
        <div
          data-search-box
          className={`relative border transition-all duration-300 flex flex-col ${imageAttachments.length > 0 ? '' : 'pt-3'}`}
          style={{
            borderColor: 'var(--ui-border-default)',
            backgroundColor: 'var(--ui-bg-elevated)',
            boxShadow: `0 8px 24px rgba(0, 0, 0, 0.08), inset 0 0 0 1px ${accentColor.primary}15`,
            borderRadius: '16px',
            transform: 'translateY(0)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = `0 16px 40px rgba(0, 0, 0, 0.12), inset 0 0 0 1px ${accentColor.primary}30, 0 0 0 1px ${accentColor.primary}30`;
          }}
          onMouseLeave={(e) => {
            const isFocused = e.currentTarget.contains(document.activeElement);
            if (!isFocused) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = `0 8px 24px rgba(0, 0, 0, 0.08), inset 0 0 0 1px ${accentColor.primary}15`;
              e.currentTarget.style.borderColor = 'var(--ui-border-default)';
            }
          }}
          onFocus={(e) => {
            if (e.currentTarget.contains(e.target)) {
              e.currentTarget.style.borderColor = accentColor.primary;
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = `0 16px 40px rgba(0, 0, 0, 0.12), inset 0 0 0 1px ${accentColor.primary}40, 0 0 0 1px ${accentColor.primary}50`;
              const wrapper = e.currentTarget.parentElement;
              if (wrapper) {
                wrapper.style.filter = `drop-shadow(0 0 20px ${accentColor.primary}40) drop-shadow(0 0 40px ${accentColor.primary}20)`;
              }
            }
          }}
          onBlur={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node) === false) {
              e.currentTarget.style.borderColor = 'var(--ui-border-default)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = `0 8px 24px rgba(0, 0, 0, 0.08), inset 0 0 0 1px ${accentColor.primary}15`;
              const wrapper = e.currentTarget.parentElement;
              if (wrapper) {
                wrapper.style.filter = 'drop-shadow(0 0 0 transparent)';
              }
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
          isSearchDisabled={!query.trim() && imageAttachments.length === 0}
          isSearchActive={query.trim().length > 0 || imageAttachments.length > 0}
          attachMenuRef={attachMenuRef}
          onVoiceClick={handleVoiceClick}
          isRecording={isRecording}
          isTranscribing={isTranscribing}
        />
      </div>
      </div>

      {/* Modals */}
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
