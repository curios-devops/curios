# Phase 6C Testing Guide: Progressive Playback

## Overview
Phase 6C adds progressive playback capabilities - watch video chunks as they render without waiting for the entire video to complete. This phase is built on top of Phase 6A (Brave Images) and Phase 6B (Chunked Rendering).

## Architecture

### Components
1. **ProgressivePlayer** (`/src/components/studio/ProgressivePlayer.tsx`)
   - Real-time video player with chunk streaming
   - Auto-plays first chunk when ready
   - Buffers when waiting for next chunk
   - Shows rendering progress and chunk status

2. **ChunkedRenderer** (already created in 6B)
   - Renders chunks in parallel (3 at once)
   - Returns chunk URLs as they complete
   - Tracks progress and status

3. **ChunkPlanner** (already created in 6B)
   - Splits video into 5-10s chunks
   - Respects sentence boundaries
   - Prioritizes hook/takeaway/images

## Key Features

### 1. Progressive Playback
- **Auto-Start**: Begins playing as soon as first chunk is ready
- **Seamless Transitions**: Automatically advances to next chunk
- **Smart Buffering**: Pauses and shows loading when next chunk isn't ready
- **Resume**: Auto-resumes playback when chunk becomes available

### 2. Visual Feedback
- **Chunk Pills**: Top bar shows status of all chunks (pending/rendering/complete/failed)
- **Current Indicator**: Highlighted pill shows which chunk is playing
- **Progress Bar**: Shows overall completion (X of Y chunks ready)
- **Rendering Stats**: Cards showing completed/rendering/pending counts

### 3. Playback Controls
- **Play/Pause**: Standard video controls
- **Mute/Unmute**: Audio toggle
- **Buffering State**: Loading spinner when waiting
- **Chunk Counter**: "Chunk X of Y" display

### 4. Status Indicators
```
Blue Pill (larger)     = Currently playing
White Pill             = Completed, ready to play
Yellow Pill (pulsing)  = Currently rendering
Gray Pill              = Pending (not started)
Red Pill               = Failed to render
```

## Testing Procedures

### Test 1: Basic Progressive Playback
**Goal**: Verify video starts playing before all chunks are complete

**Steps**:
1. Generate a 30-second video
2. Observe ProgressivePlayer component
3. Verify first chunk starts playing within 5-10 seconds
4. Watch subsequent chunks load and play seamlessly

**Expected Results**:
```typescript
// Console logs should show:
[Chunked Renderer] Starting chunk rendering
  totalChunks: 4
  maxParallel: 3

[Chunked Renderer] Rendering batch
  batchNumber: 1
  chunkIndices: [0, 1, 2]

[Chunked Renderer] Chunk complete
  chunkId: 'chunk_0'
  renderTime: '3200ms'

// Player should:
// ✓ Auto-start playback of chunk 0
// ✓ Blue pill on chunk 0
// ✓ Yellow pills on chunks 1-2 (rendering)
// ✓ Gray pill on chunk 3 (pending)
```

**Success Criteria**:
- ✅ Video starts playing within 10 seconds
- ✅ No manual play button click required
- ✅ Chunk pills show correct status
- ✅ Progress bar updates in real-time

### Test 2: Buffering Behavior
**Goal**: Verify player handles waiting for chunks gracefully

**Steps**:
1. Generate a 60-second video (8-10 chunks)
2. Watch chunk 0 play completely
3. Observe behavior when chunk 1 isn't ready yet

**Expected Results**:
```typescript
// Should see buffering state:
{
  currentChunkIndex: 1,
  buffering: true,
  isPlaying: false
}

// Visual feedback:
// ✓ "Loading next chunk..." overlay
// ✓ Spinning loader icon
// ✓ Video paused
// ✓ Play button disabled
```

**Success Criteria**:
- ✅ Player shows buffering overlay
- ✅ No errors or crashes
- ✅ Auto-resumes when chunk 1 completes
- ✅ Smooth transition to chunk 1

### Test 3: Chunk Status Tracking
**Goal**: Verify all chunk states are displayed correctly

**Steps**:
1. Start video generation
2. Monitor chunk pills at top of player
3. Check stats cards (completed/rendering/pending)

**Expected Visual States**:
```
Time 0s:  [gray] [gray] [gray] [gray]     0 completed, 0 rendering, 4 pending
Time 5s:  [yellow] [yellow] [yellow] [gray]  0 completed, 3 rendering, 1 pending
Time 10s: [blue] [white] [white] [yellow]    3 completed, 1 rendering, 0 pending
Time 15s: [white] [blue] [white] [white]     4 completed, 0 rendering, 0 pending
```

**Success Criteria**:
- ✅ Pill colors match chunk status
- ✅ Currently playing chunk is highlighted (blue, larger)
- ✅ Stats cards update in real-time
- ✅ Progress bar shows accurate percentage

### Test 4: Playback Controls
**Goal**: Verify user controls work correctly

**Steps**:
1. Start progressive playback
2. Test play/pause button
3. Test mute/unmute button
4. Try pausing/resuming during buffering

**Expected Behavior**:
```typescript
// Play/Pause should:
// ✓ Toggle video playback
// ✓ Update button icon (Play ⇄ Pause)
// ✓ Disabled when chunk not ready

// Mute/Unmute should:
// ✓ Toggle audio
// ✓ Update button icon (Volume2 ⇄ VolumeX)
// ✓ Persist across chunk transitions
```

**Success Criteria**:
- ✅ Play/pause works on ready chunks
- ✅ Controls disabled when buffering
- ✅ Audio state persists across chunks
- ✅ No audio glitches between chunks

### Test 5: Completion Handling
**Goal**: Verify video completion is handled correctly

**Steps**:
1. Watch full video until last chunk
2. Observe behavior when final chunk ends
3. Check if onComplete callback fires

**Expected Results**:
```typescript
// When last chunk ends:
// ✓ isPlaying becomes false
// ✓ onComplete() callback fires
// ✓ All chunks show white pills
// ✓ Stats show "All chunks ready"
// ✓ Play button available to replay
```

**Success Criteria**:
- ✅ Video stops at end (doesn't loop)
- ✅ Completion callback fires
- ✅ User can replay by clicking play
- ✅ No console errors

### Test 6: Error Handling
**Goal**: Verify failed chunks are handled gracefully

**Scenario**: Simulate a chunk render failure

**Expected Behavior**:
```typescript
// Failed chunk should:
// ✓ Show red pill
// ✓ Not block playback of other chunks
// ✓ Skip to next available chunk
// ✓ Log error but continue

// Console:
[Chunked Renderer] Chunk render failed
  chunkId: 'chunk_2'
  error: 'Network timeout'
```

**Success Criteria**:
- ✅ Failed chunk marked with red pill
- ✅ Playback continues with available chunks
- ✅ No crash or infinite loop
- ✅ Error logged for debugging

## Integration with Existing System

### Add ProgressivePlayer to Studio UI

**In your Studio component** (e.g., `/src/components/studio/StudioOutputDisplay.tsx`):

```typescript
import { ProgressivePlayer } from './ProgressivePlayer';

// When using chunked rendering:
{chunkResults && renderProgress && (
  <ProgressivePlayer
    chunks={chunkResults}
    renderProgress={renderProgress}
    format={format}
    onComplete={() => {
      console.log('Video playback complete!');
      // Optional: Show completion message, enable download, etc.
    }}
  />
)}
```

### Update Orchestrator to Use Chunked Rendering

**In orchestrator.ts** (already partially updated):

```typescript
// After audio generation, add chunked rendering steps:

// Step 7: Plan chunks
await executeStep(steps, 6, onProgress, { ... });

const chunkPlanner = new ChunkPlanner();
const chunkPlan = chunkPlanner.planChunks(finalSceneStructure);

logger.info('[Orchestrator] Chunk plan created', {
  totalChunks: chunkPlan.totalChunks,
  avgDuration: chunkPlan.averageChunkDuration.toFixed(2),
  sentenceCompliance: (chunkPlan.sentenceBoundaryCompliance * 100).toFixed(1) + '%'
});

// Step 8: Render chunks (parallel)
const chunkedRenderer = new ChunkedRenderer(3); // Max 3 parallel

const chunkResults: ChunkRenderResult[] = [];
await chunkedRenderer.renderChunks(
  chunkPlan.chunks,
  format,
  videoId,
  { quality: 'balanced' },
  (result, progress) => {
    // Update progress for each chunk
    chunkResults.push(result);
    
    onProgress({
      ...currentState,
      chunkResults,
      renderProgress: progress
    });
  }
);
```

## Performance Metrics

### Target Performance
- **Time to First Chunk**: < 10 seconds
- **Time Between Chunks**: < 2 seconds (buffering)
- **Parallel Rendering**: 3 chunks at once
- **Memory Usage**: < 500MB per chunk

### Expected Timeline for 30s Video
```
0s:  [Start generation]
3s:  [Script complete]
5s:  [Assets fetched]
7s:  [Audio generated]
8s:  [Chunks planned: 4 chunks × 7.5s each]
10s: [Chunk 0 complete] ← VIDEO STARTS PLAYING
13s: [Chunk 1 complete]
16s: [Chunk 2 complete]
19s: [Chunk 3 complete] ← ALL CHUNKS READY
```

**Time Saved**: User starts watching at 10s instead of 19s (47% faster perceived generation)

## Troubleshooting

### Issue: Video doesn't auto-play
**Cause**: Browser autoplay policies require user interaction
**Solution**: 
```typescript
// Add user gesture to enable autoplay
<button onClick={() => setIsPlaying(true)}>
  Start Video
</button>
```

### Issue: Chunks don't transition smoothly
**Cause**: `onEnded` event not firing or timing issue
**Solution**: 
```typescript
// Add time update listener
videoRef.current?.addEventListener('timeupdate', () => {
  const remaining = duration - currentTime;
  if (remaining < 0.1 && isNextChunkReady) {
    prepareNextChunk();
  }
});
```

### Issue: Buffering doesn't resolve
**Cause**: Next chunk failed to render
**Solution**: Check `chunkResults` for failed status, skip to next available chunk

### Issue: Memory leak during long videos
**Cause**: Not cleaning up video elements
**Solution**: 
```typescript
// Revoke object URLs after playback
useEffect(() => {
  return () => {
    chunks.forEach(chunk => {
      if (chunk.chunkUrl.startsWith('blob:')) {
        URL.revokeObjectURL(chunk.chunkUrl);
      }
    });
  };
}, [chunks]);
```

## Known Limitations

1. **Preview Mode Only**: Current implementation uses simulated rendering. Production requires Netlify/Lambda integration.
2. **No Seek**: Cannot jump to arbitrary timestamps (chunk-based only)
3. **No Download**: Individual chunks aren't stitched until all complete
4. **Browser Support**: Requires modern browsers with `<video>` element support

## Next Steps

1. **Implement Server-Side Rendering**: Create Netlify function to render chunks with Remotion
2. **Add Chunk Stitching**: Use FFmpeg to combine chunks into final video
3. **Supabase Storage**: Upload chunks to persistent storage
4. **Download Feature**: Let users download completed video
5. **Seek Support**: Allow jumping between chunks

## Success Indicators

Phase 6C is complete when:
- ✅ ProgressivePlayer component created
- ✅ Video starts playing before all chunks complete
- ✅ Chunk status indicators work correctly
- ✅ Buffering is handled gracefully
- ✅ All controls (play/pause/mute) functional
- ✅ Completion callback fires
- ✅ No console errors during playback
- ✅ User can watch 30s video starting at ~10s

## Phase 6 Complete! 🎉

With Phase 6A (Brave Images), 6B (Chunked Rendering), and 6C (Progressive Playback) complete, the Studio system now supports:
- ✅ Image overlays from Brave Search (supporting evidence)
- ✅ Chunked rendering (avoid serverless timeouts)
- ✅ Progressive playback (watch while rendering)
- ✅ Parallel chunk rendering (3 at once)
- ✅ Sentence boundary detection (no mid-sentence cuts)
- ✅ Smart buffering and status tracking

**Estimated Time Savings**: Users can start watching videos **~50% faster** compared to waiting for full render.
