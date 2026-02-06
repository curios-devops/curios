/**
 * Image Overlay Component
 * Renders Brave Search images as overlays with various effects
 */

import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export interface ImageOverlayProps {
  imageUrl: string;
  duration: number; // in frames
  effect: 'zoom' | 'blur' | 'ken-burns' | 'fade';
  position?: 'center' | 'top' | 'bottom';
  opacity?: number; // 0-1
}

export const ImageOverlay: React.FC<ImageOverlayProps> = ({
  imageUrl,
  duration,
  effect,
  position = 'center',
  opacity = 0.8
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Ken Burns effect: slow zoom + pan
  const kenBurnsScale = interpolate(
    frame,
    [0, duration],
    [1, 1.2], // Scale from 1x to 1.2x
    { extrapolateRight: 'clamp' }
  );

  const kenBurnsPan = interpolate(
    frame,
    [0, duration],
    [0, -5], // Pan slightly (-5% vertical)
    { extrapolateRight: 'clamp' }
  );

  // Zoom effect: quick zoom in
  const zoomScale = effect === 'zoom'
    ? interpolate(
        frame,
        [0, 15], // Zoom in first 0.5s
        [1, 1.1],
        { extrapolateRight: 'clamp' }
      )
    : 1;

  // Blur effect: start blurred, focus, then blur out
  const blurAmount = effect === 'blur'
    ? interpolate(
        frame,
        [0, 10, duration - 10, duration],
        [20, 0, 0, 20], // Blur -> Clear -> Blur
        { extrapolateRight: 'clamp' }
      )
    : 0;

  // Fade effect: fade in and out
  const fadeOpacity = effect === 'fade'
    ? interpolate(
        frame,
        [0, 10, duration - 10, duration],
        [0, opacity, opacity, 0],
        { extrapolateRight: 'clamp' }
      )
    : opacity;

  // Combined transform
  const scale = effect === 'ken-burns' ? kenBurnsScale : zoomScale;
  const translateY = effect === 'ken-burns' ? kenBurnsPan : 0;

  return (
    <AbsoluteFill
      style={{
        justifyContent:
          position === 'top' ? 'flex-start' :
          position === 'bottom' ? 'flex-end' :
          'center',
        alignItems: 'center',
        opacity: effect === 'fade' ? fadeOpacity : opacity,
        zIndex: 5, // Above video background (1), below text (10)
        padding: position === 'center' ? 0 : 40
      }}
    >
      <div
        style={{
          width: '100%',
          height: position === 'center' ? '65%' : '50%',
          overflow: 'hidden',
          borderRadius: position === 'center' ? 0 : 12,
          boxShadow: position === 'center' 
            ? 'none' 
            : '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}
      >
        <Img
          src={imageUrl}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: `blur(${blurAmount}px)`,
            transform: `scale(${scale}) translateY(${translateY}%)`,
            transition: 'transform 0.1s ease-out',
          }}
        />
      </div>
      
      {/* Subtle gradient overlay for better text readability */}
      {position === 'center' && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 100%)',
            pointerEvents: 'none'
          }}
        />
      )}
    </AbsoluteFill>
  );
};
