/**
 * Video Background Component
 * Provides background visuals for video scenes - supports gradients and stock videos
 */

import { AbsoluteFill, Video, staticFile } from 'remotion';

interface VideoBackgroundProps {
  format: 'vertical' | 'horizontal';
  accentColor?: string;
  videoUrl?: string; // Optional stock video URL
  videoOpacity?: number; // Opacity of video overlay (0-1)
}

export const VideoBackground: React.FC<VideoBackgroundProps> = ({ 
  format,
  accentColor = '#3b82f6',
  videoUrl,
  videoOpacity = 0.6
}) => {
  // Create a visually appealing gradient (used as fallback or overlay)
  const gradients = {
    vertical: `linear-gradient(135deg, ${accentColor}20 0%, ${accentColor}40 50%, ${accentColor}20 100%)`,
    horizontal: `linear-gradient(135deg, ${accentColor}20 0%, ${accentColor}40 50%, ${accentColor}20 100%)`
  };

  return (
    <>
      {/* Base background color */}
      <AbsoluteFill
        style={{
          backgroundColor: '#000000'
        }}
      />

      {/* Stock video layer (if provided) */}
      {videoUrl && (
        <AbsoluteFill
          style={{
            opacity: videoOpacity,
          }}
        >
          <Video
            src={videoUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            muted
            loop
          />
        </AbsoluteFill>
      )}

      {/* Gradient overlay */}
      <AbsoluteFill
        style={{
          background: gradients[format],
          opacity: videoUrl ? 0.4 : 1.0, // Lighter overlay if video present
        }}
      />
    </>
  );
};
