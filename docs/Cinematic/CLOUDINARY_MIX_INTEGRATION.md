# Cloudinary Video+Audio Mix Integration

**Date:** 2026-04-20
**Status:** ✅ Working & Integrated

## Summary

Successfully integrated Cloudinary video+audio mixing into the cinematic workflow. The system now:
1. Generates raw video from Pexels/VEO
2. Shows raw video immediately (marked as "Preview")
3. Generates narration audio with ElevenLabs
4. Mixes video+audio on Cloudinary
5. Updates scene with mixed video when ready

## Test Page

Created test page: `/public/test-cloudinary-mix.html`

**Test Results:**
- ✅ Pexels video search working (using `PexelsFallbackProvider`)
- ✅ ElevenLabs TTS working (using `ElevenLabsService`)
- ✅ Cloudinary mixing working (using `cloudinary-process-video` edge function)

## Workflow

### 1. Video Generation
```typescript
// Uses existing PexelsFallbackProvider
const videoData = await pexelsProvider.getVideo('blue sky', '16:9');
// Returns: { url, duration, width, height }
```

### 2. Audio Generation
```typescript
// Uses existing NarrationService -> ElevenLabsService
const narrationResult = await narrationService.generateNarration([{
  text: scene.narration,
  startTime: 0,
  duration: scene.durationSeconds,
  sceneId: scene.id,
}]);
// Returns: { audioUrl: "data:audio/mpeg;base64,...", provider: "elevenlabs" }
```

### 3. Cloudinary Mixing
```typescript
// Calls cloudinary-process-video edge function
const remixResult = await remixSceneWithCloudinary({
  sourceUrl: scene.videoUrl,              // Pexels video URL
  userId: userId,
  targetDurationSeconds: 8,
  narrationAudioUrl: scene.narrationAudioUrl, // data URL from ElevenLabs
});
// Returns: { playbackUrl: "https://res.cloudinary.com/...", durationMode: "trim" }
```

## Edge Function: `cloudinary-process-video`

**Location:** `/supabase/functions/cloudinary-process-video/index.ts`

**What it does:**
1. Accepts video URL and audio data URL
2. Uploads both to Cloudinary
3. Applies video transformations:
   - Duration control (trim or loop to match target)
   - Audio overlay at 30% volume
   - H.264 and H.265 encoding
4. Returns transformed video URLs

**Key Transformation:**
```typescript
const audioOverlayTransform = narrationAudioPublicId
  ? `e_volume:30/l_video:${toCloudinaryLayerPublicId(narrationAudioPublicId)},fl_layer_apply,so_0`
  : undefined;

const h264Transform = [durationTransform, audioOverlayTransform, "f_mp4,vc_h264,br_2000k,q_auto:good"]
  .filter(Boolean)
  .join("/");
```

## Integration Points

### cinematicService.ts (Line 1229-1295)

```typescript
// Generate narration for each scene and mix with Cloudinary
for (const scene of readyScenes) {
  // 1. Generate TTS
  const narrationResult = await narrationService.generateNarration([...]);
  scene.narrationAudioUrl = narrationResult.audioUrl;

  // 2. Mark as preview
  scene.error = 'Preview (mixing audio...)';
  scene.mixStatus = 'processing';

  // 3. Mix on Cloudinary
  const remixResult = await remixSceneWithCloudinary({
    sourceUrl: scene.videoUrl,
    narrationAudioUrl: scene.narrationAudioUrl,
    targetDurationSeconds: scene.durationSeconds,
  });

  // 4. Update to mixed video
  scene.videoUrl = remixResult.playbackUrl;
  scene.mixStatus = 'ready';
  scene.error = undefined; // Clear preview tag
}
```

## Scene Status Flow

```
Raw Video Ready (Pexels/VEO)
  ↓
scene.status = 'ready'
scene.videoUrl = "https://videos.pexels.com/..."
scene.error = "Preview (mixing audio...)"  ← User can play raw video
  ↓
Generate Narration (ElevenLabs)
  ↓
scene.narrationAudioUrl = "data:audio/mpeg;base64,..."
  ↓
Mix on Cloudinary
  ↓
scene.mixStatus = 'processing'
  ↓
Cloudinary Processing (upload video, upload audio, apply transform)
  ↓
scene.videoUrl = "https://res.cloudinary.com/..."  ← Update to mixed video
scene.mixStatus = 'ready'
scene.error = undefined  ← Clear preview tag
```

## Error Handling

### If Mix Fails:
```typescript
catch (remixError) {
  scene.mixStatus = 'failed';
  scene.mixError = remixError.message;
  scene.error = 'Preview (mix failed - audio separate)';
  // Keeps raw video as fallback
}
```

## Environment Variables Required

### Supabase Secrets (Edge Function)
```bash
CLOUDINARY_CLOUD_NAME=dh3v1gcov
CLOUDINARY_API_KEY=***
CLOUDINARY_API_SECRET=***
CLOUDINARY_FOLDER=cinematic/veo
```

### Client (.env)
```bash
VITE_SUPABASE_URL=https://gpfccicfqynahflehpqo.supabase.co
VITE_SUPABASE_ANON_KEY=***
VITE_PEXELS_API_KEY=***
```

## Known Limitations

1. **Audio Upload Size**: Audio data URL is included in request body (~250KB base64)
2. **Processing Time**: Cloudinary mixing takes ~5-10 seconds per scene
3. **No FFmpeg**: Cannot do advanced video editing (text overlays, stitching)
4. **Pexels Videos**: Must be from CDN-friendly sources (Pexels works great)

## Next Steps

- [ ] Add progress tracking for Cloudinary mixing
- [ ] Implement parallel mixing for multiple scenes
- [ ] Add retry logic for failed mixes
- [ ] Cache mixed videos to avoid re-processing
- [ ] Add quality selector (H.264 vs H.265)

## Related Files

- Test Page: `/public/test-cloudinary-mix.html`
- Edge Function: `/supabase/functions/cloudinary-process-video/index.ts`
- Cinematic Service: `/src/services/cinematic/cinematicService.ts`
- Narration Service: `/src/services/cinematic/audio/NarrationService.ts`
- ElevenLabs Service: `/src/services/studio/assets/elevenLabsService.ts`
- Pexels Provider: `/src/services/cinematic/providers/PexelsFallbackProvider.ts`
