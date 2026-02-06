/**
 * Studio Video Component
 * Main video composition that assembles all scenes
 */

import { AbsoluteFill, Sequence, useVideoConfig, interpolate, useCurrentFrame } from 'remotion';
import { VideoScene } from '../../src/services/studio/types';
import { TextOverlay } from './components/TextOverlay';
import { VideoBackground } from './components/VideoBackground';
import { AudioTrack } from './components/AudioTrack';
import { ImageOverlay } from './components/ImageOverlay';

export interface StudioVideoProps {
  scenes?: VideoScene[];
  format?: 'vertical' | 'horizontal';
  accentColor?: string;
}

export const StudioVideo: React.FC<StudioVideoProps> = ({ 
  scenes = [], 
  format = 'vertical',
  accentColor = '#3b82f6'
}) => {
  const { durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  
  // Calculate branding outro timing (last 60 frames = 2 seconds)
  const outroStart = durationInFrames - 60;
  const showBranding = frame >= outroStart;
  
  // Fade in branding
  const brandingOpacity = interpolate(
    frame,
    [outroStart, outroStart + 15],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      {/* Scene sequences with backgrounds and text overlays */}
      {scenes.map((scene, index) => {
        const duration = scene.to - scene.from;
        
        return (
          <Sequence
            key={`scene-${index}`}
            from={scene.from}
            durationInFrames={duration}
          >
            {/* Background for this scene */}
            <VideoBackground 
              format={format} 
              accentColor={accentColor}
              videoUrl={scene.videoUrl}
            />
            
            {/* Image overlay (Brave Search - Phase 6A) */}
            {scene.imageUrl && scene.imageEffect && scene.imageDuration && (
              <ImageOverlay
                imageUrl={scene.imageUrl}
                duration={Math.floor(scene.imageDuration * 30)} // seconds to frames
                effect={scene.imageEffect}
                position={scene.imagePosition || 'center'}
                opacity={scene.imageOpacity || 0.8}
              />
            )}
            
            {/* Text overlay */}
            <TextOverlay 
              text={scene.text} 
              style={scene.style}
              format={format}
              accentColor={accentColor}
            />
            
            {/* Audio narration for this scene */}
            {scene.audioUrl && (
              <AudioTrack 
                audioUrl={scene.audioUrl}
                startFrom={scene.from}
              />
            )}
          </Sequence>
        );
      })}
      
      {/* CuriosAI branding (last 2 seconds) */}
      {showBranding && (
        <AbsoluteFill 
          style={{ 
            justifyContent: 'flex-end', 
            alignItems: 'center',
            paddingBottom: format === 'vertical' ? 60 : 40,
            pointerEvents: 'none'
          }}
        >
          <div 
            style={{ 
              fontSize: format === 'vertical' ? 24 : 28,
              color: 'rgba(255,255,255,0.7)',
              fontWeight: 500,
              opacity: brandingOpacity,
              textShadow: '0 2px 8px rgba(0,0,0,0.8)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
          >
            Explained by <span style={{ fontWeight: 700, color: accentColor }}>Curios</span>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
