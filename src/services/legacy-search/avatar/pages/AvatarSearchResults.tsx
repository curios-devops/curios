import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import TopBar from '../../../../components/results/TopBar.tsx';
import AnamLiveAvatarDisplay from '../components/AnamLiveAvatarDisplay.tsx';
import NarrativeText from '../components/NarrativeText.tsx';
import AvatarActionButtons from '../components/AvatarActionButtons.tsx';
import VideoControls from '../components/VideoControls.tsx';
import AvatarSelector from '../components/AvatarSelector.tsx';
import { generateNarrativeResponse } from '../services/narrativeGenerator.ts';
import { formatTimeAgo } from '../../../../utils/time.ts';
import { logger } from '../../../../utils/logger.ts';
import { env } from '../../../../config/env.ts';

export default function AvatarSearchResults() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';

  const [searchStartTime] = useState(Date.now());
  const [timeAgo, setTimeAgo] = useState('just now');
  const RATE_LIMIT_COOLDOWN_MS = 30_000;

  // Avatar selection state - fallback to LIZ if CORA not configured
  const FALLBACK_AVATAR_ID = '071b0286-4cce-4808-bee2-e642f1062de3'; // LIZ
  const [selectedAvatarId, setSelectedAvatarId] = useState(
    env.anam.avatars.cora || FALLBACK_AVATAR_ID
  );

  // Response content
  const [narrativeText, setNarrativeText] = useState('');
  const [narrativeTitle, setNarrativeTitle] = useState('');

  // Subtitle state
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const subtitleEnabled = true;
  const subtitleColor = 'white';
  const subtitleSize = 'm';
  const subtitlePosition = 'down';

  // Error state
  const [error, setError] = useState<string | null>(null);
  const [avatarRunKey, setAvatarRunKey] = useState(0);
  const [rateLimitRetryAt, setRateLimitRetryAt] = useState<number | null>(null);

  // Video controls state
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);

  const isRateLimitMessage = (message: string): boolean => {
    const normalized = message.toLowerCase();
    return normalized.includes('429') || normalized.includes('too many requests') || normalized.includes('rate limit') || normalized.includes('service is busy');
  };

  const retrySecondsRemaining = rateLimitRetryAt
    ? Math.max(0, Math.ceil((rateLimitRetryAt - Date.now()) / 1000))
    : 0;
  const canRetryNow = retrySecondsRemaining === 0;

  const handleLiveResponseError = useCallback((message: string) => {
    const isRateLimited = isRateLimitMessage(message);
    if (isRateLimited) {
      setRateLimitRetryAt(Date.now() + RATE_LIMIT_COOLDOWN_MS);
    }
    setError(`Live response failed: ${message}`);
  }, []);

  const handleRetryLiveResponse = () => {
    if (!canRetryNow) {
      return;
    }

    logger.info('Retrying live response playback', { query, avatarRunKey: avatarRunKey + 1 });
    setError(null);
    setCurrentSubtitle('');
    setRateLimitRetryAt(null);
    setAvatarRunKey((current) => current + 1);
  };

  const handleVideoPlayPause = (isPlaying: boolean) => {
    logger.info(`Video ${isPlaying ? 'playing' : 'paused'}`);
    // Additional pause/play logic if needed
  };

  const handleAvatarChange = (newAvatarId: string) => {
    logger.info('Changing avatar', { from: selectedAvatarId, to: newAvatarId });
    setSelectedAvatarId(newAvatarId);
    // Restart avatar with new selection
    setError(null);
    setCurrentSubtitle('');
    setAvatarRunKey((current) => current + 1);
  };

  const hasStartedRef = useRef(false);

  // Update time ago
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(searchStartTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [searchStartTime]);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Generate avatar response
  useEffect(() => {
    if (!query.trim() || hasStartedRef.current) return;

    hasStartedRef.current = true;

    const generateResponse = async () => {
      try {
        logger.info('Starting avatar search', { query });

        // Step 1: Generate narrative response using LLM
        const response = await generateNarrativeResponse(query);
        setNarrativeText(response.narrative);
        setNarrativeTitle(response.title);
        setError(null);
        setRateLimitRetryAt(null);
        logger.info('Narrative generated', { length: response.narrative.length, title: response.title });

        logger.info('Narrative ready, live avatar should connect now');

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        logger.error('Avatar generation failed', { error: errorMessage, query });
        setError('We couldn\'t prepare your response right now. Please try again.');
      }
    };

    generateResponse();
  }, [query]);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white transition-colors duration-200 overflow-x-hidden">
      <TopBar
        query={query}
        timeAgo={timeAgo}
        activeTab="avatar"
        onTabChange={() => {}}
        shareUrl={globalThis.location.href}
        shareTitle={`CuriosAI Avatar Search: ${query || ''}`}
        shareText={narrativeText.slice(0, 100) + '...' || ''}
        images={[]}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-8">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            {narrativeText && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleRetryLiveResponse}
                  disabled={!canRetryNow}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                >
                  {canRetryNow ? 'Try again' : `Try again in ${retrySecondsRemaining}s`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Content State */}
        {!error && (
          <div className="space-y-6">
            {/* Avatar Display with Subtitles */}
            <div className="space-y-4">
              <AnamLiveAvatarDisplay
                key={avatarRunKey}
                selectedAvatarId={selectedAvatarId}
                scriptText={narrativeText}
                currentSubtitle={currentSubtitle}
                subtitleEnabled={subtitleEnabled}
                subtitleColor={subtitleColor}
                subtitleSize={subtitleSize}
                subtitlePosition={subtitlePosition}
                onSubtitleUpdate={setCurrentSubtitle}
                onStatusChange={undefined}
                onError={handleLiveResponseError}
                onVideoReady={setVideoElement}
                onSpeakingChange={setIsAvatarSpeaking}
              />

              {/* Video Controls and Action Buttons */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <VideoControls
                  videoElement={videoElement}
                  onPlayPause={handleVideoPlayPause}
                  isAvatarSpeaking={isAvatarSpeaking}
                />
                <div className="flex items-center gap-3">
                  <AvatarSelector
                    selectedAvatarId={selectedAvatarId}
                    onAvatarChange={handleAvatarChange}
                  />
                  <AvatarActionButtons
                    videoUrl={null}
                    audioUrl={null}
                    onVoiceInput={() => {
                      // TODO: Implement voice input for follow-up questions
                      logger.info('Voice input clicked');
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Narrative Text Display */}
            {narrativeText && <NarrativeText text={narrativeText} title={narrativeTitle} />}
          </div>
        )}
      </main>
    </div>
  );
}
