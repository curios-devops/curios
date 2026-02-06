import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { useAccentColor } from '../../../hooks/useAccentColor';

interface VideoPlayerProps {
  videoUrl?: string; // URL to rendered video
  isLoading?: boolean;
  renderProgress?: number; // 0-100 rendering progress
  onPlayPause?: () => void;
  duration?: number;
  onTimeUpdate?: (time: number) => void; // Report current time back to parent
  seekToTime?: number; // Seek to specific time from parent
}

export default function VideoPlayer({ 
  videoUrl,
  isLoading = false,
  renderProgress,
  duration = 30,
  onTimeUpdate,
  seekToTime
}: VideoPlayerProps) {
  const accent = useAccentColor();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [ccEnabled, setCcEnabled] = useState(false);
  const [hdEnabled, setHdEnabled] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-hide controls after 3 seconds of inactivity
  useEffect(() => {
    if (isPlaying && showControls) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, showControls]);

  // Handle seek from parent component
  useEffect(() => {
    if (seekToTime !== undefined && seekToTime !== currentTime) {
      setCurrentTime(seekToTime);
    }
  }, [seekToTime]);

  // Report time updates to parent
  useEffect(() => {
    if (onTimeUpdate) {
      onTimeUpdate(currentTime);
    }
  }, [currentTime, onTimeUpdate]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  };

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

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const newTime = percent * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleTimelineDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging && videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const newTime = percent * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (videoRef.current) {
      videoRef.current.volume = newVolume / 100;
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      videoRef.current.muted = newMuted;
    }
  };

  // Handle video time updates
  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (onTimeUpdate) {
        onTimeUpdate(videoRef.current.currentTime);
      }
    }
  };

  // Handle video ended
  const handleVideoEnded = () => {
    setIsPlaying(false);
  };

  const toggleTheaterMode = () => {
    setIsTheaterMode(!isTheaterMode);
  };

  const toggleCC = () => {
    setCcEnabled(!ccEnabled);
  };

  const toggleHD = () => {
    setHdEnabled(!hdEnabled);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    // Compact loading state - narrow height to save space while generating
    return (
      <div className="relative bg-black w-full h-32 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">
            {renderProgress !== undefined 
              ? `Rendering video: ${Math.round(renderProgress)}%` 
              : 'Generating video...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative bg-black w-full transition-all duration-300 ${isTheaterMode ? 'max-w-none' : ''}`}
      style={{ aspectRatio: isTheaterMode ? '21/9' : '16/9' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video Element */}
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          className="absolute inset-0 w-full h-full object-contain"
          onTimeUpdate={handleVideoTimeUpdate}
          onEnded={handleVideoEnded}
          onClick={handlePlayPause}
        />
      ) : (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black p-8 text-center"
        >
          <div className="max-w-md space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center">
              <Play size={40} className="text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white">
              Video Preview Complete
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              In preview mode, the system generates the script and scene structure without rendering the actual video.
              Check the <strong className="text-white">Scenes</strong> tab to see the structured timeline.
            </p>
            <div className="pt-2 text-xs text-gray-500">
              💡 Tip: Actual video rendering will be available in production
            </div>
          </div>
        </div>
      )}

      {/* Video Controls Overlay */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Timeline */}
        <div className="px-4 pt-8 pb-2">
          <div 
            className="relative h-1 bg-gray-600 rounded-full cursor-pointer group"
            onClick={handleTimelineClick}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onMouseMove={handleTimelineDrag}
          >
            {/* Progress Bar */}
            <div 
              className="absolute top-0 left-0 h-full rounded-full transition-all"
              style={{ 
                width: `${(currentTime / duration) * 100}%`,
                backgroundColor: accent.primary
              }}
            />
            {/* Scrubber */}
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              style={{ 
                left: `${(currentTime / duration) * 100}%`,
                backgroundColor: accent.primary,
                transform: `translateX(-50%) translateY(-50%)`
              }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-4 pb-3">
          {/* Left Controls */}
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button
              onClick={handlePlayPause}
              className="text-white hover:scale-110 transition-transform"
              title={isPlaying ? 'Pause (k)' : 'Play (k)'}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2 group">
              <button
                onClick={toggleMute}
                className="text-white hover:scale-110 transition-transform"
                title={isMuted ? 'Unmute (m)' : 'Mute (m)'}
              >
                {isMuted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-0 group-hover:w-20 transition-all duration-300 accent-current opacity-0 group-hover:opacity-100"
                style={{ accentColor: accent.primary }}
              />
            </div>

            {/* Time Display */}
            <span className="text-white text-sm font-medium tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Closed Captions */}
            <button
              onClick={toggleCC}
              className={`px-2 py-1 rounded text-sm font-bold transition-all ${
                ccEnabled 
                  ? 'bg-white/20 text-white border border-white/30' 
                  : 'bg-transparent text-white/70 hover:text-white'
              }`}
              title={ccEnabled ? 'Subtitles: On (c)' : 'Subtitles: Off (c)'}
            >
              CC
            </button>

            {/* HD Quality */}
            <button
              onClick={toggleHD}
              className={`px-2 py-1 rounded text-sm font-bold transition-all ${
                hdEnabled 
                  ? 'bg-white/20 text-white border border-white/30' 
                  : 'bg-transparent text-white/70 hover:text-white'
              }`}
              title={hdEnabled ? 'Quality: HD' : 'Quality: SD'}
            >
              HD
            </button>

            {/* Theater Mode */}
            <button
              onClick={toggleTheaterMode}
              className="text-white hover:scale-110 transition-transform"
              title={isTheaterMode ? 'Default view (t)' : 'Theater mode (t)'}
            >
              {isTheaterMode ? <Minimize size={22} /> : <Maximize size={22} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
