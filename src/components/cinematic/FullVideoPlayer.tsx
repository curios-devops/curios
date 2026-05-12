/**
 * Full Video Player Component
 * Hero player for the complete stitched cinematic video
 */

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';

interface FullVideoPlayerProps {
  videoUrl: string;
  title: string;
  description: string;
  duration: number;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  autoPlay?: boolean;
  onTimeUpdate?: (currentTime: number) => void;
}

export const FullVideoPlayer: React.FC<FullVideoPlayerProps> = ({
  videoUrl,
  title,
  description,
  duration,
  aspectRatio = '16:9',
  autoPlay = false,
  onTimeUpdate,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (videoRef.current && autoPlay) {
      videoRef.current.play().catch((err) => {
        console.warn('[FullVideoPlayer] Autoplay failed:', err);
        setIsPlaying(false);
      });
    }
  }, [autoPlay]);

  const handlePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleMuteToggle = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    onTimeUpdate?.(time);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleLoadedData = () => {
    setIsLoading(false);
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case '9:16':
        return 'aspect-[9/16] max-w-md';
      case '1:1':
        return 'aspect-square max-w-2xl';
      case '16:9':
      default:
        return 'aspect-video';
    }
  };

  return (
    <div className="full-video-player w-full">
      {/* Video Container */}
      <div
        className={`relative bg-black rounded-xl overflow-hidden shadow-2xl mx-auto ${getAspectRatioClass()}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
      >
        {/* Video Element */}
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-cover"
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleVideoEnd}
          onLoadedData={handleLoadedData}
          playsInline
          muted={isMuted}
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
              <div className="text-white text-sm">Loading video...</div>
            </div>
          </div>
        )}

        {/* Play/Pause Overlay (when paused) */}
        {!isPlaying && !isLoading && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 cursor-pointer transition-opacity hover:bg-opacity-40"
            onClick={handlePlayPause}
          >
            <div className="w-20 h-20 bg-white bg-opacity-95 rounded-full flex items-center justify-center shadow-2xl transform transition-transform hover:scale-110">
              <Play size={36} className="text-black ml-1.5" />
            </div>
          </div>
        )}

        {/* Controls Overlay */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 transition-opacity duration-300 ${
            showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Progress Bar */}
          <div className="mb-4">
            <input
              type="range"
              min="0"
              max={duration}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, #4b5563 ${(currentTime / duration) * 100}%, #4b5563 100%)`,
              }}
            />
            <div className="flex justify-between text-xs text-gray-300 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handlePlayPause}
                className="text-white hover:text-gray-300 transition-colors p-2"
                aria-label={isPlaying ? 'Pause' : 'Play'}
                disabled={isLoading}
              >
                {isPlaying ? <Pause size={28} /> : <Play size={28} />}
              </button>

              <button
                onClick={handleMuteToggle}
                className="text-white hover:text-gray-300 transition-colors p-2"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>

              <div className="text-white text-sm font-medium">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <button
              onClick={handleFullscreen}
              className="text-white hover:text-gray-300 transition-colors p-2"
              aria-label="Fullscreen"
            >
              <Maximize size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Video Info */}
      <div className="mt-4 text-center px-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {title}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {description}
        </p>
      </div>

      {/* Custom Slider Styles */}
      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
        }

        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
        }
      `}</style>
    </div>
  );
};
