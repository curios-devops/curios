/**
 * Scene Preview Card Component
 * Displays individual scenes as preview cards (non-autoplay)
 * Similar to "Continue Exploring" section styling
 */

import type { FC, MouseEvent } from 'react';
import { useState, useRef } from 'react';
import { Play, Pause } from 'lucide-react';

interface ScenePreviewCardProps {
  sceneId: string;
  title: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration: number;
  narration: string;
  status: 'queued' | 'generating' | 'ready' | 'failed';
  error?: string;
  onClick?: () => void;
}

export const ScenePreviewCard: FC<ScenePreviewCardProps> = ({
  title,
  videoUrl,
  thumbnailUrl,
  duration,
  narration,
  status,
  error,
  onClick,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handlePlayPause = (e: MouseEvent) => {
    e.stopPropagation();

    if (!videoRef.current || status !== 'ready') return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  // Auto-play on hover
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (videoRef.current && status === 'ready' && !isPlaying) {
      videoRef.current.play().catch(() => {
        // Ignore autoplay errors
      });
      setIsPlaying(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current && isPlaying) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const renderStatus = () => {
    switch (status) {
      case 'queued':
        return (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60">
            <div className="text-white text-sm">Queued...</div>
          </div>
        );
      case 'generating':
        return (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
              <div className="text-white text-sm">Generating...</div>
            </div>
          </div>
        );
      case 'failed':
        return (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900 bg-opacity-60">
            <div className="text-white text-sm text-center px-4">
              {error || 'Generation failed'}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="scene-preview-card group relative bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer"
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Video/Thumbnail Container with hover scale */}
      <div className="relative aspect-video bg-gray-900 overflow-hidden">
        {status === 'ready' && videoUrl ? (
          <>
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-cover transform transition-transform duration-300 group-hover:scale-110"
              onEnded={handleVideoEnd}
              playsInline
              muted
              loop={false}
              poster={thumbnailUrl}
            />

            {/* Play/Pause Overlay */}
            {(isHovered || !isPlaying) && (
              <div
                className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 transition-opacity"
                onClick={handlePlayPause}
              >
                <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center shadow-lg transform transition-transform hover:scale-110">
                  {isPlaying ? (
                    <Pause size={20} className="text-black" />
                  ) : (
                    <Play size={20} className="text-black ml-0.5" />
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-gray-800" />
        )}

        {/* Status Overlays */}
        {renderStatus()}

        {/* Duration Badge */}
        {status === 'ready' && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
            {duration}s
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2 line-clamp-2">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-xs line-clamp-2">
          {narration}
        </p>
      </div>

      {/* Hover Effect Border */}
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-500 rounded-lg pointer-events-none transition-colors" />
    </div>
  );
};
