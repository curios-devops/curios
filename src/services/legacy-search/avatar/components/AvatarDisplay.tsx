import { useRef, useEffect } from 'react';
import { logger } from '../../../../utils/logger';

interface AvatarDisplayProps {
  videoUrl: string | null;
  audioUrl: string | null;
  currentSubtitle: string;
  subtitleEnabled: boolean;
  subtitleColor: 'black' | 'white' | 'accent';
  subtitleSize: 's' | 'm' | 'l';
  subtitlePosition: 'middle' | 'down';
  onSubtitleUpdate: (subtitle: string) => void;
}

export default function AvatarDisplay({
  videoUrl,
  audioUrl,
  currentSubtitle,
  subtitleEnabled,
  subtitleColor,
  subtitleSize,
  subtitlePosition,
  onSubtitleUpdate
}: AvatarDisplayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Play video and audio when available
  useEffect(() => {
    const playMedia = async () => {
      // If we have video URL, play video with synced audio
      if (videoRef.current && videoUrl && videoUrl.length > 0) {
        videoRef.current.src = videoUrl;
        logger.info('🎬 Playing Anam avatar video', { videoUrl });

        try {
          await videoRef.current.play();
          logger.info('✅ Avatar video playing');
        } catch (err) {
          logger.error('❌ Failed to play avatar video', { error: err });
        }
      }

      // Play audio (either standalone or synced with video)
      if (audioRef.current && audioUrl) {
        audioRef.current.src = audioUrl;
        logger.info('🔊 Playing audio', { hasVideo: !!videoUrl });

        try {
          await audioRef.current.play();
          logger.info('✅ Audio playing');
        } catch (err) {
          logger.error('❌ Failed to play audio', { error: err });
        }
      }
    };

    playMedia();
  }, [videoUrl, audioUrl]);

  // Sync subtitles with audio playback
  // TODO: Implement word-level subtitle synchronization
  useEffect(() => {
    if (!audioRef.current || !audioUrl) return;

    const handleTimeUpdate = () => {
      // Placeholder for subtitle sync logic
      // In production, you would get word timings from ElevenLabs API
      // and update subtitles based on current playback time
      const currentTime = audioRef.current?.currentTime || 0;
      logger.debug('Audio playback time', { currentTime });
    };

    audioRef.current.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audioRef.current?.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [audioUrl, onSubtitleUpdate]);

  // Subtitle styling
  const subtitleSizeClass = {
    s: 'text-sm',
    m: 'text-base',
    l: 'text-lg'
  }[subtitleSize];

  const subtitleColorClass = {
    black: 'bg-black/80 text-white',
    white: 'bg-white/80 text-black',
    accent: 'text-white'
  }[subtitleColor];

  const subtitleAccentStyle = subtitleColor === 'accent' ? {
    backgroundColor: 'var(--accent-primary)',
    opacity: 0.9
  } : {};

  const subtitlePositionClass = subtitlePosition === 'middle'
    ? 'top-1/2 -translate-y-1/2'
    : 'bottom-8';

  return (
    <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
      {/* Anam Avatar Video */}
      {videoUrl && videoUrl.length > 0 ? (
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          autoPlay
          loop={false} // Don't loop Anam video
        />
      ) : audioUrl ? (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/10 to-blue-500/10 dark:from-purple-500/20 dark:to-blue-500/20">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center animate-pulse">
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-300 font-medium">🎙️ Voice Response</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">AI-powered audio narration</p>
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
            <p>Loading avatar...</p>
          </div>
        </div>
      )}

      {/* Audio Element (hidden) */}
      <audio ref={audioRef} className="hidden" />

      {/* Subtitles Overlay */}
      {subtitleEnabled && currentSubtitle && (
        <div className={`absolute left-0 right-0 px-4 ${subtitlePositionClass}`}>
          <div
            className={`inline-block px-3 py-1.5 rounded ${subtitleSizeClass} ${subtitleColorClass} max-w-full`}
            style={subtitleAccentStyle}
          >
            {currentSubtitle}
          </div>
        </div>
      )}
    </div>
  );
}
