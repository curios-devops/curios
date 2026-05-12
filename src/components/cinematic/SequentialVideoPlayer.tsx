/**
 * Sequential Video Player
 * Plays multiple short video clips sequentially with smooth transitions
 * TikTok-style player for 8-second clips
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Download } from 'lucide-react';

interface VideoClip {
  id: string;
  url: string; // LEGACY: Single video URL (for backward compatibility)
  draftUrl?: string; // NEW: Draft video URL (fast, lower quality)
  finalUrl?: string; // NEW: Final video URL (high quality)
  currentQuality?: 'draft' | 'final'; // NEW: Current quality level
  isUpgrading?: boolean; // NEW: True if final video is being generated
  isFinal?: boolean; // NEW: True if this is the final version (no more upgrades coming)
  title?: string;
  duration?: number;
}

interface SequentialVideoPlayerProps {
  clips: VideoClip[];
  autoPlay?: boolean;
  loop?: boolean;
  enableDownload?: boolean;
  onDownload?: () => void;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  transitionDuration?: number; // in milliseconds
}

export const SequentialVideoPlayer: React.FC<SequentialVideoPlayerProps> = ({
  clips,
  autoPlay = false,
  loop = false,
  enableDownload = false,
  onDownload,
  aspectRatio = '16:9',
  transitionDuration = 300,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string>(''); // NEW: Track active video URL

  const currentVideoRef = useRef<HTMLVideoElement>(null);
  const nextVideoRef = useRef<HTMLVideoElement>(null);

  const currentClip = clips[currentIndex];
  const nextClip = clips[currentIndex + 1];

  // NEW: Get the current video URL (prioritize final over draft over legacy url)
  const getCurrentVideoUrl = (clip: VideoClip): string => {
    if (clip.finalUrl) return clip.finalUrl;
    if (clip.draftUrl) return clip.draftUrl;
    return clip.url;
  };

  // NEW: Initialize active video URL when clip changes
  useEffect(() => {
    if (currentClip) {
      const newUrl = getCurrentVideoUrl(currentClip);
      setActiveVideoUrl(newUrl);
    }
  }, [currentIndex]);

  // Intentionally avoid swapping mid-play; upgrades apply on next view.

  // Preload next video
  useEffect(() => {
    if (nextVideoRef.current && nextClip) {
      const nextUrl = getCurrentVideoUrl(nextClip);
      nextVideoRef.current.src = nextUrl;
      nextVideoRef.current.load();
    }
  }, [nextClip]);

  // Handle auto-play
  useEffect(() => {
    if (autoPlay && currentVideoRef.current && activeVideoUrl) {
      setIsPlaying(true);
      // Small delay to ensure video is loaded
      const timer = setTimeout(() => {
        currentVideoRef.current?.play().catch(() => {
          setIsPlaying(false);
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, currentIndex, activeVideoUrl]);

  const handleTimeUpdate = () => {
    if (currentVideoRef.current) {
      const video = currentVideoRef.current;
      const currentProgress = (video.currentTime / video.duration) * 100;
      setProgress(currentProgress);
    }
  };

  const handleVideoEnd = useCallback(() => {
    if (currentIndex < clips.length - 1) {
      // Transition to next clip
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setProgress(0);
        setIsTransitioning(false);

        // Auto-play next clip if we were playing or autoPlay is enabled
        if (isPlaying || autoPlay) {
          setTimeout(() => {
            currentVideoRef.current?.play().catch(() => {
              setIsPlaying(false);
            });
          }, 100);
        }
      }, transitionDuration);
    } else if (loop) {
      // Check if all clips are final before looping
      const allClipsFinal = clips.every(clip => clip.isFinal === true);
      const anyUpgrading = clips.some(clip => clip.isUpgrading === true);

      // Only loop if there are upgrades pending or not all clips are final
      if (!allClipsFinal || anyUpgrading) {
        // Loop back to first clip
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentIndex(0);
          setProgress(0);
          setIsTransitioning(false);

          // Auto-play first clip if we were playing or autoPlay is enabled
          if (isPlaying || autoPlay) {
            setTimeout(() => {
              currentVideoRef.current?.play().catch(() => {
                setIsPlaying(false);
              });
            }, 100);
          }
        }, transitionDuration);
      } else {
        // All clips are final and no upgrades pending - stop autoplay
        setIsPlaying(false);
      }
    } else {
      // End of playlist
      setIsPlaying(false);
    }
  }, [currentIndex, clips, loop, transitionDuration, isPlaying, autoPlay]);

  const handlePlayPause = () => {
    if (currentVideoRef.current) {
      if (isPlaying) {
        currentVideoRef.current.pause();
      } else {
        currentVideoRef.current.play().catch(() => {
          setIsPlaying(false);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleNext = () => {
    if (currentIndex < clips.length - 1) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setProgress(0);
        setIsTransitioning(false);
        if (isPlaying && currentVideoRef.current) {
          currentVideoRef.current.play().catch(() => setIsPlaying(false));
        }
      }, transitionDuration);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => prev - 1);
        setProgress(0);
        setIsTransitioning(false);
        if (isPlaying && currentVideoRef.current) {
          currentVideoRef.current.play().catch(() => setIsPlaying(false));
        }
      }, transitionDuration);
    }
  };

  const handleSeek = (sceneIndex: number) => {
    if (sceneIndex >= 0 && sceneIndex < clips.length) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(sceneIndex);
        setProgress(0);
        setIsTransitioning(false);
        if (isPlaying && currentVideoRef.current) {
          currentVideoRef.current.play().catch(() => setIsPlaying(false));
        }
      }, transitionDuration);
    }
  };

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case '9:16':
        return 'aspect-[9/16]';
      case '1:1':
        return 'aspect-square';
      case '16:9':
      default:
        return 'aspect-video';
    }
  };

  if (!currentClip) {
    return (
      <div className="w-full bg-gray-900 rounded-lg flex items-center justify-center text-white p-8">
        <p>No clips available</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Video Container */}
      <div className="relative bg-black rounded-lg overflow-hidden shadow-2xl">
        <div className={`relative ${getAspectRatioClass()}`}>
          {/* Current Video */}
          <video
            ref={currentVideoRef}
            key={`current-${currentClip.id}-${activeVideoUrl}`}
            src={activeVideoUrl}
            className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-${transitionDuration} ${
              isTransitioning ? 'opacity-0' : 'opacity-100'
            }`}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnd}
            playsInline
            preload="auto"
          />

          {/* NEW: Quality indicator badge */}
          {currentClip.currentQuality === 'draft' && currentClip.isUpgrading && (
            <div className="absolute top-3 right-3 z-20">
              <div className="flex items-center gap-2 bg-yellow-500/90 text-black text-xs font-medium px-3 py-1.5 rounded-full shadow-lg">
                <div className="w-1.5 h-1.5 bg-black rounded-full animate-pulse"></div>
                <span>Draft (Upgrading...)</span>
              </div>
            </div>
          )}

          {/* NEW: Final quality indicator */}
          {currentClip.currentQuality === 'final' && (
            <div className="absolute top-3 right-3 z-20 opacity-0 animate-fade-in">
              <div className="flex items-center gap-1.5 bg-green-500/90 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Final Quality</span>
              </div>
            </div>
          )}

          {/* Play/Pause Overlay */}
          {!isPlaying && !isTransitioning && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer transition-opacity hover:bg-black/40 z-10"
              onClick={handlePlayPause}
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/90 rounded-full flex items-center justify-center shadow-2xl transform transition-transform hover:scale-110">
                <Play size={28} className="text-black ml-1" />
              </div>
            </div>
          )}

          {/* Loading Overlay during transition */}
          {isTransitioning && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
            </div>
          )}

          {/* Controls Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 sm:p-4 z-20">
            {/* Progress Bar */}
            <div className="mb-3">
              <div className="w-full bg-white/20 rounded-full h-1 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Previous */}
                <button
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  className="text-white hover:text-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Previous clip"
                >
                  <SkipBack size={20} />
                </button>

                {/* Play/Pause */}
                <button
                  onClick={handlePlayPause}
                  className="text-white hover:text-gray-300 transition-colors"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                </button>

                {/* Next */}
                <button
                  onClick={handleNext}
                  disabled={currentIndex === clips.length - 1 && !loop}
                  className="text-white hover:text-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Next clip"
                >
                  <SkipForward size={20} />
                </button>
              </div>

              <div className="flex items-center gap-3">
                {/* Scene Counter */}
                <div className="text-white text-xs sm:text-sm font-medium">
                  {currentIndex + 1} / {clips.length}
                </div>

                {/* Download */}
                {enableDownload && onDownload && (
                  <button
                    onClick={onDownload}
                    className="text-white hover:text-gray-300 transition-colors"
                    aria-label="Download"
                  >
                    <Download size={20} />
                  </button>
                )}
              </div>
            </div>

            {/* Scene Title */}
            {currentClip.title && (
              <div className="mt-2 text-white text-sm font-medium truncate">
                {currentClip.title}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scene Navigation Dots */}
      {clips.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4 px-4 overflow-x-auto pb-2">
          {clips.map((clip, index) => (
            <button
              key={clip.id}
              onClick={() => handleSeek(index)}
              className={`flex-shrink-0 transition-all duration-200 ${
                index === currentIndex
                  ? 'w-8 h-2 rounded-full'
                  : 'w-2 h-2 rounded-full opacity-50 hover:opacity-75'
              }`}
              style={{
                backgroundColor: index === currentIndex ? 'var(--accent-primary)' : '#9ca3af',
              }}
              aria-label={`Go to scene ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Preload next video (hidden) */}
      {nextClip && (
        <video
          ref={nextVideoRef}
          className="hidden"
          preload="auto"
        />
      )}
    </div>
  );
};
