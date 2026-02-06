/**
 * Progressive Player Component
 * Allows watching video chunks as they render (Phase 6C)
 */

import React, { useState, useEffect, useRef } from 'react';
import { ChunkRenderResult, RenderProgress } from '../../services/studio/rendering/chunkedRenderer';
import { Play, Pause, Volume2, VolumeX, Loader2, Film } from 'lucide-react';

interface ProgressivePlayerProps {
  chunks: ChunkRenderResult[];
  renderProgress: RenderProgress;
  format: 'vertical' | 'horizontal';
  onComplete?: () => void;
}

export const ProgressivePlayer: React.FC<ProgressivePlayerProps> = ({
  chunks,
  renderProgress,
  format,
  onComplete
}) => {
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Get current chunk
  const currentChunk = chunks[currentChunkIndex];
  const isChunkReady = currentChunk?.status === 'complete';
  const nextChunk = chunks[currentChunkIndex + 1];
  const isNextChunkReady = nextChunk?.status === 'complete';

  // Calculate overall progress
  const completedChunks = chunks.filter(c => c.status === 'complete').length;
  const totalChunks = renderProgress.total;
  const progressPercent = (completedChunks / totalChunks) * 100;

  // Auto-play when first chunk is ready
  useEffect(() => {
    if (isChunkReady && !isPlaying && currentChunkIndex === 0) {
      setIsPlaying(true);
    }
  }, [isChunkReady, isPlaying, currentChunkIndex]);

  // Handle chunk end - move to next chunk
  const handleChunkEnd = () => {
    if (currentChunkIndex < chunks.length - 1) {
      // Check if next chunk is ready
      if (isNextChunkReady) {
        setCurrentChunkIndex(prev => prev + 1);
      } else {
        // Buffer until next chunk is ready
        setBuffering(true);
        setIsPlaying(false);
      }
    } else {
      // All chunks played
      setIsPlaying(false);
      onComplete?.();
    }
  };

  // Resume playback when next chunk becomes ready
  useEffect(() => {
    if (buffering && isNextChunkReady) {
      setBuffering(false);
      setCurrentChunkIndex(prev => prev + 1);
      setIsPlaying(true);
    }
  }, [buffering, isNextChunkReady]);

  // Control video playback
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(err => {
          console.error('Playback failed:', err);
          setIsPlaying(false);
        });
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, currentChunkIndex]);

  const togglePlay = () => {
    if (isChunkReady) {
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const dimensions = format === 'vertical'
    ? { width: 360, height: 640 } // 9:16 scaled down
    : { width: 640, height: 360 }; // 16:9

  return (
    <div className="progressive-player-container">
      {/* Video Player */}
      <div 
        className="relative bg-black rounded-lg overflow-hidden shadow-xl"
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        {/* Video Element or Preview Placeholder */}
        {isChunkReady && currentChunk.chunkUrl ? (
          <video
            ref={videoRef}
            src={currentChunk.chunkUrl}
            className="w-full h-full object-contain"
            muted={isMuted}
            onEnded={handleChunkEnd}
            onWaiting={() => setBuffering(true)}
            onCanPlay={() => setBuffering(false)}
            playsInline
          />
        ) : isChunkReady && !currentChunk.chunkUrl ? (
          // Preview mode: No video file, show metadata
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center text-white p-6">
              <Film className="w-16 h-16 mx-auto mb-4 text-blue-400" />
              <h3 className="text-lg font-semibold mb-2">Preview Mode</h3>
              <p className="text-sm text-gray-400 mb-4">
                Chunk {currentChunkIndex + 1} of {chunks.length} rendered
              </p>
              <div className="text-xs text-gray-500 bg-gray-800 rounded px-3 py-2 inline-block">
                <p>ChunkID: {currentChunk.chunkId}</p>
                <p>Duration: {currentChunk.renderTime}ms</p>
                <p className="mt-1 text-yellow-400">
                  💡 Set PREVIEW_MODE=false for actual video playback
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Still rendering
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-2" />
              <p className="text-sm">Rendering chunk {currentChunkIndex + 1}...</p>
            </div>
          </div>
        )}

        {/* Buffering Overlay */}
        {buffering && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center text-white">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading next chunk...</p>
            </div>
          </div>
        )}

        {/* Controls Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          {/* Progress Bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-white/80 mb-1">
              <span>Chunk {currentChunkIndex + 1} of {totalChunks}</span>
              <span>{completedChunks} ready</span>
            </div>
            <div className="h-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              disabled={!isChunkReady}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white" />
              )}
            </button>

            <button
              onClick={toggleMute}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
            </button>

            <div className="flex-1" />

            {/* Chunk Status Indicator */}
            <div className="text-xs text-white/80">
              {renderProgress.inProgress > 0 && (
                <span>Rendering {renderProgress.inProgress}...</span>
              )}
              {renderProgress.inProgress === 0 && renderProgress.completed < totalChunks && (
                <span>Waiting to start...</span>
              )}
              {renderProgress.completed === totalChunks && (
                <span className="text-green-400">✓ All chunks ready</span>
              )}
            </div>
          </div>
        </div>

        {/* Chunk Indicator Pills */}
        <div className="absolute top-3 left-3 right-3 flex gap-1">
          {chunks.map((chunk, index) => (
            <div
              key={chunk.chunkId}
              className={`flex-1 h-1 rounded-full transition-all ${
                index === currentChunkIndex
                  ? 'bg-blue-500 h-1.5'
                  : chunk.status === 'complete'
                  ? 'bg-white/60'
                  : chunk.status === 'rendering'
                  ? 'bg-yellow-500/60 animate-pulse'
                  : chunk.status === 'failed'
                  ? 'bg-red-500/60'
                  : 'bg-white/20'
              }`}
              title={`Chunk ${index + 1}: ${chunk.status}`}
            />
          ))}
        </div>
      </div>

      {/* Rendering Stats */}
      <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {completedChunks}
          </div>
          <div className="text-gray-600 dark:text-gray-400">Completed</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {renderProgress.inProgress}
          </div>
          <div className="text-gray-600 dark:text-gray-400">Rendering</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
            {renderProgress.pending}
          </div>
          <div className="text-gray-600 dark:text-gray-400">Pending</div>
        </div>
      </div>

      {/* Debug Info (development only) */}
      {import.meta.env.DEV && (
        <div className="mt-3 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
          <div>Current: {currentChunk?.chunkId}</div>
          <div>Status: {currentChunk?.status}</div>
          <div>Buffering: {buffering ? 'Yes' : 'No'}</div>
          <div>Progress: {progressPercent.toFixed(1)}%</div>
        </div>
      )}
    </div>
  );
};
