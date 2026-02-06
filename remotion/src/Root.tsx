/**
 * Remotion Root
 * Main composition registry for Studio videos
 */

import { Composition } from 'remotion';
import { StudioVideo } from './StudioVideo';
import { StudioChunk } from './StudioChunk';
import { VideoScene } from '../../src/services/studio/types';

// Default props interface
export interface StudioVideoProps {
  scenes: VideoScene[];
  format: 'vertical' | 'horizontal';
  accentColor?: string;
}

// Default scenes for preview
const defaultScenes: VideoScene[] = [
  {
    from: 0,
    to: 150,
    text: 'Welcome to CuriosAI Studio',
    style: 'hook',
    chapter: 'Introduction'
  },
  {
    from: 150,
    to: 600,
    text: 'Transform your curiosity into engaging videos',
    style: 'explain',
    chapter: 'Main Content'
  },
  {
    from: 600,
    to: 900,
    text: 'Share your knowledge with the world',
    style: 'takeaway',
    chapter: 'Conclusion'
  }
];

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Dynamic chunk composition - used by render-chunk function */}
      <Composition
        id="StudioChunk"
        component={StudioChunk}
        durationInFrames={300} // Default 10 seconds, will be overridden
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          chunkId: 'default',
          chunkIndex: 0,
          startFrame: 0,
          endFrame: 300,
          scenes: defaultScenes.map((scene, index) => ({
            ...scene,
            index,
            startFrame: scene.from,
            durationInFrames: scene.to - scene.from
          })),
          format: 'horizontal' as const,
          accentColor: '#3b82f6'
        }}
      />

      {/* Vertical 9:16 - TikTok, Instagram Reels, YouTube Shorts */}
      <Composition
        id="StudioVertical"
        component={StudioVideo}
        durationInFrames={900} // 30 seconds @ 30fps
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          scenes: defaultScenes,
          format: 'vertical' as const,
          accentColor: '#3b82f6'
        }}
      />

      {/* Horizontal 16:9 - Desktop preview, YouTube */}
      <Composition
        id="StudioHorizontal"
        component={StudioVideo}
        durationInFrames={900} // 30 seconds @ 30fps
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          scenes: defaultScenes,
          format: 'horizontal' as const,
          accentColor: '#3b82f6'
        }}
      />
    </>
  );
};
