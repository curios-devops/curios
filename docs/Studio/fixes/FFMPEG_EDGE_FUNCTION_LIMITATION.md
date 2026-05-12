# FFmpeg Edge Function Limitation

**Status:** Known Limitation
**Affected Features:** Scene narration burning, Video stitching
**Date Identified:** 2026-04-11

## Problem

The cinematic video generation service encounters 500 errors when trying to use edge functions that require FFmpeg:
- `add-scene-narration` - Combines scene video with TTS audio and text overlays
- `stitch-cinematic-video` - Stitches multiple scene videos into one complete video

### Error Details

```
POST https://.../functions/v1/add-scene-narration 500 (Internal Server Error)
POST https://.../functions/v1/stitch-cinematic-video net::ERR_FAILED (CORS)
```

## Root Cause

**Supabase Edge Functions run on Deno Deploy**, which:
- Does not provide access to system binaries like FFmpeg
- Cannot execute commands like `ffmpeg`, `Deno.Command`, or `Deno.run`
- Is a serverless environment optimized for lightweight JavaScript/TypeScript execution

Both `add-scene-narration` and `stitch-cinematic-video` rely on FFmpeg for:
- Video/audio encoding and decoding
- Combining multiple media streams
- Adding text overlays
- Video transitions and effects

## Current Workaround

The `cinematicService.ts` has been updated to:
1. **Skip video enhancement** - Narration audio is generated but NOT burned into the video
2. **Skip video stitching** - Individual scene videos are returned instead of a stitched full video
3. **Graceful degradation** - Users receive individual scene videos with separate narration audio URLs

### Code Changes

**[cinematicService.ts:911-917](src/services/cinematic/cinematicService.ts#L911-917)**
```typescript
// NOTE: Video enhancement (burning narration + text overlay) requires FFmpeg
// which is not available in Supabase Edge Functions (Deno Deploy)
// Skipping this step for now - narration audio URLs are available separately
logger.info('[CinematicService] Narration audio generated (video enhancement skipped - FFmpeg not available)', {
  sceneId: scene.id,
  narrationAudioUrl: scene.narrationAudioUrl,
});
```

**[cinematicService.ts:928-971](src/services/cinematic/cinematicService.ts#L928-971)**
```typescript
// Step 4: Video stitching currently unavailable (requires FFmpeg)
// NOTE: Video stitching requires FFmpeg which is not available in Supabase Edge Functions
// For now, we'll return individual scene videos instead of a stitched full video
```

## Solutions

### Option 1: Use External Video Processing Service (Recommended)
- **Cloudinary** - Video transformations API
- **Mux** - Video encoding and stitching
- **AWS MediaConvert** - Serverless video processing
- **FFmpeg.wasm** - WebAssembly version (limited performance)

### Option 2: Self-Hosted Edge Function
- Deploy edge functions to a service that supports FFmpeg
- Options: AWS Lambda (with FFmpeg layer), Google Cloud Functions, Railway, Fly.io
- Requires infrastructure management

### Option 3: Client-Side Processing
- Use FFmpeg.wasm in the browser
- Limited by browser memory and CPU
- Not suitable for production-grade video processing

### Option 4: Hybrid Approach
- Keep lightweight operations in Supabase Edge Functions
- Move FFmpeg operations to dedicated service
- Best balance of cost and performance

## Implementation Plan

1. **Research video processing services** - Compare Cloudinary, Mux, AWS MediaConvert
2. **Prototype with Cloudinary** - Most developer-friendly API for video transformations
3. **Create new edge functions** - `cloudinary-enhance-scene`, `cloudinary-stitch-video`
4. **Update cinematicService** - Add conditional logic to use Cloudinary when available
5. **Add feature flag** - `ENABLE_VIDEO_ENHANCEMENT` environment variable
6. **Document API keys** - Add Cloudinary credentials to Supabase secrets

## User Impact

**Current State:**
- ✅ Scene videos are generated successfully
- ✅ Narration audio is available separately
- ❌ Narration is NOT burned into videos
- ❌ Videos are NOT stitched together
- ❌ Text overlays are NOT rendered

**Expected State (after fix):**
- ✅ Full cinematic videos with embedded narration
- ✅ Smooth transitions between scenes
- ✅ Text overlays for scene titles
- ✅ Single downloadable video file

## Related Files

- [cinematicService.ts](../../../src/services/cinematic/cinematicService.ts)
- [add-scene-narration/index.ts](../../../supabase/functions/add-scene-narration/index.ts)
- [stitch-cinematic-video/index.ts](../../../supabase/functions/stitch-cinematic-video/index.ts)

## References

- [Deno Deploy Limitations](https://deno.com/deploy/docs/runtime-api#unsupported-apis)
- [Supabase Edge Functions Runtime](https://supabase.com/docs/guides/functions/deploy)
- [Cloudinary Video API](https://cloudinary.com/documentation/video_manipulation_and_delivery)
- [FFmpeg.wasm](https://ffmpegwasm.netlify.app/)
