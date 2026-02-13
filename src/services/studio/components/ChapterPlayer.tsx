/**
 * Chapter Player
 * Reproduce chapters secuencialmente como un solo video
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChapterDescriptor } from '../types';
import { logger } from '../../../utils/logger';

interface ChapterPlayerProps {
  chapters: ChapterDescriptor[];
  chapterUrls: Map<string, string>;
  videoId: string;
  onComplete?: () => void;
}

export const ChapterPlayer: React.FC<ChapterPlayerProps> = ({
  chapters,
  chapterUrls,
  videoId,
  onComplete
}) => {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [globalProgress, setGlobalProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentChapter = chapters[currentChapterIndex];
  const currentUrl = chapterUrls.get(currentChapter?.id);

  // Calcular duración total y progreso
  const totalDuration = chapters.reduce((sum, ch) => sum + ch.duration, 0);
  const elapsedTime = chapters
    .slice(0, currentChapterIndex)
    .reduce((sum, ch) => sum + ch.duration, 0);

  useEffect(() => {
    const progress = (elapsedTime / totalDuration) * 100;
    setGlobalProgress(progress);
  }, [currentChapterIndex, elapsedTime, totalDuration]);

  // Handler cuando termina un chapter
  const handleChapterEnd = useCallback(async () => {
    logger.info('[ChapterPlayer] Chapter ended', {
      index: currentChapterIndex,
      chapterId: currentChapter?.id,
      totalChapters: chapters.length
    });

    const nextIndex = currentChapterIndex + 1;

    if (nextIndex < chapters.length) {
      // Small delay before starting next chapter
      await new Promise(resolve => setTimeout(resolve, 100));
      logger.debug('[ChapterPlayer] Moving to next chapter', { nextIndex });
      setCurrentChapterIndex(nextIndex);
    } else {
      logger.info('[ChapterPlayer] All chapters completed', { videoId });
      setIsPlaying(false);
      onComplete?.();
    }
  }, [currentChapterIndex, chapters.length, videoId, onComplete, currentChapter?.id]);

  // Preload del siguiente chapter
  useEffect(() => {
    const nextIndex = currentChapterIndex + 1;
    if (nextIndex < chapters.length) {
      const nextChapter = chapters[nextIndex];
      const nextUrl = chapterUrls.get(nextChapter.id);

      if (nextUrl) {
        // Precargar en background
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = nextUrl;
        document.head.appendChild(link);

        logger.debug('[ChapterPlayer] Precargando siguiente chapter', {
          nextIndex,
          chapterId: nextChapter.id
        });
      }
    }
  }, [currentChapterIndex, chapters, chapterUrls]);

  // Handle autoplay when video source changes
  useEffect(() => {
    if (!videoRef.current || !currentUrl) return;

    const playVideo = async () => {
      if (!isPlaying) return;
      
      try {
        logger.debug('[ChapterPlayer] Attempting to play video', {
          chapterId: currentChapter?.id,
          currentTime: videoRef.current?.currentTime
        });
        
        await videoRef.current.play();
        logger.debug('[ChapterPlayer] Video playback started');
      } catch (err) {
        logger.warn('[ChapterPlayer] Autoplay was prevented', { 
          error: err,
          chapterId: currentChapter?.id 
        });
        setIsPlaying(false);
      }
    };

    playVideo();
    
    // Cleanup function
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }
    };
  }, [currentUrl, isPlaying, currentChapter?.id]);

  // Formatear tiempo
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentChapter || !currentUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-black">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Preparando chapter {currentChapterIndex + 1}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chapter-player relative w-full h-full bg-black">
      {/* Progreso global */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-black bg-opacity-50 p-4">
        <div className="flex items-center justify-between text-white text-sm mb-2">
          <span>{formatTime(elapsedTime)}</span>
          <span className="text-gray-400">
            Chapter {currentChapterIndex + 1} of {chapters.length}
          </span>
          <span>{formatTime(totalDuration)}</span>
        </div>

        {/* Barra de progreso */}
        <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${globalProgress}%` }}
          />
        </div>
      </div>

      {/* Video player */}
      <div className="relative w-full h-full">
        <video
          key={`video-${currentChapter?.id || 'loading'}`}
          ref={videoRef}
          src={currentUrl}
          className="w-full h-full object-contain"
          autoPlay
          playsInline
          muted={true} // Helps with autoplay restrictions
          onEnded={handleChapterEnd}
          onPlay={() => {
            logger.debug('[ChapterPlayer] Video play event');
            setIsPlaying(true);
          }}
          onPause={() => {
            logger.debug('[ChapterPlayer] Video pause event');
            setIsPlaying(false);
          }}
          onError={(e) => {
            logger.error('[ChapterPlayer] Video playback error', { 
              error: e, 
              chapterId: currentChapter?.id,
              currentTime: videoRef.current?.currentTime,
              readyState: videoRef.current?.readyState,
              errorState: videoRef.current?.error
            });
          }}
        />
        
        {/* Play button overlay when paused */}
        {!isPlaying && (
          <button
            onClick={async () => {
              try {
                logger.debug('[ChapterPlayer] Manual play button clicked');
                await videoRef.current?.play();
                setIsPlaying(true);
              } catch (err) {
                logger.error('[ChapterPlayer] Failed to play video', { 
                  error: err,
                  chapterId: currentChapter?.id 
                });
              }
            }}
            className="absolute inset-0 m-auto bg-black bg-opacity-50 text-white rounded-full w-16 h-16 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Play video"
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* Indicador de chapter (opcional) */}
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-lg text-sm">
        {currentChapter.free ? '🆓 Free' : '🔒 Pro'}
      </div>
    </div>
  );
};
