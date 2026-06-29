# Studio Video Generation Implementation Plan

## Overview
This document outlines the implementation plan for actual video generation in CuriosAI Studio, based on the architecture defined in `Studio_arquitecture.md`.

## Current Status

### ✅ Completed Components
1. **StudioWriterAgent** - Generates content with streaming
   - Key ideas (bullet points)
   - Script with YouTube-style chapters and timestamps
   - Description (short summary)
   
2. **UI Layer** - Complete YouTube-style interface
   - Compact loading state (saves space during generation)
   - Video player component (UI only, no actual video yet)
   - Tabs for Video/Ideas/Script
   - Clickable timestamps that seek video
   - Action buttons (Regenerate, Share, Download)

3. **Orchestrator** - Workflow management
   - Progress tracking
   - Streaming callbacks
   - Step execution

### 🚧 Missing Components (This Plan)
1. **Scene Generation** - Convert script to structured scenes
2. **Remotion Setup** - Video rendering framework
3. **Video Rendering** - Actual video generation
4. **Asset Management** - Background videos, images
5. **Output Handling** - Video storage and delivery

---

## Phase 1: Scene Generation Agent

### Goal
Convert the chaptered script with timestamps into a structured scene array for Remotion.

### Input Example
```typescript
**Opening Hook**
00:00 - Why do airplane windows have that tiny hole?

**Main Explanation**
00:05 - It's called a breather hole
00:10 - It regulates pressure between window panes
00:15 - Prevents fogging and structural stress

**Conclusion**
00:25 - Small detail, big safety feature
```

### Output Example
```typescript
{
  duration: 30, // seconds
  scenes: [
    {
      from: 0,        // frames (0s @ 30fps = frame 0)
      to: 150,        // frames (5s @ 30fps = frame 150)
      text: "Why do airplane windows have that tiny hole?",
      style: "hook",
      chapter: "Opening Hook"
    },
    {
      from: 150,
      to: 300,
      text: "It's called a breather hole",
      style: "explain",
      chapter: "Main Explanation"
    },
    {
      from: 300,
      to: 450,
      text: "It regulates pressure between window panes",
      style: "explain",
      chapter: "Main Explanation"
    },
    {
      from: 450,
      to: 600,
      text: "Prevents fogging and structural stress",
      style: "explain",
      chapter: "Main Explanation"
    },
    {
      from: 750,
      to: 900,
      text: "Small detail, big safety feature",
      style: "takeaway",
      chapter: "Conclusion"
    }
  ]
}
```

### Implementation Files

#### 1. Scene Type Definition (`/src/services/studio/types.ts`)
```typescript
export interface VideoScene {
  from: number;         // Start frame
  to: number;           // End frame
  text: string;         // On-screen text
  style: SceneStyle;    // Visual style
  chapter?: string;     // Chapter title
}

export type SceneStyle = 'hook' | 'explain' | 'takeaway' | 'outro';

export interface SceneStructure {
  duration: number;     // Total duration in seconds
  fps: number;          // Frames per second (30 or 60)
  scenes: VideoScene[];
}
```

#### 2. Scene Generator Agent (`/src/services/studio/agents/sceneGenerator.ts`)
```typescript
/**
 * Scene Generator Agent
 * Converts chaptered script with timestamps into structured scenes for Remotion
 */

import { logger } from '../../../utils/logger';
import { VideoScene, SceneStructure, SceneStyle } from '../types';

export class SceneGeneratorAgent {
  private fps = 30; // Standard 30fps for social media

  /**
   * Parse script and generate scene structure
   */
  generateScenes(script: string, duration: number = 30): SceneStructure {
    logger.info('[Scene Generator] Starting scene generation', { 
      scriptLength: script.length, 
      duration 
    });

    const scenes: VideoScene[] = [];
    const lines = script.split('\n').filter(line => line.trim());
    
    let currentChapter = '';
    
    for (const line of lines) {
      // Check if line is a chapter title (bold with **)
      if (line.startsWith('**') && line.endsWith('**')) {
        currentChapter = line.replace(/\*\*/g, '').trim();
        continue;
      }
      
      // Check if line has timestamp format (MM:SS - Text)
      const timestampMatch = line.match(/^(\d{1,2}):(\d{2})\s*-\s*(.+)$/);
      if (timestampMatch) {
        const minutes = parseInt(timestampMatch[1]);
        const seconds = parseInt(timestampMatch[2]);
        const text = timestampMatch[3].trim();
        
        const startTime = minutes * 60 + seconds;
        const startFrame = startTime * this.fps;
        
        // Determine scene style based on chapter and position
        const style = this.determineSceneStyle(currentChapter, scenes.length);
        
        scenes.push({
          from: startFrame,
          to: startFrame + (5 * this.fps), // Default 5-second duration
          text,
          style,
          chapter: currentChapter
        });
      }
    }
    
    // Adjust scene durations to not overlap
    for (let i = 0; i < scenes.length - 1; i++) {
      scenes[i].to = scenes[i + 1].from;
    }
    
    // Set last scene to end at video duration
    if (scenes.length > 0) {
      scenes[scenes.length - 1].to = duration * this.fps;
    }
    
    logger.info('[Scene Generator] Scenes generated', { count: scenes.length });
    
    return {
      duration,
      fps: this.fps,
      scenes
    };
  }
  
  /**
   * Determine scene style based on chapter and position
   */
  private determineSceneStyle(chapter: string, index: number): SceneStyle {
    const lowerChapter = chapter.toLowerCase();
    
    // First scene is always hook
    if (index === 0) return 'hook';
    
    // Check chapter keywords
    if (lowerChapter.includes('hook') || lowerChapter.includes('opening')) {
      return 'hook';
    }
    if (lowerChapter.includes('conclusion') || lowerChapter.includes('takeaway')) {
      return 'takeaway';
    }
    if (lowerChapter.includes('outro') || lowerChapter.includes('closing')) {
      return 'outro';
    }
    
    // Default to explain
    return 'explain';
  }
}
```

#### 3. Update StudioVideo Type
```typescript
export interface StudioVideo {
  id?: string;
  type: StudioOutputType;
  content: string;
  keyIdeas?: string;
  script?: string;
  description?: string;
  scenes?: SceneStructure;  // NEW: Scene structure for Remotion
  title?: string;
  planDetails?: PlanDetail[];
  steps?: StepItem[];
  thinkingLog?: string[];
  createdAt?: Date;
  userId?: string;
  duration?: number;
  format?: 'vertical' | 'horizontal';
  videoUrl?: string;
}
```

---

## Phase 2: Remotion Setup

### Goal
Set up Remotion for video rendering with minimal configuration.

### Installation
```bash
npm install remotion @remotion/cli @remotion/bundler @remotion/renderer
```

### Project Structure
```
/remotion/
  /src/
    Root.tsx              # Main composition registry
    StudioVideo.tsx       # Main video component
    components/
      TextOverlay.tsx     # Text display component
      VideoBackground.tsx # Background component
      SceneTransition.tsx # Transition effects
  remotion.config.ts      # Remotion configuration
```

### Configuration Files

#### 1. Remotion Config (`/remotion/remotion.config.ts`)
```typescript
import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setPixelFormat('yuv420p');
Config.setConcurrency(2);
```

#### 2. Root Composition (`/remotion/src/Root.tsx`)
```typescript
import { Composition } from 'remotion';
import { StudioVideo } from './StudioVideo';

export const RemotionRoot = () => {
  return (
    <>
      {/* Vertical 9:16 (TikTok, Reels, Shorts) */}
      <Composition
        id="StudioVertical"
        component={StudioVideo}
        durationInFrames={900} // 30s @ 30fps
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          scenes: [],
          format: 'vertical'
        }}
      />
      
      {/* Horizontal 16:9 (Desktop preview) */}
      <Composition
        id="StudioHorizontal"
        component={StudioVideo}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          scenes: [],
          format: 'horizontal'
        }}
      />
    </>
  );
};
```

---

## Phase 3: Remotion Components

### 1. Main Video Component (`/remotion/src/StudioVideo.tsx`)
```typescript
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { VideoScene, SceneStructure } from '../../src/services/studio/types';
import { TextOverlay } from './components/TextOverlay';
import { VideoBackground } from './components/VideoBackground';

interface StudioVideoProps {
  scenes: VideoScene[];
  format: 'vertical' | 'horizontal';
}

export const StudioVideo: React.FC<StudioVideoProps> = ({ scenes, format }) => {
  const frame = useCurrentFrame();
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Background layer */}
      <VideoBackground format={format} />
      
      {/* Scene sequences with text overlays */}
      {scenes.map((scene, index) => (
        <Sequence
          key={index}
          from={scene.from}
          durationInFrames={scene.to - scene.from}
        >
          <TextOverlay 
            text={scene.text} 
            style={scene.style}
            format={format}
          />
        </Sequence>
      ))}
      
      {/* CuriosAI branding (last 2 seconds) */}
      <Sequence from={scenes[scenes.length - 1]?.to - 60 || 0} durationInFrames={60}>
        <AbsoluteFill 
          style={{ 
            justifyContent: 'flex-end', 
            alignItems: 'center',
            paddingBottom: 40
          }}
        >
          <div style={{ 
            fontSize: 24, 
            color: 'rgba(255,255,255,0.6)',
            fontWeight: 500
          }}>
            Explained by Curios
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
```

### 2. Text Overlay Component (`/remotion/src/components/TextOverlay.tsx`)
```typescript
import { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { SceneStyle } from '../../../src/services/studio/types';

interface TextOverlayProps {
  text: string;
  style: SceneStyle;
  format: 'vertical' | 'horizontal';
}

export const TextOverlay: React.FC<TextOverlayProps> = ({ text, style, format }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Fade in animation
  const opacity = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    config: { damping: 200 }
  });
  
  // Scale animation for hook style
  const scale = style === 'hook' ? spring({
    frame,
    fps,
    from: 0.8,
    to: 1,
    config: { damping: 200 }
  }) : 1;
  
  // Style variations based on scene type
  const fontSize = style === 'hook' ? (format === 'vertical' ? 72 : 90) : (format === 'vertical' ? 56 : 64);
  const fontWeight = style === 'hook' ? 800 : 700;
  const textAlign = style === 'takeaway' ? 'center' : 'left';
  
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
          fontSize,
          fontWeight,
          color: '#fff',
          textAlign,
          lineHeight: 1.2,
          opacity,
          transform: `scale(${scale})`,
          textShadow: '0 4px 12px rgba(0,0,0,0.8)',
          maxWidth: '90%'
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
```

### 3. Background Component (`/remotion/src/components/VideoBackground.tsx`)
```typescript
import { AbsoluteFill, Img, staticFile } from 'remotion';

interface VideoBackgroundProps {
  format: 'vertical' | 'horizontal';
}

export const VideoBackground: React.FC<VideoBackgroundProps> = ({ format }) => {
  // For now, use a simple gradient
  // Later: integrate with stock video API or AI-generated backgrounds
  
  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        opacity: 0.15
      }}
    />
  );
};
```

---

## Phase 4: Rendering Integration

### 1. Video Renderer Service (`/src/services/studio/agents/videoRenderer.ts`)
```typescript
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { logger } from '../../../utils/logger';
import { SceneStructure } from '../types';
import path from 'path';

export class VideoRendererAgent {
  private remotionRoot = path.join(process.cwd(), 'remotion/src/Root.tsx');
  
  /**
   * Render video from scene structure
   */
  async renderVideo(
    scenes: SceneStructure,
    format: 'vertical' | 'horizontal',
    outputPath: string
  ): Promise<string> {
    logger.info('[Video Renderer] Starting render', { 
      sceneCount: scenes.scenes.length,
      format,
      duration: scenes.duration
    });
    
    try {
      // Bundle Remotion code
      const bundleLocation = await bundle(this.remotionRoot, () => undefined, {
        webpackOverride: (config) => config,
      });
      
      // Select composition
      const compositionId = format === 'vertical' ? 'StudioVertical' : 'StudioHorizontal';
      const composition = await selectComposition({
        serveUrl: bundleLocation,
        id: compositionId,
        inputProps: {
          scenes: scenes.scenes,
          format
        },
      });
      
      // Render video
      await renderMedia({
        composition,
        serveUrl: bundleLocation,
        codec: 'h264',
        outputLocation: outputPath,
        inputProps: {
          scenes: scenes.scenes,
          format
        },
      });
      
      logger.info('[Video Renderer] Render complete', { outputPath });
      return outputPath;
      
    } catch (error) {
      logger.error('[Video Renderer] Render failed', { error });
      throw new Error(`Video rendering failed: ${error.message}`);
    }
  }
}
```

### 2. Update Orchestrator (`/src/services/studio/agents/orchestrator.ts`)
```typescript
import { SceneGeneratorAgent } from './sceneGenerator';
import { VideoRendererAgent } from './videoRenderer';

// Initialize agents
const sceneGenerator = new SceneGeneratorAgent();
const videoRenderer = new VideoRendererAgent();

// Add to orchestration flow:

// Step 4: Generate scenes
await executeStep(steps, 3, onProgress, { ...currentState });
const sceneStructure = sceneGenerator.generateScenes(script, video.duration || 30);
onProgress({
  ...currentState,
  scenes: sceneStructure,
  steps: [...steps]
});

// Step 5: Render video
await executeStep(steps, 4, onProgress, { ...currentState });
const outputPath = `/tmp/studio_${Date.now()}.mp4`;
const videoUrl = await videoRenderer.renderVideo(
  sceneStructure,
  video.format || 'vertical',
  outputPath
);
```

---

## Phase 5: Asset Management & Storage

### Options for Implementation

#### Option A: Client-Side Rendering (Remotion Player)
- Use `<Player>` component from `@remotion/player`
- Render preview in browser
- Generate video on-demand via Remotion Lambda or local rendering

#### Option B: Server-Side Rendering (Supabase Edge Function)
- Deploy Remotion rendering to edge function
- Store rendered videos in Supabase Storage
- Return video URL to client

#### Option C: Hybrid Approach (Recommended)
- Client-side preview with `<Player>`
- Server-side rendering for final export
- Cache rendered videos in Supabase Storage

### Storage Setup

1. **Supabase Storage Bucket**
```sql
-- Create bucket for studio videos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('studio-videos', 'studio-videos', true);

-- Set up RLS policies
CREATE POLICY "Allow public read access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'studio-videos');

CREATE POLICY "Allow authenticated upload" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'studio-videos' 
  AND auth.role() = 'authenticated'
);
```

2. **Upload Service** (`/src/services/studio/storage/videoStorage.ts`)
```typescript
import { supabase } from '../../../lib/supabase';

export async function uploadVideo(
  videoFile: File | Blob,
  videoId: string
): Promise<string> {
  const filename = `${videoId}.mp4`;
  const { data, error } = await supabase.storage
    .from('studio-videos')
    .upload(filename, videoFile, {
      contentType: 'video/mp4',
      upsert: true
    });
    
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('studio-videos')
    .getPublicUrl(filename);
    
  return publicUrl;
}
```

---

## Implementation Timeline

### Sprint 1: Scene Generation (2-3 days)
- [ ] Create SceneGeneratorAgent
- [ ] Add scene types to types.ts
- [ ] Parse script timestamps to scenes
- [ ] Test with real script output
- [ ] Update orchestrator to generate scenes

### Sprint 2: Remotion Setup (2-3 days)
- [ ] Install Remotion dependencies
- [ ] Create basic composition structure
- [ ] Build TextOverlay component
- [ ] Test simple rendering locally
- [ ] Add background component

### Sprint 3: Rendering Integration (3-4 days)
- [ ] Create VideoRendererAgent
- [ ] Integrate with orchestrator
- [ ] Set up storage bucket
- [ ] Implement upload service
- [ ] Test end-to-end flow

### Sprint 4: Polish & Optimization (2-3 days)
- [ ] Add animations and transitions
- [ ] Optimize rendering performance
- [ ] Implement caching strategy
- [ ] Add error handling
- [ ] Create thumbnail generation

---

## Testing Strategy

### Unit Tests
- SceneGeneratorAgent parsing logic
- Timestamp conversion to frames
- Scene style determination

### Integration Tests
- Script → Scenes → Video pipeline
- Storage upload/retrieval
- Error handling and retries

### Manual Tests
- Generate video for sample queries
- Test vertical vs horizontal formats
- Verify text readability
- Check animation smoothness
- Test on different screen sizes

---

## Success Metrics

### Technical
- [ ] Video renders in <10 seconds for 30s video
- [ ] Scene generation accuracy >95%
- [ ] Zero rendering failures
- [ ] Video file size <10MB for 30s

### User Experience
- [ ] Text is readable on mobile screens
- [ ] Animations are smooth
- [ ] Transitions feel natural
- [ ] Branding is subtle but present

---

## Future Enhancements

1. **AI-Generated Backgrounds**
   - Integrate with DALL-E or Stable Diffusion
   - Generate contextual backgrounds per scene

2. **Voice-Over**
   - Text-to-speech integration (ElevenLabs, OpenAI TTS)
   - Sync with scene timing

3. **Music & Sound Effects**
   - Background music from royalty-free libraries
   - Sound effects for transitions

4. **Advanced Animations**
   - Kinetic typography
   - Data visualizations
   - Character animations

5. **A/B Testing**
   - Multiple visual styles
   - Different animation speeds
   - Various text placements

---

## References

- Architecture: `/docs/architecture/Studio_arquitecture.md`
- Remotion Docs: https://www.remotion.dev/docs
- Supabase Storage: https://supabase.com/docs/guides/storage
