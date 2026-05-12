/**
 * Cinematic Player Component
 * Video player for cinematic videos with scene-by-scene playback
 */

import type { FC } from 'react';
import { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Share2, Download } from 'lucide-react';
import { CinematicVideo } from '../../services/cinematic/types';
import { SceneProgressBar } from './SceneProgressBar';

interface CinematicPlayerProps {
  video: CinematicVideo;
  onRegenerate?: () => void;
  onShare?: () => void;
  onDownload?: () => void;
}

export const CinematicPlayer: FC<CinematicPlayerProps> = ({
  video,
  onRegenerate,
  onShare,
  onDownload,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const currentScene = video.recipe.scenes[currentSceneIndex];

  // Update current scene based on video time
  useEffect(() => {
    const scene = video.recipe.scenes.find(
      (s) => currentTime >= s.startTime && currentTime < s.endTime
    );

    if (scene) {
      setCurrentSceneIndex(scene.index);
    }
  }, [currentTime, video.recipe.scenes]);

  // Load first scene video
  useEffect(() => {
    if (videoRef.current && currentScene) {
      const sceneVideoUrl = video.sceneVideos.get(currentScene.id);
      if (sceneVideoUrl && videoRef.current.src !== sceneVideoUrl) {
        videoRef.current.src = sceneVideoUrl;
        setIsLoading(true);
      }
    }
  }, [currentScene, video.sceneVideos]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      // Update global time (across all scenes)
      setCurrentTime(currentScene.startTime + videoRef.current.currentTime);
    }
  };

  const handleSceneEnd = () => {
    // Move to next scene
    if (currentSceneIndex < video.recipe.scenes.length - 1) {
      setCurrentSceneIndex(currentSceneIndex + 1);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        if (isPlaying) {
          videoRef.current.play();
        }
      }
    } else {
      // Video finished
      setIsPlaying(false);
    }
  };

  const handleSceneClick = (sceneIndex: number) => {
    setCurrentSceneIndex(sceneIndex);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      if (isPlaying) {
        videoRef.current.play();
      }
    }
  };

  const handleVideoLoad = () => {
    setIsLoading(false);
  };

  // Get text overlay position styles
  const getTextPositionStyles = () => {
    const { textPosition } = currentScene;
    const baseStyles = 'absolute left-0 right-0 px-6 text-center';

    switch (textPosition) {
      case 'top':
        return `${baseStyles} top-[15%]`;
      case 'center':
        return `${baseStyles} top-1/2 -translate-y-1/2`;
      case 'bottom':
      default:
        return `${baseStyles} bottom-[15%]`;
    }
  };

  // Get shadow intensity class
  const getShadowClass = () => {
    const intensity = currentScene.textStyle.shadowIntensity;
    switch (intensity) {
      case 'low':
        return 'drop-shadow-sm';
      case 'medium':
        return 'drop-shadow-md';
      case 'high':
      default:
        return 'drop-shadow-2xl';
    }
  };

  return (
    <div className="cinematic-player w-full max-w-4xl mx-auto">
      {/* Video Container */}
      <div
        className="relative bg-black rounded-lg overflow-hidden shadow-2xl"
        style={{
          aspectRatio: video.format === 'vertical' ? '9/16' : '16/9',
          maxWidth: video.format === 'vertical' ? '400px' : '100%',
          margin: '0 auto',
        }}
      >
        {/* Video Element */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleSceneEnd}
          onLoadedData={handleVideoLoad}
          playsInline
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
          </div>
        )}

        {/* Text Overlay */}
        {currentScene && !isLoading && (
          <div className={getTextPositionStyles()}>
            <div
              className={`font-bold leading-tight ${getShadowClass()}`}
              style={{
                fontSize: `${currentScene.textStyle.fontSize * 0.8}px`, // Scale down for screen
                fontWeight: currentScene.textStyle.fontWeight,
                color: currentScene.textStyle.color,
                textShadow: '0 4px 12px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.6)',
              }}
            >
              {currentScene.text}
            </div>
          </div>
        )}

        {/* Play/Pause Overlay */}
        {!isPlaying && !isLoading && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 cursor-pointer transition-opacity hover:bg-opacity-40"
            onClick={handlePlayPause}
          >
            <div className="w-20 h-20 bg-white bg-opacity-90 rounded-full flex items-center justify-center shadow-2xl transform transition-transform hover:scale-110">
              <Play size={32} className="text-black ml-1" />
            </div>
          </div>
        )}

        {/* Controls Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/50 to-transparent p-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePlayPause}
              className="text-white hover:text-gray-300 transition-colors"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              disabled={isLoading}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>

            <div className="text-white text-sm">
              Scene {currentSceneIndex + 1} / {video.recipe.scenes.length}
            </div>
          </div>
        </div>
      </div>

      {/* Scene Progress Bar */}
      <SceneProgressBar
        scenes={video.recipe.scenes}
        currentSceneIndex={currentSceneIndex}
        currentTime={currentTime}
        totalDuration={video.duration}
        onSceneClick={handleSceneClick}
      />

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 mt-6">
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
          >
            <RotateCcw size={18} />
            <span>Regenerate</span>
          </button>
        )}

        {onShare && (
          <button
            onClick={onShare}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            <Share2 size={18} />
            <span>Share</span>
          </button>
        )}

        {onDownload && (
          <button
            onClick={onDownload}
            className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
          >
            <Download size={18} />
            <span>Download</span>
          </button>
        )}
      </div>

      {/* Video Info */}
      <div className="mt-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {video.title}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {video.description}
        </p>
        <div className="flex items-center justify-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-500">
          <span>{video.duration}s</span>
          <span>•</span>
          <span>{video.recipe.scenes.length} scenes</span>
          <span>•</span>
          <span className="capitalize">{video.recipe.category}</span>
        </div>
      </div>
    </div>
  );
};
