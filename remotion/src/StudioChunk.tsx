/**
 * Studio Chunk Composition
 * Renders a single video chunk (subset of scenes)
 */

import React from 'react';
import { AbsoluteFill, Audio, Sequence, Video } from 'remotion';
import { z } from 'zod';

import { VideoBackground } from './components/VideoBackground';
import { ImageOverlay } from './components/ImageOverlay';
import { TextOverlay } from './components/TextOverlay';

// Scene schema with image overlay fields
const VideoSceneSchema = z.object({
  index: z.number(),
  text: z.string(),
  audioUrl: z.string().optional(),
  durationInFrames: z.number(),
  style: z.enum(['hook', 'explain', 'takeaway', 'outro']),
  startFrame: z.number(),
  videoUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  imageKeywords: z.string().optional(),
  imageEffect: z.enum(['zoom', 'blur', 'ken-burns', 'fade']).optional(),
  imageDuration: z.number().optional(),
  imagePosition: z.enum(['center', 'top', 'bottom']).optional(),
  imageOpacity: z.number().optional()
});

// Chunk schema
export const StudioChunkSchema = z.object({
  chunkId: z.string(),
  chunkIndex: z.number(),
  startFrame: z.number(), // Relative to full video
  endFrame: z.number(),   // Relative to full video
  scenes: z.array(VideoSceneSchema),
  format: z.enum(['vertical', 'horizontal']),
  accentColor: z.string().optional()
});

export type StudioChunkProps = z.infer<typeof StudioChunkSchema>;

export const StudioChunk: React.FC<StudioChunkProps> = ({
  scenes,
  format,
  accentColor = '#3b82f6'
}) => {
  const dimensions = format === 'vertical'
    ? { width: 1080, height: 1920 } // 9:16 for mobile
    : { width: 1920, height: 1080 }; // 16:9 for desktop

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#000000',
        width: dimensions.width,
        height: dimensions.height
      }}
    >
      {scenes.map((scene) => {
        // Calculate frame offset relative to chunk start
        const chunkStartFrame = scenes[0].startFrame;
        const sceneStartInChunk = scene.startFrame - chunkStartFrame;

        return (
          <Sequence
            key={`scene-${scene.index}`}
            from={sceneStartInChunk}
            durationInFrames={scene.durationInFrames}
          >
            {/* Layer 1: Video Background */}
            {scene.videoUrl && (
              <VideoBackground
                videoUrl={scene.videoUrl}
                format={format}
                accentColor={accentColor}
              />
            )}

            {/* Layer 5: Image Overlay (supporting evidence) */}
            {scene.imageUrl && scene.imageEffect && (
              <ImageOverlay
                imageUrl={scene.imageUrl}
                duration={scene.imageDuration ? scene.imageDuration * 30 : scene.durationInFrames}
                effect={scene.imageEffect}
                position={scene.imagePosition || 'center'}
                opacity={scene.imageOpacity || 0.85}
              />
            )}

            {/* Layer 10: Text Overlay */}
            <TextOverlay
              text={scene.text}
              style={scene.style}
              format={format}
              accentColor={accentColor}
            />

            {/* Audio Layer */}
            {scene.audioUrl && (
              <Audio src={scene.audioUrl} />
            )}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

// Export composition metadata for chunk registration
export const getChunkCompositionConfig = (chunkId: string, durationInFrames: number, format: 'vertical' | 'horizontal') => {
  const dimensions = format === 'vertical'
    ? { width: 1080, height: 1920 }
    : { width: 1920, height: 1080 };

  return {
    id: `chunk-${chunkId}`,
    component: StudioChunk,
    durationInFrames,
    fps: 30,
    width: dimensions.width,
    height: dimensions.height,
    schema: StudioChunkSchema
  };
};
