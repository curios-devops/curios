import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface VideoControlsProps {
  videoElement: HTMLVideoElement | null;
  onPlayPause: (isPlaying: boolean) => void;
  isAvatarSpeaking: boolean;
}

export default function VideoControls({
  videoElement,
  onPlayPause,
  isAvatarSpeaking
}: VideoControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!videoElement) return;

    const handleTimeUpdate = () => {
      setCurrentTime(videoElement.currentTime);
      setDuration(videoElement.duration || 0);
      if (videoElement.duration > 0) {
        setProgress((videoElement.currentTime / videoElement.duration) * 100);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);

    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
    };
  }, [videoElement]);

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // For live streaming avatars, duration is unknown/infinite
  const isLiveStream = !isFinite(duration) || duration === 0;

  // For avatar mode, always show fixed 30-second duration
  const displayDuration = isLiveStream ? 30 : duration;

  const handlePlayPauseClick = () => {
    if (!videoElement) return;

    if (isPlaying) {
      videoElement.pause();
      onPlayPause(false);
    } else {
      videoElement.play();
      onPlayPause(true);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    if (!videoElement) return;

    setVolume(newVolume);
    videoElement.volume = newVolume / 100;
    setIsMuted(newVolume === 0);
  };

  const handleMuteToggle = () => {
    if (!videoElement) return;

    if (isMuted) {
      videoElement.volume = volume / 100;
      setIsMuted(false);
    } else {
      videoElement.volume = 0;
      setIsMuted(true);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoElement || !progressBarRef.current) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = (clickX / rect.width) * 100;
    const newTime = (percentage / 100) * videoElement.duration;

    videoElement.currentTime = newTime;
    setProgress(percentage);
  };

  return (
    <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
      {/* Play/Pause Button */}
      <button
        onClick={handlePlayPauseClick}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title={isPlaying ? 'Pause' : 'Play'}
        disabled={!videoElement}
      >
        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
      </button>

      {/* Volume Control */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleMuteToggle}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={isMuted ? 'Unmute' : 'Mute'}
          disabled={!videoElement}
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <input
          type="range"
          min="0"
          max="100"
          value={isMuted ? 0 : volume}
          onChange={(e) => handleVolumeChange(Number(e.target.value))}
          className="w-20 h-1 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--accent-primary) 0%, var(--accent-primary) ${isMuted ? 0 : volume}%, #d1d5db ${isMuted ? 0 : volume}%, #d1d5db 100%)`
          }}
          title={`Volume: ${Math.round(isMuted ? 0 : volume)}%`}
          disabled={!videoElement}
        />
      </div>

      {/* Time Display - Always show for avatar mode (0:00/0:30) */}
      <div className="text-sm font-medium min-w-[80px]">
        {formatTime(currentTime)} / {formatTime(displayDuration)}
      </div>

      {/* Live indicator for streaming */}
      {isLiveStream && isAvatarSpeaking && (
        <div className="text-sm font-medium px-2 py-1 rounded bg-red-600 text-white">
          LIVE
        </div>
      )}

      {/* Progress Bar - Only show for non-live streams */}
      {!isLiveStream && (
        <div
          ref={progressBarRef}
          onClick={handleProgressClick}
          className="flex-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full cursor-pointer relative group"
          title="Seek"
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progress}%`,
              backgroundColor: 'var(--accent-primary)'
            }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            />
          </div>
        </div>
      )}

      {/* Speaking Indicator */}
      {isAvatarSpeaking && (
        <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: 'var(--accent-primary)' }}></span>
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }}></span>
          </span>
          <span>Speaking</span>
        </div>
      )}
    </div>
  );
}
