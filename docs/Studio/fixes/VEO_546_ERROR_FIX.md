# VEO 546 Error & Screen Freeze Fix

**Status:** ✅ Fixed
**Date:** 2026-04-14
**Issue:** Edge function 546 errors causing UI freeze during video save

## Problem

Users experienced screen freezes when generating cinematic videos, with errors like:
```
POST https://.../functions/v1/veo-generate-video 546
```

### Symptoms
- UI becomes unresponsive during video generation
- Error 546 from `veo-generate-video` edge function
- No error feedback to user
- Some scenes may have generated successfully but aren't shown

### Root Cause

**HTTP 546** indicates an edge function crash, confirmed by Supabase logs:

```json
{
  "level": "error",
  "memory_used": [
    {
      "external": 32970556,
      "heap": 140097648,
      "total": 173068204  // ~173 MB - EXCEEDS 150 MB LIMIT
    }
  ],
  "reason": "Memory limit exceeded"
}
```

**Problem:** The `save` action exceeded Supabase edge function memory limits:
- **Memory limit:** 150 MB (Supabase default)
- **Actual usage:** 173 MB (when downloading + uploading 5-10 MB videos)
- **Process:** Download from GCS → Load in memory → Upload to Supabase Storage
- **Result:** Edge function crashes with 546 error

## Solution

### Best Fix: Skip Supabase Storage Save Entirely ✅

**File:** [cinematicService.ts](../../../src/services/cinematic/cinematicService.ts:317-340)

Instead of trying to copy videos to Supabase Storage (which causes memory limit crashes), we now use GCS URLs directly:

```typescript
// NOTE: Skipping Supabase Storage save due to edge function memory limits (150 MB)
// VEO videos are ~5-10 MB each, and downloading + uploading exceeds memory limit
// Using GCS URLs directly instead - videos are publicly accessible for 24-48 hours
const fallbackUrl = normalizeFallbackVideoUrl(finalStatus.videoUrl);

if (fallbackUrl) {
  scene.videoUrl = fallbackUrl;
  scene.status = 'ready';
  scene.error = undefined; // GCS URLs work fine, no error needed
}
```

**Benefits:**
- ✅ **No memory issues** - Skips download/upload entirely
- ✅ **Instant "save"** - No waiting for transfer
- ✅ **No edge function calls** - Removes failure point
- ✅ **Simpler architecture** - Fewer moving parts
- ✅ **Works reliably** - GCS URLs are publicly accessible

**Trade-off:**
- ⚠️ Videos stored in Google Cloud, not Supabase
- ⚠️ GCS URLs may expire after 24-48 hours (depending on Google's policy)
- ✅ For short-lived demo/preview use case, this is acceptable

### 1. Added Timeout Protection (Secondary Defense)
**File:** [VeoVertexProvider.ts](../../../src/services/cinematic/providers/VeoVertexProvider.ts)

```typescript
// Add 60s timeout to prevent hanging
const timeoutPromise = new Promise<never>((_, reject) => {
  setTimeout(() => reject(new Error('Video save timeout (60s) - edge function may have crashed')), 60000);
});

const savePromise = supabase.functions.invoke('veo-generate-video', {
  body: { action: 'save', userId, ...payload },
});

const { data, error } = await Promise.race([savePromise, timeoutPromise]);
```

**Benefits:**
- UI never hangs indefinitely
- Clear error message after 60s
- Prevents silent failures

### 2. Enhanced Error Handling
**File:** [VeoVertexProvider.ts](../../../src/services/cinematic/providers/VeoVertexProvider.ts:180-185)

```typescript
if (status === 546 || status === 500) {
  throw new Error(
    `Edge function failed (${status}) - likely timeout or memory issue. Video may be too large. Try again or wait for processing to complete.`
  );
}
```

**Benefits:**
- Specific error messages for 546/500 errors
- Guides user on what to do next
- Distinguishes timeout from other errors

### 3. Improved User Feedback
**File:** [CinematicResults.tsx](../../../src/services/cinematic/pages/CinematicResults.tsx:123-129)

```typescript
if (errorMessage.includes('546') || errorMessage.includes('timeout') || errorMessage.includes('memory')) {
  setError('Video processing is taking longer than expected. Some scenes may be available - please check below. You can try refreshing or regenerating.');
}
```

**Benefits:**
- User-friendly error messages
- Explains that partial success is possible
- Suggests actionable next steps

### 4. Partial Success Display
**File:** [CinematicResults.tsx](../../../src/services/cinematic/pages/CinematicResults.tsx:408-412)

```typescript
{(experience?.scenes || sceneState).some(s => s.status === 'ready') && (
  <p className="text-sm text-red-700 dark:text-red-300 mt-2">
    Good news: Some scenes are ready! You can view them below.
  </p>
)}
```

**Benefits:**
- Shows successful scenes even when some fail
- Reduces frustration from partial failures
- Users can still view/download working scenes

## How It Works Now

### Success Path
1. Scene generates via VEO API → ✅
2. Video data returned (GCS URL or base64) → ✅
3. Edge function saves to Supabase Storage → ✅
4. Scene marked as "ready" → ✅

### Failure Path with Graceful Degradation
1. Scene generates via VEO API → ✅
2. Video data returned → ✅
3. Edge function save times out (546 error) → ⚠️
4. **Fallback:** Use temporary GCS URL or object URL → ✅
5. Scene marked as "ready" with warning message → ✅
6. User can still view the video → ✅

### Complete Failure Path
1. Scene generation fails → ❌
2. Scene marked as "failed" with error message → ⚠️
3. Other scenes continue processing → ✅
4. User sees error but can view successful scenes → ✅

## Testing

To verify the fix works:

1. **Generate cinematic video:**
   ```
   /cinematic-results?q=How does a black hole work?
   ```

2. **Observe behavior:**
   - ✅ UI shows loading state
   - ✅ Progress updates appear
   - ✅ If 546 error occurs, clear error message shown
   - ✅ Successful scenes are still displayed
   - ✅ User can view/play successful scenes
   - ✅ UI never freezes indefinitely

3. **Error scenarios:**
   - If ALL scenes fail → Error message + "Try Again" button
   - If SOME scenes fail → Error message + successful scenes shown
   - If timeout occurs → "processing taking longer" message

## Current Implementation ✅

### What We Do Now
1. ✅ **Skip Supabase Storage save** - Use GCS URLs directly
2. ✅ **Client-side timeout** (60s) - Prevents UI freezes
3. ✅ **Fallback to object URLs** - For inline base64 videos
4. ✅ **Clear error messages** - User-friendly feedback
5. ✅ **Show partial results** - Display successful scenes

### Why It Works
- **No memory issues:** Edge function never downloads/uploads videos
- **Instant results:** GCS URLs are immediately usable
- **Reliable:** Google Cloud Storage has 99.95% uptime
- **Cost-effective:** No data transfer costs

## Future Improvements (If Needed)

### Option 1: Increase Edge Function Memory (Not Recommended)
Configure higher limits in `supabase/config.toml`:
```toml
[functions.veo-generate-video]
memory = 512  # Increase to 512 MB
```

**Pros:**
- Simple configuration change

**Cons:**
- ❌ Still may fail for large videos
- ❌ Higher infrastructure costs
- ❌ Doesn't solve root cause

#### Option 2: Background Job Queue
Move save operation to background worker:
```typescript
// Queue save job
await queueVideoSave({
  videoUrl: finalStatus.videoUrl,
  userId,
  sceneId: scene.id,
});

// Return temporary URL immediately
scene.videoUrl = finalStatus.videoUrl;
scene.status = 'ready';
```

**Pros:**
- No user-facing timeouts
- Reliable eventual consistency
- Better for large files

**Cons:**
- Requires infrastructure (queue, workers)
- More complex architecture

#### Option 3: Increase Edge Function Limits
Configure longer timeouts in supabase config:
```toml
[functions.veo-generate-video]
timeout = 300  # 5 minutes
memory = 1024  # 1GB
```

**Pros:**
- Simple configuration change
- No code changes needed

**Cons:**
- Doesn't solve root cause
- Still may timeout for large videos
- Higher infrastructure costs

## Related Files

- [VeoVertexProvider.ts](../../../src/services/cinematic/providers/VeoVertexProvider.ts) - Timeout protection
- [CinematicResults.tsx](../../../src/services/cinematic/pages/CinematicResults.tsx) - Error handling
- [cinematicService.ts](../../../src/services/cinematic/cinematicService.ts) - Partial success handling
- [veo-generate-video/index.ts](../../../supabase/functions/veo-generate-video/index.ts) - Edge function

## Summary

✅ **Fixed screen freeze** - Added 60s timeout to prevent indefinite hanging
✅ **Better error messages** - User-friendly explanations for 546/timeout errors
✅ **Partial success** - Shows working scenes even when some fail
✅ **Graceful degradation** - Falls back to temporary URLs if save fails

The UI now handles edge function failures gracefully and never freezes, even when videos fail to save.
