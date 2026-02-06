# Phase 6 Quick Start Guide

## Overview
Phase 6 adds three major features to Studio video generation:
1. **Image Overlays** (6A) - Brave Search images as supporting evidence
2. **Chunked Rendering** (6B) - Split videos into 5-10s chunks
3. **Progressive Playback** (6C) - Watch while rendering

---

## Quick Reference

### Enable/Disable Features

#### Image Overlays (Phase 6A)
```typescript
// Enabled automatically if SUPABASE_URL and SUPABASE_ANON_KEY are set
// The Brave API key is configured in Supabase Edge Function

// Check if enabled:
const imageAgent = new ImageAssetAgent();
if (imageAgent.isEnabled()) {
  console.log('✓ Image overlays enabled');
}

// Disable by passing 'none' strategy:
const assets = await imageAgent.assignImageOverlays(scenes, 'none');
```

#### Chunked Rendering (Phase 6B)
```typescript
// Always available, no API key required
import { ChunkPlanner, ChunkedRenderer } from './rendering';

// Plan chunks
const planner = new ChunkPlanner(7); // 7s target duration
const plan = planner.planChunks(sceneStructure);

// Render chunks
const renderer = new ChunkedRenderer(3); // 3 parallel chunks
const results = await renderer.renderChunks(plan.chunks, format, videoId);
```

#### Progressive Playback (Phase 6C)
```typescript
// Add to your Studio UI component:
import { ProgressivePlayer } from '@/components/studio/ProgressivePlayer';

{chunkResults && renderProgress && (
  <ProgressivePlayer
    chunks={chunkResults}
    renderProgress={renderProgress}
    format={format}
    onComplete={() => console.log('Done!')}
  />
)}
```

---

## Configuration

### Rate Limits
```typescript
// In imageAssetAgent.ts
const BRAVE_IMAGE_DELAY = 1000; // ms between requests

// To change:
private delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Usage:
await this.delay(1000); // Wait 1 second
```

### Chunk Settings
```typescript
// In ChunkPlanner constructor:
const planner = new ChunkPlanner(targetDuration);

// Recommended durations:
new ChunkPlanner(6);  // For videos < 30s
new ChunkPlanner(7);  // For videos 30-60s
new ChunkPlanner(8);  // For videos 60-90s
new ChunkPlanner(10); // For videos > 90s

// Or use static helper:
const duration = ChunkPlanner.getRecommendedChunkDuration(videoLengthInSeconds);
```

### Image Strategy
```typescript
// key-points: 2-3 images (recommended)
const assets = await imageAgent.assignImageOverlays(scenes, 'key-points');

// all-scenes: Every scene except hook/outro
const assets = await imageAgent.assignImageOverlays(scenes, 'all-scenes');

// none: No images
const assets = await imageAgent.assignImageOverlays(scenes, 'none');

// Auto-select based on video duration:
const strategy = imageAgent.getRecommendedStrategy(scenes);
```

### Parallel Rendering
```typescript
// Change max parallel chunks:
const renderer = new ChunkedRenderer(maxParallel);

// Examples:
new ChunkedRenderer(1); // Sequential (slow)
new ChunkedRenderer(3); // Default (balanced)
new ChunkedRenderer(5); // Aggressive (requires more resources)
```

---

## Common Use Cases

### 1. Basic Video with Images
```typescript
// Generate scene structure
const scenes = sceneGenerator.generateScenes(script, 30);

// Fetch assets in parallel
const [videoAssets, imageAssets] = await Promise.all([
  videoAssetAgent.assignSingleVideo(scenes, format),
  imageAssetAgent.assignImageOverlays(scenes, 'key-points')
]);

// Merge assets
const enrichedScenes = scenes.map((scene, i) => ({
  ...scene,
  videoUrl: videoAssets.scenes[i]?.videoUrl,
  imageUrl: imageAssets.scenes[i]?.imageUrl,
  imageEffect: imageAssets.scenes[i]?.imageEffect,
  imageDuration: imageAssets.scenes[i]?.imageDuration,
  imagePosition: imageAssets.scenes[i]?.imagePosition,
  imageOpacity: imageAssets.scenes[i]?.imageOpacity
}));

// Render normally (full video)
const videoUrl = await renderer.renderVideo(enrichedScenes, format, videoId);
```

### 2. Chunked Rendering with Progress
```typescript
// Plan chunks
const planner = new ChunkPlanner();
const plan = planner.planChunks(enrichedScenes);

console.log('Chunk plan:', {
  totalChunks: plan.totalChunks,
  avgDuration: plan.averageChunkDuration,
  sentenceCompliance: (plan.sentenceBoundaryCompliance * 100).toFixed(1) + '%'
});

// Render chunks with progress
const renderer = new ChunkedRenderer(3);
const results = [];

await renderer.renderChunks(
  plan.chunks,
  format,
  videoId,
  { quality: 'balanced' },
  (result, progress) => {
    results.push(result);
    
    console.log('Chunk complete:', {
      chunkId: result.chunkId,
      status: result.status,
      progress: progress.percentComplete.toFixed(1) + '%'
    });
    
    // Update UI with progress
    onProgress({ chunkResults: results, renderProgress: progress });
  }
);
```

### 3. Progressive Playback
```typescript
// In your React component:
const [chunkResults, setChunkResults] = useState<ChunkRenderResult[]>([]);
const [renderProgress, setRenderProgress] = useState<RenderProgress | null>(null);

// During rendering:
await renderer.renderChunks(
  plan.chunks,
  format,
  videoId,
  {},
  (result, progress) => {
    setChunkResults(prev => [...prev, result]);
    setRenderProgress(progress);
  }
);

// In JSX:
{chunkResults.length > 0 && renderProgress && (
  <ProgressivePlayer
    chunks={chunkResults}
    renderProgress={renderProgress}
    format={format}
    onComplete={() => {
      console.log('All chunks played!');
      // Show completion message, enable download, etc.
    }}
  />
)}
```

### 4. Retry Failed Chunks
```typescript
// After initial rendering:
const stats = renderer.getRenderStatistics(results);

if (stats.failed > 0) {
  console.warn(`${stats.failed} chunks failed, retrying...`);
  
  const retryResults = await renderer.retryFailedChunks(
    plan.chunks,
    format,
    videoId
  );
  
  console.log(`Retry complete: ${retryResults.length} chunks`);
}
```

### 5. Custom Image Effect per Scene
```typescript
// Override default effect:
const scenesWithCustomEffects = scenes.map(scene => ({
  ...scene,
  imageEffect: scene.style === 'hook' ? 'zoom' : 
               scene.style === 'takeaway' ? 'fade' :
               'ken-burns' // Default for explain/outro
}));
```

---

## Debugging

### Check Asset Status
```typescript
// After asset fetching:
console.log('Asset Summary:', {
  totalVideos: videoAssets.totalVideos,
  totalImages: imageAssets.totalImages,
  failedVideoScenes: videoAssets.failedScenes,
  failedImageScenes: imageAssets.failedScenes
});

// Check specific scene:
const scene = enrichedScenes[2];
console.log('Scene 2:', {
  hasVideo: !!scene.videoUrl,
  hasImage: !!scene.imageUrl,
  imageEffect: scene.imageEffect,
  imageKeywords: scene.imageKeywords
});
```

### Validate Chunk Plan
```typescript
const plan = planner.planChunks(scenes);
const validation = planner.validateChunkPlan(plan);

if (!validation.isValid) {
  console.error('Invalid chunk plan:', validation.errors);
}

const stats = planner.getChunkStatistics(plan.chunks);
console.log('Chunk Statistics:', {
  total: stats.totalChunks,
  highPriority: stats.highPriorityChunks,
  withImages: stats.chunksWithImages,
  avgDuration: stats.averageDuration.toFixed(2),
  minDuration: stats.minDuration.toFixed(2),
  maxDuration: stats.maxDuration.toFixed(2)
});
```

### Check Rendering Progress
```typescript
// During rendering:
const progress = renderer.getProgress(plan.totalChunks);

console.log('Rendering Progress:', {
  completed: progress.completed,
  inProgress: progress.inProgress,
  failed: progress.failed,
  pending: progress.pending,
  percentComplete: progress.percentComplete.toFixed(1) + '%'
});

// Estimate time remaining:
const avgTime = 5000; // 5s per chunk (example)
const remaining = renderer.getEstimatedTimeRemaining(plan.chunks, avgTime);
console.log(`Estimated ${remaining / 1000}s remaining`);
```

### Image Query Engineering Test
```typescript
// Test query engineering:
const braveService = new BraveImageService();

const sceneText = "Leaving your comfort zone can feel uncertain";
const mood = "uncertain";

// Generate query
const query = braveService['engineerQuery'](sceneText, mood);
console.log('Generated query:', query);
// Expected: "office workplace leaving departing uncertain editorial photography"

// Search for images
const images = await braveService.searchForScene(sceneText, mood, { count: 5 });
console.log('Found images:', images.length);

// Score images
images.forEach(img => {
  const score = braveService['scoreImage'](img);
  console.log(`${img.title}: ${score} points`);
});
```

---

## Performance Tips

### 1. Optimize Rate Limits
```typescript
// If you have higher API limits, reduce delays:
// In imageAssetAgent.ts line 146, 227, 317:
await this.delay(500); // Instead of 1000ms

// Balance: faster generation vs rate limit errors
```

### 2. Adjust Chunk Size
```typescript
// For faster initial playback (smaller first chunk):
const firstChunkDuration = 5; // 5s
const restChunkDuration = 8;  // 8s

// Manually create chunks with custom durations
// (advanced use case)
```

### 3. Preload Next Chunk
```typescript
// In ProgressivePlayer, add preloading:
useEffect(() => {
  if (nextChunk && nextChunk.status === 'complete') {
    const video = document.createElement('video');
    video.src = nextChunk.chunkUrl;
    video.load(); // Preload for smoother transition
  }
}, [nextChunk]);
```

### 4. Reduce Image Count
```typescript
// Fetch fewer images per scene for faster processing:
const images = await braveService.searchForScene(text, mood, { count: 3 });
// Default is 5, can reduce to 3 for speed
```

---

## Troubleshooting

### Issue: Rate limit errors from Brave API
**Solution**: Rate limiting updated to 1000ms (already implemented)
```typescript
// Already fixed in imageAssetAgent.ts:
await this.delay(1000); // Lines 146, 227, 317
```

### Issue: Chunks split mid-sentence
**Check**: Sentence boundary compliance
```typescript
const plan = planner.planChunks(scenes);
console.log('Compliance:', (plan.sentenceBoundaryCompliance * 100).toFixed(1) + '%');
// Should be >= 70%
```

### Issue: Progressive player doesn't auto-start
**Cause**: Browser autoplay policy
**Solution**: Add user gesture
```typescript
// Add a "Start Video" button
<button onClick={() => setIsPlaying(true)}>
  Start Video
</button>
```

### Issue: Images not appearing
**Check**:
1. Supabase config: `SUPABASE_URL` and `SUPABASE_ANON_KEY`
2. Edge function deployed: `/functions/v1/brave-images-search`
3. Brave API key set in Supabase dashboard
4. Image strategy not set to 'none'

### Issue: Chunks not rendering in parallel
**Check**: maxParallelChunks setting
```typescript
const renderer = new ChunkedRenderer(3); // Should be 3
console.log('Max parallel:', renderer['maxParallelChunks']);
```

---

## API Cost Estimation

### Brave Image Search (Phase 6A)
- **Pricing**: $5 per 1,000 queries
- **Usage**: 2-3 queries per video (key-points strategy)
- **Cost per video**: ~$0.01
- **Monthly estimate**: 1,000 videos = $10

### OpenAI TTS (Phase 5)
- **Pricing**: $15 per 1M characters
- **Usage**: ~500 characters per 30s video
- **Cost per video**: ~$0.0075
- **Monthly estimate**: 1,000 videos = $7.50

### Pexels API (Phase 4)
- **Pricing**: Free (200 requests/hour)
- **Usage**: 1 request per video
- **Cost**: $0

**Total**: ~$0.02 per 30-second video

---

## File Locations Reference

### Phase 6A Files
- `/src/services/studio/assets/braveImageService.ts`
- `/src/services/studio/assets/imageAssetAgent.ts`
- `/remotion/src/components/ImageOverlay.tsx`

### Phase 6B Files
- `/src/services/studio/rendering/chunkPlanner.ts`
- `/src/services/studio/rendering/chunkedRenderer.ts`
- `/remotion/src/StudioChunk.tsx`

### Phase 6C Files
- `/src/components/studio/ProgressivePlayer.tsx`

### Documentation
- `/docs/architecture/STUDIO_PHASE6_REFACTOR.md`
- `/docs/architecture/STUDIO_IMPLEMENTATION_GUIDE.md`
- `/docs/testing/PHASE6A_TESTING_GUIDE.md`
- `/docs/testing/PHASE6C_TESTING_GUIDE.md`
- `/docs/status/PHASE6_COMPLETE.md`

### Modified Files
- `/src/services/studio/types.ts` (image and chunk types)
- `/remotion/src/StudioVideo.tsx` (ImageOverlay rendering)
- `/src/services/studio/agents/orchestrator.ts` (parallel assets, chunks)

---

## Next Steps

1. **Test in Browser**: Generate a video and verify progressive playback
2. **Server-Side Rendering**: Implement Netlify function for chunk rendering
3. **Storage Integration**: Upload chunks to Supabase Storage
4. **Download Feature**: Stitch chunks with FFmpeg for final download
5. **Production Deploy**: Update environment variables and deploy

---

## Support

For questions or issues:
1. Check documentation in `/docs/`
2. Review testing guides in `/docs/testing/`
3. Check console logs for error messages
4. Verify all environment variables are set
5. Ensure API keys are valid and have sufficient quota

**Phase 6 Status**: ✅ **100% Complete**
