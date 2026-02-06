# CSP Preview Mode Fix ✅

## Problem

When testing the chunked renderer, got **CSP (Content Security Policy) violation**:

```
Refused to load media from 'preview://chunk_chunk_0_test-video-123.mp4' 
because it violates the following Content Security Policy directive: 
"default-src 'self' https:". Note that 'media-src' was not explicitly set, 
so 'default-src' is used as a fallback.
```

**Root Cause**: 
- Chunked renderer was in **PREVIEW MODE** (for fast testing without actual video rendering)
- Generated fake URLs with custom `preview://` protocol
- Browser CSP blocks non-standard protocols (only allows `http:`, `https:`, `data:`, etc.)
- `<video>` tag couldn't load the fake URLs

---

## Solution Applied

### 1. ✅ Updated ChunkedRenderer (Return null in preview mode)

**File**: `/src/services/studio/rendering/chunkedRenderer.ts`

**Changes**:

1. **Updated interface** to allow null URLs (line 18):
```typescript
export interface ChunkRenderResult {
  chunkId: string;
  chunkIndex: number;
  chunkUrl: string | null; // null in preview mode, URL string in production
  status: 'complete' | 'rendering' | 'failed' | 'pending';
  error?: string;
  renderTime?: number;
  fileSize?: number;
}
```

2. **Return null instead of fake URL** (lines 189-218):

**Before**:
```typescript
private async simulateChunkRendering(...): Promise<string> {
  await this.delay(totalTime);
  
  const chunkUrl = `preview://chunk_${chunk.id}_${videoId}.mp4`; // ❌ CSP violation
  return chunkUrl;
}
```

**After**:
```typescript
private async simulateChunkRendering(...): Promise<string | null> {
  await this.delay(totalTime);
  
  logger.info('[Chunked Renderer] Preview mode: No video file generated', {
    chunkId: chunk.id,
    videoId,
    note: 'Set PREVIEW_MODE=false for actual rendering'
  });
  
  return null; // ✅ No CSP violation
}
```

3. **Fixed logging** to handle null (line 158):
```typescript
chunkUrl: chunkUrl ? chunkUrl.substring(0, 50) : 'null (preview mode)'
```

---

### 2. ✅ Updated ProgressivePlayer (Handle null URLs gracefully)

**File**: `/src/components/studio/ProgressivePlayer.tsx`

**Changes**:

1. **Import Film icon** (line 8):
```typescript
import { Play, Pause, Volume2, VolumeX, Loader2, Film } from 'lucide-react';
```

2. **Three-state rendering** (lines 111-150):

```typescript
{/* Case 1: Chunk ready with URL → Show video */}
{isChunkReady && currentChunk.chunkUrl ? (
  <video src={currentChunk.chunkUrl} ... />
) 

{/* Case 2: Chunk ready but no URL (preview mode) → Show metadata */}
: isChunkReady && !currentChunk.chunkUrl ? (
  <div className="preview-mode-placeholder">
    <Film className="w-16 h-16" />
    <h3>Preview Mode</h3>
    <p>Chunk {currentChunkIndex + 1} of {chunks.length} rendered</p>
    <div className="metadata">
      <p>ChunkID: {currentChunk.chunkId}</p>
      <p>Duration: {currentChunk.renderTime}ms</p>
      <p>💡 Set PREVIEW_MODE=false for actual video playback</p>
    </div>
  </div>
) 

{/* Case 3: Still rendering → Show spinner */}
: (
  <div className="loading">
    <Loader2 className="animate-spin" />
    <p>Rendering chunk {currentChunkIndex + 1}...</p>
  </div>
)}
```

---

## How It Works Now

### Preview Mode (Current Behavior)

1. **Renderer**: Returns `chunkUrl: null` (no video file)
2. **Player**: Detects `chunkUrl === null`
3. **UI**: Shows metadata placeholder instead of video:
   ```
   🎬 Preview Mode
   Chunk 1 of 3 rendered
   
   ChunkID: chunk_0
   Duration: 2652ms
   💡 Set PREVIEW_MODE=false for actual video playback
   ```
4. **Browser**: No CSP violation (no media loading)

### Production Mode (Future)

1. **Renderer**: Calls Netlify function or Remotion Lambda
2. **Returns**: Real Supabase Storage URL
   ```
   https://gpfccicfqynahflehpqo.supabase.co/storage/v1/object/public/videos/chunk_0_video-123.mp4
   ```
3. **Player**: Loads actual video in `<video>` tag
4. **UI**: Shows real playback controls

---

## Benefits

| Before | After |
|--------|-------|
| ❌ CSP violation error | ✅ No errors |
| ❌ Fake `preview://` URLs | ✅ `null` in preview mode |
| ❌ Browser blocks video loading | ✅ Shows metadata placeholder |
| ❌ Confusing error messages | ✅ Clear "Preview Mode" message |

---

## Testing Instructions

### 1. Test Preview Mode (Current)

1. Navigate to: **http://localhost:8888/phase6-test**
2. Click **"Test Chunked Renderer"** or **"Run All Tests"**
3. Wait for chunks to render

**Expected UI**:
```
🎬 Preview Mode
Chunk 1 of 3 rendered

ChunkID: chunk_0
Duration: 2652ms
💡 Set PREVIEW_MODE=false for actual video playback
```

**Expected Console**:
```
[Chunked Renderer] Starting chunk render { chunkId: "chunk_0", ... }
[Chunked Renderer] Preview mode: No video file generated { chunkId: "chunk_0", ... }
[Chunked Renderer] Chunk complete { chunkId: "chunk_0", chunkUrl: "null (preview mode)" }
```

**Expected Behavior**:
- ✅ No CSP errors
- ✅ No "Refused to load media" errors
- ✅ Chunks render successfully
- ✅ Metadata displayed correctly
- ✅ Chunk status pills show correct states
- ✅ Progress updates smoothly

### 2. Verify CSP Fix

**Open Browser Console** → Should NOT see:
- ❌ `Refused to load media from 'preview://...'`
- ❌ `CSP directive violation`

**Should see instead**:
- ✅ `[Chunked Renderer] Preview mode: No video file generated`
- ✅ `chunkUrl: "null (preview mode)"`

---

## Future: Production Mode

To enable **actual video rendering** (not preview mode):

### Option 1: Netlify Function (Server-Side)

```typescript
// In chunkedRenderer.ts
private async renderChunkProduction(
  chunk: VideoChunk,
  format: 'vertical' | 'horizontal',
  videoId: string
): Promise<string> {
  // Call Netlify function
  const response = await fetch('/.netlify/functions/render-video', {
    method: 'POST',
    body: JSON.stringify({
      composition: 'StudioChunk',
      inputProps: {
        chunk,
        format,
        accentColor: '#3b82f6'
      }
    })
  });
  
  const { videoUrl } = await response.json();
  return videoUrl; // Real Supabase Storage URL
}
```

### Option 2: Remotion Lambda (Cloud)

```typescript
import { renderMediaOnLambda } from '@remotion/lambda/client';

const { videoUrl } = await renderMediaOnLambda({
  region: 'us-east-1',
  functionName: 'remotion-render',
  composition: 'StudioChunk',
  inputProps: { chunk, format },
  codec: 'h264',
  outName: `chunk_${chunk.id}_${videoId}.mp4`
});
```

### Option 3: Client-Side (Browser)

```typescript
// Use Remotion Player with capture
import { Player } from '@remotion/player';
import { MediaRecorder } from 'canvas-record';

// Render composition → Capture frames → Generate blob URL
```

---

## Summary

✅ **Problem**: CSP blocking `preview://` URLs  
✅ **Solution**: Return `null` in preview mode, show metadata placeholder  
✅ **Result**: No CSP errors, clear preview UI  

**Preview Mode**: Fast testing without video files (current)  
**Production Mode**: Real video rendering with Supabase URLs (future)  

---

## Files Changed

| File | Status | Lines Changed |
|------|--------|---------------|
| `/src/services/studio/rendering/chunkedRenderer.ts` | ✅ Updated | ~20 |
| - ChunkRenderResult interface | Allow null URLs | +1 |
| - simulateChunkRendering() | Return null | +10 |
| - Logging | Handle null | +1 |
| `/src/components/studio/ProgressivePlayer.tsx` | ✅ Updated | ~25 |
| - Import Film icon | Add icon | +1 |
| - Three-state rendering | Preview placeholder | +20 |

**Total Impact**: ~45 lines modified

---

## Test Now! 🚀

1. **Refresh browser** at: http://localhost:8888/phase6-test
2. Click **"Test Chunked Renderer"**
3. Should see **"🎬 Preview Mode"** placeholder (not video element)
4. Check console: **No CSP errors** ✅
5. All chunk tests should pass

**Expected**:
- ✅ Chunks render successfully
- ✅ Metadata displayed
- ✅ No browser errors
- ✅ Clear "Preview Mode" message

**CSP violation fixed!** 🎉
