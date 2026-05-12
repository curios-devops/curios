import { useEffect, useRef, useState } from 'react';
import { AnamEvent, MessageRole } from '@anam-ai/js-sdk/dist/module/types';
import { anamAvatarService } from '../services/anamAvatarService';
import { logger } from '../../../../utils/logger';

interface AnamLiveAvatarDisplayProps {
  selectedAvatarId?: string;
  scriptText: string;
  currentSubtitle: string;
  subtitleEnabled: boolean;
  subtitleColor: 'black' | 'white' | 'accent';
  subtitleSize: 's' | 'm' | 'l';
  subtitlePosition: 'middle' | 'down';
  onSubtitleUpdate: (subtitle: string) => void;
  onStatusChange?: (status: string) => void;
  onError?: (message: string) => void;
  onVideoReady?: (videoElement: HTMLVideoElement) => void;
  onSpeakingChange?: (isSpeaking: boolean) => void;
}

export default function AnamLiveAvatarDisplay({
  selectedAvatarId,
  scriptText,
  currentSubtitle,
  subtitleEnabled,
  subtitleColor,
  subtitleSize,
  subtitlePosition,
  onSubtitleUpdate,
  onStatusChange,
  onError,
  onVideoReady,
  onSpeakingChange,
}: AnamLiveAvatarDisplayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isStreamReady, setIsStreamReady] = useState(false);
  const lastSpokenScriptRef = useRef('');
  const currentSentenceRef = useRef('');
  const onSubtitleUpdateRef = useRef(onSubtitleUpdate);
  const onStatusChangeRef = useRef(onStatusChange);
  const onErrorRef = useRef(onError);
  const disconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pausedSubtitleRef = useRef('');

  useEffect(() => {
    onSubtitleUpdateRef.current = onSubtitleUpdate;
  }, [onSubtitleUpdate]);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (videoRef.current && onVideoReady) {
      onVideoReady(videoRef.current);
    }
  }, [onVideoReady]);

  // Monitor video play/pause state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      // Restore subtitle if it was paused
      if (pausedSubtitleRef.current) {
        onSubtitleUpdateRef.current(pausedSubtitleRef.current);
      }
    };

    const handlePause = () => {
      // Save current subtitle
      pausedSubtitleRef.current = currentSubtitle;
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [currentSubtitle]);

  useEffect(() => {
    if (onSpeakingChange) {
      onSpeakingChange(isSpeaking);
    }
  }, [isSpeaking, onSpeakingChange]);

  const sleep = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const FALLBACK_RATE_LIMIT_DELAY_MS = 30_000;
  const MAX_SPEAKING_TIME_MS = 40_000; // 40 seconds maximum
  const DISCONNECT_BUFFER_MS = 5_000; // 5 seconds buffer after estimated time

  /**
   * Estimate speaking duration based on text length
   * Average speaking rate: ~150 words per minute or ~2.5 words per second
   * @param text - Text to be spoken
   * @returns Estimated duration in milliseconds
   */
  const estimateSpeakingDuration = (text: string): number => {
    const wordCount = text.trim().split(/\s+/).length;
    const wordsPerSecond = 2.5;
    const estimatedSeconds = wordCount / wordsPerSecond;
    return Math.ceil(estimatedSeconds * 1000);
  };

  /**
   * Stop the avatar connection and clean up
   */
  const stopAvatarConnection = (reason: string) => {
    logger.info(`🛑 [AvatarResults] ${reason}`);

    // Mark as disconnected
    setIsSpeaking(false);

    // Clear any existing timeouts
    if (disconnectTimeoutRef.current) {
      clearTimeout(disconnectTimeoutRef.current);
      disconnectTimeoutRef.current = null;
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = null;
    }

    // Stop the avatar service
    anamAvatarService.stop().catch((error) => {
      logger.warn('⚠️ [AvatarResults] Failed to stop avatar', { error });
    });
  };

  const isRateLimitError = (message: string): boolean => {
    const normalized = message.toLowerCase();
    return normalized.includes('429') || normalized.includes('too many requests') || normalized.includes('rate limit');
  };

  const parseRetryDelayMs = (message: string): number => {
    const normalized = message.toLowerCase();
    const retryAfterSecondsMatch = normalized.match(/retry-?after\s*[:=]?\s*(\d+)/);
    if (retryAfterSecondsMatch?.[1]) {
      return Number(retryAfterSecondsMatch[1]) * 1000;
    }

    const retryInSecondsMatch = normalized.match(/retry\s+in\s+(\d+)\s*s/);
    if (retryInSecondsMatch?.[1]) {
      return Number(retryInSecondsMatch[1]) * 1000;
    }

    return FALLBACK_RATE_LIMIT_DELAY_MS;
  };

  const toFriendlyAvatarError = (message: string): string => {
    if (isRateLimitError(message)) {
      return 'The live response service is busy right now. Please wait a bit and try again.';
    }
    return message;
  };

  useEffect(() => {
    let isMounted = true;

    const handleSessionReady = (sessionId: string) => {
      if (!isMounted) return;
      logger.info('✅ [AvatarResults] Anam session ready', { sessionId });
      onStatusChangeRef.current?.('Response ready');
    };

    const handleVideoPlayStarted = () => {
      if (!isMounted) return;
      logger.info('🎥 [AvatarResults] Video playback started');
      onStatusChangeRef.current?.('Showing your response');
    };

    const handleStreamEvent = (event: { role: string; content: string; endOfSpeech: boolean }) => {
      if (!isMounted) return;

      if (event.role === MessageRole.PERSONA) {
        // Accumulate the current sentence
        currentSentenceRef.current = `${currentSentenceRef.current}${event.content}`;

        // Don't update subtitles if video is paused
        if (videoRef.current?.paused) {
          pausedSubtitleRef.current = currentSentenceRef.current.trim();
          return;
        }

        // Check if we hit a sentence boundary (., !, ?)
        const sentenceEndMatch = currentSentenceRef.current.match(/[.!?]\s*$/);

        if (sentenceEndMatch) {
          // Display the complete sentence, then clear for next one
          onSubtitleUpdateRef.current(currentSentenceRef.current.trim());
          pausedSubtitleRef.current = currentSentenceRef.current.trim();
          currentSentenceRef.current = '';
        } else {
          // Still building the sentence, show what we have so far
          onSubtitleUpdateRef.current(currentSentenceRef.current.trim());
          pausedSubtitleRef.current = currentSentenceRef.current.trim();
        }
      }

      if (event.endOfSpeech) {
        if (event.role === MessageRole.PERSONA) {
          setIsSpeaking(false);
          currentSentenceRef.current = '';
          onSubtitleUpdateRef.current('');

          // Note: endOfSpeech means the message stream ended, NOT that the avatar finished speaking
          // The avatar may still be speaking the text it received
          // We'll let the connection stay open for now
          logger.info('📝 [AvatarResults] Message stream ended, avatar may still be speaking');
        }
        if (event.role === MessageRole.USER) {
          onSubtitleUpdateRef.current('');
        }
      }
    };

    const handleMessageHistoryUpdated = (messages: Array<{ role: string; content: string }>) => {
      if (!isMounted || messages.length === 0) return;

      const latestPersonaMessage = [...messages].reverse().find((message) => message.role === MessageRole.PERSONA);
      if (latestPersonaMessage) {
        onSubtitleUpdateRef.current(latestPersonaMessage.content);
      }
    };

    const handleConnectionClosed = (reason: string, details?: string) => {
      if (!isMounted) return;
      logger.warn('🔌 [AvatarResults] Anam connection closed', { reason, details });
      setIsSpeaking(false);
      onStatusChangeRef.current?.(`Connection closed: ${reason}`);
    };

    const handleWarning = (warning: string) => {
      if (!isMounted) return;
      logger.warn('⚠️ [AvatarResults] Anam server warning', { warning });
    };

    const removeListeners = () => {
      anamAvatarService.removeListener(AnamEvent.SESSION_READY, handleSessionReady);
      anamAvatarService.removeListener(AnamEvent.VIDEO_PLAY_STARTED, handleVideoPlayStarted);
      anamAvatarService.removeListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, handleStreamEvent as never);
      anamAvatarService.removeListener(AnamEvent.MESSAGE_HISTORY_UPDATED, handleMessageHistoryUpdated as never);
      anamAvatarService.removeListener(AnamEvent.CONNECTION_CLOSED, handleConnectionClosed);
      anamAvatarService.removeListener(AnamEvent.SERVER_WARNING, handleWarning);
    };

    const startAvatar = async () => {
      try {
        setIsConnecting(true);
        setIsStreamReady(false);
        setConnectionError(null);
        setIsSpeaking(false);
        lastSpokenScriptRef.current = '';
        currentSentenceRef.current = '';
        onSubtitleUpdateRef.current('');
        onStatusChangeRef.current?.('Loading live response...');

        const maxAttempts = 2;
        let lastErrorMessage = '';

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          try {
            await anamAvatarService.initialize({ avatarId: selectedAvatarId });
            break;
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown avatar initialization error';
            lastErrorMessage = message;

            if (attempt < maxAttempts && isRateLimitError(message)) {
              const retryDelayMs = parseRetryDelayMs(message);
              const retryDelaySeconds = Math.ceil(retryDelayMs / 1000);
              onStatusChangeRef.current?.(`Service is busy. Retrying in ${retryDelaySeconds}s...`);
              await sleep(retryDelayMs);
              continue;
            }

            throw error;
          }
        }

        if (!anamAvatarService.isReady() && lastErrorMessage) {
          throw new Error(lastErrorMessage);
        }

        anamAvatarService.addListener(AnamEvent.SESSION_READY, handleSessionReady);
        anamAvatarService.addListener(AnamEvent.VIDEO_PLAY_STARTED, handleVideoPlayStarted);
        anamAvatarService.addListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, handleStreamEvent as never);
        anamAvatarService.addListener(AnamEvent.MESSAGE_HISTORY_UPDATED, handleMessageHistoryUpdated as never);
        anamAvatarService.addListener(AnamEvent.CONNECTION_CLOSED, handleConnectionClosed);
        anamAvatarService.addListener(AnamEvent.SERVER_WARNING, handleWarning);

        await anamAvatarService.startStreaming('anam-results-live-video');

        if (isMounted) {
          setIsStreamReady(true);
          setIsConnecting(false);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown avatar error';
        const friendlyMessage = toFriendlyAvatarError(message);
        logger.error('❌ [AvatarResults] Live avatar failed', { error: message });
        if (isMounted) {
          setConnectionError(friendlyMessage);
          onStatusChangeRef.current?.('Unable to load response');
          onErrorRef.current?.(friendlyMessage);
        }
      } finally {
        if (isMounted) {
          setIsConnecting(false);
        }
      }
    };

    void startAvatar();

    return () => {
      isMounted = false;
      removeListeners();
      currentSentenceRef.current = '';
      onSubtitleUpdateRef.current('');

      // Clear any pending timeouts
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current);
        disconnectTimeoutRef.current = null;
      }
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
        maxTimeoutRef.current = null;
      }

      anamAvatarService.stop().catch((error) => {
        logger.warn('⚠️ [AvatarResults] Failed to stop Anam on cleanup', { error });
      });
    };
  }, []);

  useEffect(() => {
    if (!isStreamReady || !scriptText.trim() || connectionError) {
      return;
    }

    if (lastSpokenScriptRef.current === scriptText) {
      return;
    }

    lastSpokenScriptRef.current = scriptText;
    setIsSpeaking(true);
    onStatusChangeRef.current?.('Presenting your answer...');

    // Calculate estimated speaking duration
    const estimatedDuration = estimateSpeakingDuration(scriptText);
    const disconnectTime = estimatedDuration + DISCONNECT_BUFFER_MS;
    const maxTime = Math.min(disconnectTime, MAX_SPEAKING_TIME_MS);

    logger.info('⏱️ [AvatarResults] Setting auto-disconnect timers', {
      wordCount: scriptText.trim().split(/\s+/).length,
      estimatedDuration: `${(estimatedDuration / 1000).toFixed(1)}s`,
      disconnectTime: `${(disconnectTime / 1000).toFixed(1)}s`,
      maxTime: `${(maxTime / 1000).toFixed(1)}s`,
    });

    // Set estimated disconnect timeout
    disconnectTimeoutRef.current = setTimeout(() => {
      stopAvatarConnection('Avatar finished speaking');
    }, disconnectTime);

    // Set maximum timeout as safety measure
    maxTimeoutRef.current = setTimeout(() => {
      logger.warn('⚠️ [AvatarResults] MAX time reached, disconnecting...');
      stopAvatarConnection('MAX time reached, disconnecting...');
      onStatusChangeRef.current?.('MAX time reached, disconnecting...');
    }, MAX_SPEAKING_TIME_MS);

    void anamAvatarService.speakText(scriptText).catch((error) => {
      const message = error instanceof Error ? error.message : 'Unknown live response error';
      const friendlyMessage = toFriendlyAvatarError(message);
      logger.error('❌ [AvatarResults] Failed while presenting response', { error: message });
      setConnectionError(friendlyMessage);
      setIsSpeaking(false);
      onStatusChangeRef.current?.('Unable to load response');
      onErrorRef.current?.(friendlyMessage);

      // Clear timeouts on error
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current);
        disconnectTimeoutRef.current = null;
      }
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
        maxTimeoutRef.current = null;
      }
    });
  }, [connectionError, isStreamReady, scriptText]);

  const subtitleSizeClass = {
    s: 'text-sm',
    m: 'text-base',
    l: 'text-lg',
  }[subtitleSize];

  const subtitleColorClass = {
    black: 'bg-black/80 text-white',
    white: 'bg-white/80 text-black',
    accent: 'text-white',
  }[subtitleColor];

  const subtitleAccentStyle = subtitleColor === 'accent'
    ? { backgroundColor: 'var(--accent-primary)', opacity: 0.9 }
    : {};

  const subtitlePositionClass = subtitlePosition === 'middle'
    ? 'top-1/2 -translate-y-1/2'
    : 'bottom-8';

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
      <video
        ref={videoRef}
        id="anam-results-live-video"
        className="w-full h-full object-cover"
        playsInline
        autoPlay
      />

      {isConnecting && !connectionError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-white/35 border-t-white"></span>
        </div>
      )}

      {connectionError && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50/90 dark:bg-red-900/40">
          <div className="px-6 text-center">
            <p className="font-medium text-red-700 dark:text-red-200">Could not load live response</p>
            <p className="mt-2 text-sm text-red-600 dark:text-red-300">{connectionError}</p>
          </div>
        </div>
      )}

      {subtitleEnabled && currentSubtitle && (
        <div className={`absolute left-0 right-0 px-12 flex justify-center ${subtitlePositionClass}`}>
          <div
            className={`px-3 py-2 rounded font-medium max-w-[85%] text-center ${subtitleSizeClass} ${subtitleColorClass}`}
            style={subtitleAccentStyle}
          >
            {currentSubtitle}
          </div>
        </div>
      )}

    </div>
  );
}
