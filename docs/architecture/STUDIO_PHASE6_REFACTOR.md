# Phase 6: Studio Refactor - Brave Images + Chunked Rendering

## Overview
Refactor Studio video generation to add:
1. **Brave Image Search** for supporting evidence/overlays
2. **Chunked video rendering** (5-10 sec chunks) to avoid serverless timeouts
3. **Progressive playback** - start showing chunks while rendering continues

## Status: 📋 PLANNING


**Estimated Lines:** 800+ lines across 6 new/modified files

---

## Architecture Changes

### Current Architecture (Phase 1-5)

```
User Prompt
    ↓
Orchestrator → Writer Agent → Scene Generator
    ↓
VideoAssetAgent (Pexels videos)
    ↓
AudioAssetAgent (OpenAI TTS)
    ↓
VideoRenderer (PREVIEW MODE - simulates rendering)
    ↓
Remotion Preview (full video, 30-60s)
```

**Current Limitations:**
- ❌ No image overlays (only stock videos)
- ❌ Full video rendering (long wait time)
- ❌ Serverless timeouts on Netlify/Supabase (30s-60s limits)
- ❌ No progressive playback (must wait for complete video)

---

### New Architecture (Phase 6)

```
User Prompt
    ↓
Orchestrator → Writer Agent → Scene Generator
    ↓
[PARALLEL ASSET FETCHING]
    ├─ VideoAssetAgent (Pexels videos - background)
    ├─ ImageAssetAgent (Brave Search - overlays) ← NEW
    └─ AudioAssetAgent (OpenAI TTS - narration)
    ↓
ChunkPlanner (split into 5-10s chunks) ← NEW
    ↓
ChunkedRenderer (parallel rendering) ← NEW
    ├─ Chunk 1 (0-7s)   → render → upload → ready
    ├─ Chunk 2 (7-14s)  → render → upload → ready
    ├─ Chunk 3 (14-21s) → render → upload → ready
    └─ Chunk N (...)    → render → upload → ready
    ↓
Progressive Player (play chunks as ready) ← NEW
    ↓
[OPTIONAL] ChunkStitcher (final MP4 for download)
```

**New Capabilities:**
- ✅ Image overlays for supporting evidence
- ✅ Chunked rendering (5-10s each, no timeouts)
- ✅ Parallel chunk generation (faster)
- ✅ Progressive playback (start watching immediately)
- ✅ Serverless-friendly (short function calls)

---

## Component Design

### 1. ImageAssetAgent (NEW)

**File:** `/src/services/studio/assets/imageAssetAgent.ts`  
**Lines:** ~180 lines  
**Purpose:** Search and assign Brave images as overlays/supporting evidence

**Key Differences from VideoAssetAgent:**
- Images are overlays, NOT backgrounds
- Used for specific key points (2-3 per video)
- Short duration (3-5 seconds per image)
- Applied with effects (blur, zoom, Ken Burns)

**Methods:**
```typescript
class ImageAssetAgent {
  // Search Brave for images matching scene context
  async searchImages(query: string, options?: SearchOptions): Promise<BraveImage[]>
  
  // Assign images to specific scenes as overlays
  async assignImageOverlays(
    sceneStructure: SceneStructure,
    strategy: 'key-points' | 'all-scenes' | 'none'
  ): Promise<SceneStructureWithImages>
  
  // Engineer query based on mood + action + metaphor
  engineerQuery(scene: VideoScene): string
  
  // Select best images from Brave results
  selectBestImages(images: BraveImage[], count: number): BraveImage[]
  
  // Check if Brave API is configured
  isEnabled(): boolean
}
```

**Query Engineering Strategy:**
```typescript
// BAD: Literal user query
"Why is remote work declining?" → random office photos

// GOOD: Engineered query
engineerQuery(scene) {
  const mood = scene.style; // e.g., "uncertain"
  const action = extractAction(scene.text); // e.g., "leaving"
  const metaphor = extractMetaphor(scene.text); // e.g., "empty office"
  
  return `${metaphor} ${action} ${mood} editorial photography`;
  // Result: "empty office leaving uncertain editorial photography"
}
```

**Assignment Strategy:**
```typescript
// key-points: Only for important scenes (2-3 per video)
// - Hook scene
// - Key explanation scenes
// - Conclusion scene
// Duration: 3-5 seconds overlay

// all-scenes: Every scene gets an image (slower)
// Duration: Match scene duration

// none: No images (video-only mode)
```

**Integration with Scenes:**
```typescript
interface VideoScene {
  from: number;
  to: number;
  text: string;
  style: SceneStyle;
  
  // Phase 4: Video backgrounds
  videoUrl?: string;
  videoKeywords?: string;
  
  // Phase 5: Audio narration
  audioUrl?: string;
  audioDuration?: number;
  audioVoice?: TTSVoice;
  
  // Phase 6: Image overlays (NEW)
  imageUrl?: string;           // Brave image URL
  imageKeywords?: string;      // Engineered query used
  imageEffect?: 'zoom' | 'blur' | 'ken-burns' | 'fade';
  imageDuration?: number;      // How long image shows (3-5s)
  imagePosition?: 'center' | 'top' | 'bottom'; // Overlay position
  imageOpacity?: number;       // 0-1 (default: 0.8)
}
```

---

### 2. ChunkPlanner (NEW)

**File:** `/src/services/studio/rendering/chunkPlanner.ts`  
**Lines:** ~150 lines  
**Purpose:** Split video into renderable chunks respecting sentence boundaries

**Key Features:**
- Split at sentence boundaries (never mid-sentence)
- Target chunk size: 5-10 seconds
- Maintain scene integrity (don't split scenes mid-way if possible)
- Generate chunk metadata for rendering

**Methods:**
```typescript
class ChunkPlanner {
  // Split scenes into chunks
  planChunks(
    sceneStructure: SceneStructure,
    targetChunkDuration: number = 7 // seconds
  ): VideoChunk[]
  
  // Find optimal split points (sentence boundaries)
  findSplitPoints(
    scenes: VideoScene[],
    targetDuration: number
  ): SplitPoint[]
  
  // Validate chunks don't cut mid-sentence
  validateChunks(chunks: VideoChunk[]): ValidationResult
  
  // Get chunk rendering order (can optimize for importance)
  getChunkRenderOrder(chunks: VideoChunk[]): number[]
}
```

**Chunk Data Structure:**
```typescript
interface VideoChunk {
  id: string;              // chunk_0, chunk_1, etc.
  index: number;           // 0, 1, 2...
  startFrame: number;      // 0, 210, 420...
  endFrame: number;        // 210, 420, 630...
  duration: number;        // In seconds
  scenes: VideoScene[];    // Scenes included in this chunk
  priority: 'high' | 'normal'; // For render ordering
}

interface SplitPoint {
  frame: number;
  isSentenceBoundary: boolean;
  confidence: number; // 0-1 (1 = perfect split)
}
```

**Split Algorithm:**
```typescript
planChunks(sceneStructure, targetDuration = 7) {
  const chunks: VideoChunk[] = [];
  let currentChunk: VideoScene[] = [];
  let currentDuration = 0;
  
  for (const scene of sceneStructure.scenes) {
    const sceneDuration = (scene.to - scene.from) / 30; // frames to seconds
    
    // If adding this scene exceeds target, finalize chunk
    if (currentDuration + sceneDuration > targetDuration && currentChunk.length > 0) {
      // Check if we're at a sentence boundary
      if (this.isSentenceBoundary(scene.text)) {
        chunks.push(this.createChunk(currentChunk));
        currentChunk = [scene];
        currentDuration = sceneDuration;
      } else {
        // Include scene in current chunk to avoid mid-sentence split
        currentChunk.push(scene);
        currentDuration += sceneDuration;
      }
    } else {
      currentChunk.push(scene);
      currentDuration += sceneDuration;
    }
  }
  
  // Add final chunk
  if (currentChunk.length > 0) {
    chunks.push(this.createChunk(currentChunk));
  }
  
  return chunks;
}

isSentenceBoundary(text: string): boolean {
  // Check if text ends with sentence-ending punctuation
  return /[.!?]\s*$/.test(text.trim());
}
```

**Chunk Prioritization:**
```typescript
// Render high-priority chunks first (hook, key points)
getChunkRenderOrder(chunks: VideoChunk[]): number[] {
  const prioritized = chunks.map((chunk, index) => {
    let priority = 'normal';
    
    // First chunk is high priority (hook)
    if (index === 0) priority = 'high';
    
    // Chunks with "hook" or "takeaway" style scenes
    if (chunk.scenes.some(s => s.style === 'hook' || s.style === 'takeaway')) {
      priority = 'high';
    }
    
    return { index, priority };
  });
  
  // Sort: high priority first
  return prioritized
    .sort((a, b) => a.priority === 'high' ? -1 : 1)
    .map(p => p.index);
}
```

---

### 3. ChunkedRenderer (NEW)

**File:** `/src/services/studio/rendering/chunkedRenderer.ts`  
**Lines:** ~200 lines  
**Purpose:** Render video chunks in parallel, handle uploads, enable progressive playback

**Key Features:**
- Parallel chunk rendering (2-3 at a time)
- Individual chunk uploads to storage
- Progress tracking per chunk
- Error handling with retries
- Serverless-friendly (short function calls)

**Methods:**
```typescript
class ChunkedRenderer {
  // Render all chunks with parallel processing
  async renderChunks(
    chunks: VideoChunk[],
    format: 'vertical' | 'horizontal',
    videoId: string,
    options?: RenderOptions,
    onChunkComplete?: (chunkId: string, url: string, progress: number) => void
  ): Promise<ChunkRenderResult[]>
  
  // Render a single chunk
  async renderChunk(
    chunk: VideoChunk,
    format: 'vertical' | 'horizontal',
    videoId: string,
    options?: RenderOptions
  ): Promise<string> // Returns chunk URL
  
  // Upload chunk to storage (Supabase Storage)
  async uploadChunk(
    chunkId: string,
    videoBlob: Blob,
    metadata: ChunkMetadata
  ): Promise<string>
  
  // Get rendering status
  getRenderingProgress(): {
    total: number;
    completed: number;
    inProgress: number;
    failed: number;
  }
}
```

**Parallel Rendering Strategy:**
```typescript
async renderChunks(chunks, format, videoId, options, onChunkComplete) {
  const maxParallel = 3; // Render 3 chunks at a time
  const results: ChunkRenderResult[] = [];
  
  // Prioritize chunks
  const renderOrder = this.chunkPlanner.getChunkRenderOrder(chunks);
  
  // Render in batches
  for (let i = 0; i < renderOrder.length; i += maxParallel) {
    const batch = renderOrder.slice(i, i + maxParallel);
    
    const batchPromises = batch.map(chunkIndex => {
      const chunk = chunks[chunkIndex];
      return this.renderChunk(chunk, format, videoId, options)
        .then(chunkUrl => {
          const progress = ((i + batch.indexOf(chunkIndex) + 1) / chunks.length) * 100;
          onChunkComplete?.(chunk.id, chunkUrl, progress);
          
          return {
            chunkId: chunk.id,
            chunkUrl,
            status: 'complete' as const
          };
        })
        .catch(error => ({
          chunkId: chunk.id,
          chunkUrl: '',
          status: 'failed' as const,
          error: error.message
        }));
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  return results;
}
```

**Server-Side Rendering (Netlify Function):**
```typescript
// netlify/functions/render-chunk.ts
export const handler = async (event) => {
  const { chunk, format, videoId, options } = JSON.parse(event.body);
  
  // Use Remotion's server-side rendering
  const outputPath = await renderMedia({
    composition: {
      id: 'StudioChunk',
      width: format === 'vertical' ? 1080 : 1920,
      height: format === 'vertical' ? 1920 : 1080,
      fps: 30,
      durationInFrames: chunk.endFrame - chunk.startFrame,
      props: { chunk, format, options }
    },
    codec: 'h264',
    outputLocation: `/tmp/chunk_${chunk.id}.mp4`
  });
  
  // Upload to Supabase Storage
  const chunkUrl = await uploadToSupabase(outputPath, videoId, chunk.id);
  
  return {
    statusCode: 200,
    body: JSON.stringify({ chunkId: chunk.id, chunkUrl })
  };
};
```

---

### 4. ProgressivePlayer Component (NEW)

**File:** `/src/services/studio/components/ProgressivePlayer.tsx`  
**Lines:** ~120 lines  
**Purpose:** Play video chunks progressively as they become available

**Key Features:**
- Start playback with first chunk
- Seamlessly transition between chunks
- Buffer next chunks during playback
- Show rendering progress for pending chunks
- Fallback to static preview if chunk fails

**Component:**
```typescript
interface ProgressivePlayerProps {
  videoId: string;
  chunks: ChunkRenderResult[];
  format: 'vertical' | 'horizontal';
  onComplete?: () => void;
}

export function ProgressivePlayer({ videoId, chunks, format, onComplete }: ProgressivePlayerProps) {
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [bufferedChunks, setBufferedChunks] = useState<Set<number>>(new Set([0]));
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // When chunk completes, transition to next
  const handleChunkEnded = () => {
    const nextIndex = currentChunkIndex + 1;
    
    if (nextIndex < chunks.length) {
      // Check if next chunk is ready
      if (chunks[nextIndex].status === 'complete') {
        setCurrentChunkIndex(nextIndex);
      } else {
        // Show loading state while waiting for next chunk
        showChunkLoadingState();
      }
    } else {
      onComplete?.();
    }
  };
  
  // Buffer next chunks in background
  useEffect(() => {
    const nextChunks = [currentChunkIndex + 1, currentChunkIndex + 2];
    
    nextChunks.forEach(index => {
      if (index < chunks.length && chunks[index].status === 'complete') {
        bufferChunk(index);
      }
    });
  }, [currentChunkIndex, chunks]);
  
  return (
    <div className="progressive-player">
      {/* Current chunk video */}
      <video
        ref={videoRef}
        src={chunks[currentChunkIndex].chunkUrl}
        autoPlay
        onEnded={handleChunkEnded}
        className={format === 'vertical' ? 'aspect-[9/16]' : 'aspect-[16/9]'}
      />
      
      {/* Rendering progress indicator */}
      <div className="chunk-progress">
        {chunks.map((chunk, index) => (
          <div
            key={chunk.chunkId}
            className={`chunk-indicator ${
              index === currentChunkIndex ? 'active' :
              chunk.status === 'complete' ? 'ready' :
              chunk.status === 'rendering' ? 'rendering' :
              'pending'
            }`}
          />
        ))}
      </div>
      
      {/* Show next chunk rendering status */}
      {currentChunkIndex < chunks.length - 1 && 
       chunks[currentChunkIndex + 1].status !== 'complete' && (
        <div className="rendering-notice">
          Rendering next segment... {renderingProgress}%
        </div>
      )}
    </div>
  );
}
```

---

### 5. ImageOverlay Component (NEW)

**File:** `/remotion/src/components/ImageOverlay.tsx`  
**Lines:** ~80 lines  
**Purpose:** Render Brave images as overlays with effects

**Key Features:**
- Ken Burns effect (pan + zoom)
- Blur background effect
- Fade in/out transitions
- Configurable position and opacity
- Fallback if image fails to load

**Component:**
```typescript
interface ImageOverlayProps {
  imageUrl: string;
  duration: number; // frames
  effect: 'zoom' | 'blur' | 'ken-burns' | 'fade';
  position: 'center' | 'top' | 'bottom';
  opacity: number; // 0-1
}

export const ImageOverlay: React.FC<ImageOverlayProps> = ({
  imageUrl,
  duration,
  effect,
  position,
  opacity
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Ken Burns effect: slow zoom + pan
  const kenBurnsTransform = interpolate(
    frame,
    [0, duration],
    [1, 1.2], // Scale from 1x to 1.2x
    { extrapolateRight: 'clamp' }
  );
  
  // Blur effect: animate blur radius
  const blurAmount = effect === 'blur'
    ? interpolate(frame, [0, 10, duration - 10, duration], [20, 5, 5, 20])
    : 0;
  
  // Fade effect
  const fadeOpacity = effect === 'fade'
    ? interpolate(
        frame,
        [0, 10, duration - 10, duration],
        [0, opacity, opacity, 0]
      )
    : opacity;
  
  return (
    <AbsoluteFill
      style={{
        justifyContent: position === 'top' ? 'flex-start' :
                       position === 'bottom' ? 'flex-end' :
                       'center',
        alignItems: 'center',
        opacity: fadeOpacity,
        zIndex: 5 // Above video background, below text
      }}
    >
      <Img
        src={imageUrl}
        style={{
          width: '100%',
          height: '60%', // Cover 60% of frame
          objectFit: 'cover',
          filter: `blur(${blurAmount}px)`,
          transform: effect === 'ken-burns' 
            ? `scale(${kenBurnsTransform})`
            : undefined,
          transition: 'transform 0.5s ease-out'
        }}
      />
    </AbsoluteFill>
  );
};
```

---

### 6. Updated Orchestrator

**File:** `/src/services/studio/agents/orchestrator.ts`  
**Changes:** ~100 lines modified

**New Workflow:**
```typescript
async function orchestrateArtifact(prompt, onProgress, outputType) {
  // Steps 1-4: Same as before (analyze, ideas, script, scenes)
  
  // Step 5: Fetch all assets in PARALLEL
  const [videoAssets, imageAssets, audioAssets] = await Promise.all([
    videoAssetAgent.assignSingleVideo(sceneStructure, format, prompt),
    imageAssetAgent.assignImageOverlays(sceneStructure, 'key-points'), // NEW
    audioAssetAgent.generateAudio(sceneStructure, 'full-narration', 'nova')
  ]);
  
  // Merge all assets into scene structure
  const enrichedScenes = mergeAssets(sceneStructure, {
    videos: videoAssets,
    images: imageAssets,
    audio: audioAssets
  });
  
  // Step 6: Plan chunks
  const chunks = chunkPlanner.planChunks(enrichedScenes, 7); // 7-second chunks
  
  // Step 7: Render chunks progressively
  const chunkResults = await chunkedRenderer.renderChunks(
    chunks,
    format,
    videoId,
    { accentColor: '#3b82f6' },
    (chunkId, chunkUrl, progress) => {
      // Update UI as each chunk completes
      onProgress({
        ...currentState,
        chunkResults: [...existingChunks, { chunkId, chunkUrl }],
        renderProgress: progress
      });
    }
  );
  
  return {
    ...result,
    chunks: chunkResults,
    playbackMode: 'progressive'
  };
}
```

**New Plan Steps:**
```typescript
function generatePlan(): PlanDetail[] {
  return [
    { step: 'Analyze question', detail: '...' },
    { step: 'Generate key ideas', detail: '...' },
    { step: 'Create script', detail: '...' },
    { step: 'Generate scenes', detail: '...' },
    { step: 'Fetch assets', detail: 'Getting videos, images, and audio' }, // Modified
    { step: 'Plan chunks', detail: 'Splitting into 5-10s segments' }, // NEW
    { step: 'Render chunks', detail: 'Progressive rendering' }, // Modified
  ];
}
```

---

## Updated Types

**File:** `/src/services/studio/types.ts`

```typescript
// Brave Image Search types
export interface BraveImage {
  url: string;
  title: string;
  source: string;
  thumbnail: string;
  width: number;
  height: number;
}

// Video chunk types
export interface VideoChunk {
  id: string;
  index: number;
  startFrame: number;
  endFrame: number;
  duration: number;
  scenes: VideoScene[];
  priority: 'high' | 'normal';
}

export interface ChunkRenderResult {
  chunkId: string;
  chunkUrl: string;
  status: 'complete' | 'rendering' | 'failed' | 'pending';
  error?: string;
}

// Updated VideoScene interface
export interface VideoScene {
  from: number;
  to: number;
  text: string;
  style: SceneStyle;
  chapter?: string;
  
  // Phase 4: Video backgrounds
  videoUrl?: string;
  videoKeywords?: string;
  
  // Phase 5: Audio narration
  audioUrl?: string;
  audioDuration?: number;
  audioVoice?: TTSVoice;
  
  // Phase 6: Image overlays (NEW)
  imageUrl?: string;
  imageKeywords?: string;
  imageEffect?: 'zoom' | 'blur' | 'ken-burns' | 'fade';
  imageDuration?: number;
  imagePosition?: 'center' | 'top' | 'bottom';
  imageOpacity?: number;
}

// Audio strategy updated
export type AudioStrategy = 'per-scene' | 'full-narration' | 'per-chunk' | 'none';

// Rendering modes
export type RenderMode = 'full' | 'chunked' | 'preview';
export type PlaybackMode = 'progressive' | 'complete';
```

---

## Remotion Components Updates

### StudioChunk Composition (NEW)

**File:** `/remotion/src/StudioChunk.tsx`  
**Purpose:** Render a single chunk (subset of scenes)

```typescript
interface StudioChunkProps {
  chunk: VideoChunk;
  format: 'vertical' | 'horizontal';
  accentColor: string;
}

export const StudioChunk: React.FC<StudioChunkProps> = ({
  chunk,
  format,
  accentColor
}) => {
  const { fps } = useVideoConfig();
  
  return (
    <AbsoluteFill>
      {chunk.scenes.map((scene, index) => {
        // Adjust frame numbers relative to chunk start
        const relativeFrom = scene.from - chunk.startFrame;
        const relativeTo = scene.to - chunk.startFrame;
        const duration = relativeTo - relativeFrom;
        
        return (
          <Sequence
            key={`scene-${index}`}
            from={relativeFrom}
            durationInFrames={duration}
          >
            {/* Video background */}
            <VideoBackground 
              videoUrl={scene.videoUrl}
              format={format}
              accentColor={accentColor}
            />
            
            {/* Image overlay (NEW) */}
            {scene.imageUrl && (
              <ImageOverlay
                imageUrl={scene.imageUrl}
                duration={scene.imageDuration || duration}
                effect={scene.imageEffect || 'fade'}
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
            
            {/* Audio narration */}
            {scene.audioUrl && (
              <AudioTrack 
                audioUrl={scene.audioUrl}
                startFrom={relativeFrom}
              />
            )}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
```

---

## Implementation Phases

### Phase 6A: Brave Image Search Integration (Week 1)

**Tasks:**
1. ✅ Create ImageAssetAgent service
2. ✅ Implement query engineering logic
3. ✅ Add image assignment strategies
4. ✅ Update VideoScene types
5. ✅ Create ImageOverlay Remotion component
6. ✅ Update orchestrator to fetch images
7. ✅ Test image search and display

**Testing:**
- Search images for test query
- Verify query engineering produces good results
- Check image overlay renders correctly
- Test fallback when no API key

---

### Phase 6B: Chunked Rendering (Week 2)

**Tasks:**
1. ✅ Create ChunkPlanner service
2. ✅ Implement sentence boundary detection
3. ✅ Create ChunkedRenderer service
4. ✅ Build Netlify function for chunk rendering
5. ✅ Implement Supabase Storage upload
6. ✅ Update orchestrator for chunked workflow
7. ✅ Test chunk generation and upload

**Testing:**
- Verify chunks don't split mid-sentence
- Test parallel rendering (3 chunks at once)
- Check serverless function doesn't timeout
- Verify chunk uploads to storage

---

### Phase 6C: Progressive Playback (Week 3)

**Tasks:**
1. ✅ Create ProgressivePlayer component
2. ✅ Implement chunk buffering logic
3. ✅ Add seamless chunk transitions
4. ✅ Create rendering progress UI
5. ✅ Update StudioResults to use ProgressivePlayer
6. ✅ Test progressive playback experience
7. ✅ Add fallback for failed chunks

**Testing:**
- Start playback with first chunk
- Verify smooth transitions between chunks
- Test buffering of next chunks
- Check UI updates as chunks render
- Test error handling

---

## Performance Optimizations

### Parallel Asset Fetching
```typescript
// Before: Sequential (slow)
const videoAssets = await videoAssetAgent.assign(...);
const audioAssets = await audioAssetAgent.generate(...);
// Total: 5-10 seconds

// After: Parallel (fast)
const [videoAssets, imageAssets, audioAssets] = await Promise.all([
  videoAssetAgent.assign(...),
  imageAssetAgent.assign(...),
  audioAssetAgent.generate(...)
]);
// Total: 3-5 seconds (fastest operation)
```

### Chunk Prioritization
```typescript
// Render high-priority chunks first (hook, key points)
// User can start watching while rest renders

Priority 1 (render first): Chunk 0 (hook) - 0-7s
Priority 1 (render first): Chunk 2 (key point) - 14-21s
Priority 2 (render after): Chunk 1 (explanation) - 7-14s
Priority 2 (render after): Chunk 3 (conclusion) - 21-30s
```

### Serverless-Friendly Architecture
```typescript
// Each function call: <10 seconds (well under Netlify 10s limit)
// Each chunk: 5-10 seconds of video
// Function execution: 3-7 seconds (rendering + upload)

// Before: 60s video = 1 function call = 45-60s execution = TIMEOUT
// After: 60s video = 8 chunks = 8 × 7s = 56s total, but parallel
//        Actual wall time: ~20s (3 chunks at a time)
```

---

## Configuration

### Environment Variables
```bash
# .env.local

# Required (existing)
VITE_OPENAI_API_KEY=sk-...
VITE_PEXELS_API_KEY=...

# Required (new)
BRAVE_API_KEY=...  # For Brave Image Search

# Optional (chunked rendering)
CHUNK_TARGET_DURATION=7  # seconds
MAX_PARALLEL_CHUNKS=3
ENABLE_PROGRESSIVE_PLAYBACK=true
```

### Orchestrator Options
```typescript
// In orchestrator.ts or Studio UI settings
const renderOptions = {
  // Image overlay strategy
  imageStrategy: 'key-points', // 'key-points' | 'all-scenes' | 'none'
  
  // Chunked rendering
  enableChunking: true,
  chunkDuration: 7, // seconds
  maxParallelChunks: 3,
  
  // Playback mode
  enableProgressivePlayback: true,
  
  // Render quality
  renderQuality: 'balanced', // 'fast' | 'balanced' | 'high'
};
```

---

## API Cost Estimates

### Brave Image Search Pricing
- **Brave Search API:** $5 per 1,000 queries
- **Images per video:** 2-3 queries (key points strategy)
- **Cost per video:** $0.01 - $0.015

### Combined API Costs (Per Video)
| Service | Queries | Cost |
|---------|---------|------|
| OpenAI (content) | 1 | $0.02 |
| OpenAI (TTS) | 1 | $0.01 |
| Pexels (video) | 1 | Free |
| **Brave (images)** | 2-3 | **$0.01** |
| **Total** | - | **$0.04** |

**Note:** Chunked rendering doesn't increase API costs (same content, just split differently)

---

## Testing Strategy

### Unit Tests
```typescript
// ImageAssetAgent
describe('ImageAssetAgent', () => {
  it('should engineer queries with mood + action + metaphor', () => {
    const query = agent.engineerQuery(scene);
    expect(query).toContain('empty office');
    expect(query).toContain('uncertain');
  });
  
  it('should assign images to key-point scenes only', async () => {
    const result = await agent.assignImageOverlays(scenes, 'key-points');
    const withImages = result.scenes.filter(s => s.imageUrl);
    expect(withImages.length).toBeLessThan(scenes.length);
  });
});

// ChunkPlanner
describe('ChunkPlanner', () => {
  it('should split at sentence boundaries', () => {
    const chunks = planner.planChunks(scenes, 7);
    chunks.forEach(chunk => {
      const lastScene = chunk.scenes[chunk.scenes.length - 1];
      expect(lastScene.text).toMatch(/[.!?]\s*$/);
    });
  });
  
  it('should create chunks near target duration', () => {
    const chunks = planner.planChunks(scenes, 7);
    chunks.forEach(chunk => {
      expect(chunk.duration).toBeGreaterThan(5);
      expect(chunk.duration).toBeLessThan(12);
    });
  });
});
```

### Integration Tests
```typescript
// End-to-end chunked rendering
describe('Studio Chunked Rendering', () => {
  it('should generate video in chunks progressively', async () => {
    const results = await orchestrateArtifact(prompt, onProgress, 'video');
    
    // Check chunks generated
    expect(results.chunks).toBeDefined();
    expect(results.chunks.length).toBeGreaterThan(0);
    
    // Check each chunk has URL
    results.chunks.forEach(chunk => {
      expect(chunk.chunkUrl).toBeTruthy();
      expect(chunk.status).toBe('complete');
    });
    
    // Check playback mode
    expect(results.playbackMode).toBe('progressive');
  });
});
```

### Manual Testing Checklist
- [ ] Generate video with Brave images
- [ ] Verify image overlays appear at key points
- [ ] Check image effects (zoom, blur, Ken Burns)
- [ ] Test chunked rendering (3 chunks in parallel)
- [ ] Verify no mid-sentence splits
- [ ] Test progressive playback (play while rendering)
- [ ] Check smooth chunk transitions
- [ ] Verify serverless functions don't timeout
- [ ] Test without Brave API key (graceful fallback)
- [ ] Check final video quality

---

## Migration from Phase 5 to Phase 6

### Backward Compatibility
Phase 6 maintains full backward compatibility with Phase 5:

```typescript
// Phase 5 mode (still works)
const video = await orchestrateArtifact(prompt, onProgress, 'video');
// Returns: Full video with audio, single render

// Phase 6 mode (opt-in)
const video = await orchestrateArtifact(prompt, onProgress, 'video', {
  enableChunking: true,
  imageStrategy: 'key-points'
});
// Returns: Chunked video with images, progressive playback
```

### Gradual Migration
1. **Week 1:** Enable Brave images (optional)
2. **Week 2:** Enable chunked rendering (opt-in via feature flag)
3. **Week 3:** Enable progressive playback (default for new videos)
4. **Week 4:** Make chunked rendering default

---

## Success Metrics

### Performance Targets
- ✅ First chunk ready: <15 seconds (user can start watching)
- ✅ Full video ready: <60 seconds (6 chunks × 10s avg)
- ✅ Serverless functions: <10 seconds each (no timeouts)
- ✅ Parallel rendering: 3 chunks at once

### Quality Targets
- ✅ No mid-sentence splits: 100% (validation check)
- ✅ Image relevance: >80% (manual review)
- ✅ Smooth chunk transitions: Seamless (no visible cuts)
- ✅ Progressive playback: Works without buffering issues

### Cost Targets
- ✅ API cost per video: <$0.05 (including images)
- ✅ Storage cost: <$0.01 per video (Supabase)
- ✅ Bandwidth: Minimal (chunks cached)

---

## Future Enhancements (Phase 7+)

### Short-term
- [ ] Chunk stitching for final MP4 download
- [ ] Image search result caching (reduce API calls)
- [ ] Adaptive chunk size based on content
- [ ] Background music integration

### Medium-term
- [ ] User-selectable image styles
- [ ] Custom image upload support
- [ ] Multiple image sources (Unsplash, Pixabay)
- [ ] Advanced image effects (particles, overlays)

### Long-term
- [ ] Real-time collaborative editing
- [ ] Live preview while generating
- [ ] AI-powered image selection (quality scoring)
- [ ] Dynamic chunk optimization (learn from user behavior)

---

## Summary

Phase 6 transforms Studio from a monolithic video generator into a sophisticated, serverless-friendly system with:

1. **Brave Image Search** - Supporting evidence overlays with engineered queries
2. **Chunked Rendering** - 5-10s segments, parallel generation, no timeouts
3. **Progressive Playback** - Start watching immediately, render continues in background

**Key Benefits:**
- ⚡ Faster time-to-first-frame (15s vs 60s)
- 🚀 Parallel rendering (3x speed improvement)
- 💰 Serverless-friendly (no timeouts)
- 🎨 Richer visuals (videos + images + audio)
- 📱 Better UX (progressive loading)

**Implementation Roadmap:**
- Week 1: Brave Image Search Integration
- Week 2: Chunked Rendering
- Week 3: Progressive Playback
- Week 4: Testing & Optimization

**Phase 6 is ready to begin! 🚀📹**
