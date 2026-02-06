/**
 * Audio Track Component
 * Plays narration audio in Remotion video
 */

import { Audio, staticFile } from 'remotion';

interface AudioTrackProps {
  audioUrl?: string;
  startFrom?: number;  // Start frame
  volume?: number;     // 0-1
}

export const AudioTrack: React.FC<AudioTrackProps> = ({ 
  audioUrl,
  startFrom = 0,
  volume = 1.0
}) => {
  if (!audioUrl) {
    return null;
  }

  // Handle both data URLs and file paths
  const isDataUrl = audioUrl.startsWith('data:');
  const src = isDataUrl ? audioUrl : staticFile(audioUrl);

  return (
    <Audio
      src={src}
      startFrom={startFrom}
      volume={volume}
    />
  );
};
