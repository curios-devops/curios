/**
 * Chapter Player
 * Reproduce chapters secuencialmente como un solo video
 */

import React, { useState, useEffect, useRef } from 'react';
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
  const handleChapterEnd = () => {
    logger.info('[ChapterPlayer] Chapter terminado', {
      index: currentChapterIndex,
      chapterId: currentChapter.id
    });

    const nextIndex = currentChapterIndex + 1;

    if (nextIndex < chapters.length) {
      // Ir al siguiente chapter
      setCurrentChapterIndex(nextIndex);
    } else {
      // Video completo
      logger.info('[ChapterPlayer] Video completo', { videoId });
      setIsPlaying(false);
      onComplete?.();
    }
  };

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

  // Autoplay cuando cambia el video source
  useEffect(() => {
    if (videoRef.current && currentUrl && isPlaying) {
      videoRef.current.play().catch(err => {
        logger.warn('[ChapterPlayer] Error en autoplay', { err });
      });
    }
  }, [currentUrl, isPlaying]);

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
      <video
        ref={videoRef}
        src={currentUrl}
        className="w-full h-full object-contain"
        autoPlay
        playsInline
        onEnded={handleChapterEnd}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Indicador de chapter (opcional) */}
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-lg text-sm">
        {currentChapter.free ? '🆓 Free' : '🔒 Pro'}
      </div>
    </div>
  );
};
