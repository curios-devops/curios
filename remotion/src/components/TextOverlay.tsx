/**
 * Text Overlay Component
 * Displays text with animations based on scene style
 */

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneStyle } from '../../../src/services/studio/types';

interface TextOverlayProps {
  text: string;
  style: SceneStyle;
  format: 'vertical' | 'horizontal';
  accentColor?: string;
}

export const TextOverlay: React.FC<TextOverlayProps> = ({ 
  text, 
  style, 
  format,
  accentColor = '#3b82f6'
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Fade in animation (first 15 frames = 0.5 seconds)
  const fadeIn = interpolate(
    frame,
    [0, 15],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Scale animation for hook style (pop effect)
  const scale = style === 'hook' 
    ? spring({
        frame,
        fps,
        from: 0.8,
        to: 1,
        config: {
          damping: 15,
          mass: 0.5,
          stiffness: 100
        }
      })
    : 1;
  
  // Slide up animation for explain style
  const slideY = style === 'explain'
    ? interpolate(
        frame,
        [0, 20],
        [30, 0],
        {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp'
        }
      )
    : 0;
  
  // Style configurations based on scene type
  const styleConfig = {
    hook: {
      fontSize: format === 'vertical' ? 72 : 90,
      fontWeight: 800,
      textAlign: 'center' as const,
      color: '#ffffff',
      maxWidth: '90%'
    },
    explain: {
      fontSize: format === 'vertical' ? 56 : 64,
      fontWeight: 700,
      textAlign: 'left' as const,
      color: '#ffffff',
      maxWidth: '85%'
    },
    takeaway: {
      fontSize: format === 'vertical' ? 64 : 72,
      fontWeight: 800,
      textAlign: 'center' as const,
      color: '#ffffff',
      maxWidth: '90%'
    },
    outro: {
      fontSize: format === 'vertical' ? 48 : 56,
      fontWeight: 600,
      textAlign: 'center' as const,
      color: '#ffffff',
      maxWidth: '80%'
    }
  };
  
  const config = styleConfig[style];
  
  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        padding: format === 'vertical' ? '0 60px' : '0 120px'
      }}
    >
      <div
        style={{
          fontSize: config.fontSize,
          fontWeight: config.fontWeight,
          color: config.color,
          textAlign: config.textAlign,
          lineHeight: 1.2,
          opacity: fadeIn,
          transform: `scale(${scale}) translateY(${slideY}px)`,
          textShadow: '0 4px 20px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.8)',
          maxWidth: config.maxWidth,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}
      >
        {text}
      </div>
      
      {/* Accent underline for hook style */}
      {style === 'hook' && (
        <div
          style={{
            position: 'absolute',
            bottom: '40%',
            width: interpolate(
              frame,
              [10, 30],
              [0, 200],
              {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp'
              }
            ),
            height: 6,
            backgroundColor: accentColor,
            borderRadius: 3,
            opacity: fadeIn
          }}
        />
      )}
    </AbsoluteFill>
  );
};
