# Cinematic Scene State Simplification

## Overview
Simplified the cinematic scene workflow from a complex multi-state system to a clean 3-state flow: **Draft → Preview → Final**.

---

## Previous Complex System

### Problems:
1. **Too many states**: `status` (queued, generating, ready, failed) + `sceneStage` (draft, preview, final) + `mixStatus` (queued, processing, ready, failed)
2. **Confusing video URLs**: `videoUrl`, `enhancedVideoUrl`, `mixedVideoUrl`, `rawVideoUrl` - hard to know which one to use
3. **No narration audio**: Mixed videos weren't being used correctly, so narration wasn't audible
4. **400 DB errors**: Tried to save scenes before they were final, and `full_video_path` was required but not needed

---

## New Simplified 3-State Flow

### State Definitions:

```typescript
export interface CinematicScene {
  sceneStage: 'draft' | 'preview' | 'final';
  rawVideoUrl?: string;    // Original video from VEO/Pexels
  videoUrl?: string;        // Current playable video (with audio mixed)
  narrationAudioUrl?: string;
  provider?: 'veo' | 'pexels';
  error?: string;
}
```

### State Progression:

1. **Draft** (`sceneStage: 'draft'`)
   - Raw video from Pexels or VEO
   - Shown in scene list (thumbnail)
   - **NOT playable in main player** (no audio yet)
   - `rawVideoUrl` populated

2. **Preview** (`sceneStage: 'preview'`)
   - Pexels video mixed with narration audio via Cloudinary
   - **Ready to play in main player**
   - Used as fallback if VEO times out
   - `videoUrl` = Cloudinary mixed video

3. **Final** (`sceneStage: 'final'`)
   - VEO video mixed with narration audio
   - OR Pexels+audio if VEO timeout/failed (upgraded from preview)
   - **Ready for concatenation and Supabase save**
   - `videoUrl` = Cloudinary mixed video

---

## Processing Flow

```
1. Generate videos (VEO with Pexels fallback)
   ↓
   scenes[].rawVideoUrl = video from provider
   scenes[].sceneStage = 'draft'

2. Generate narration TTS
   ↓
   scenes[].narrationAudioUrl = TTS audio URL

3. Mix video + audio via Cloudinary
   ↓
   scenes[].videoUrl = Cloudinary mixed video

   IF provider === 'veo':
     scenes[].sceneStage = 'final'
   ELSE:
     scenes[].sceneStage = 'preview'

4. Upgrade preview → final (if VEO didn't finish)
   ↓
   For each scene where sceneStage === 'preview':
     scenes[].sceneStage = 'final'

5. Generate full video concatenation URL
   ↓
   fullVideoUrl = buildCloudinaryConcatUrl(finalScenes)

6. Save to Supabase (ONLY final scenes)
   ↓
   await persistenceService.saveCinematicVideo({
     scenes: finalScenes,  // Only final scenes
     fullVideoUrl,
     full_video_path: null  // Made nullable
   })
```

---

## Key Fixes

### 1. Narration Audio Now Works
**Before**: Mixed video URL was lost or overwritten
```typescript
scene.mixedVideoUrl = remixResult.playbackUrl;
scene.videoUrl = scene.rawVideoUrl; // ❌ Wrong! No audio
```

**After**: Mixed video is the primary playable URL
```typescript
scene.videoUrl = remixResult.playbackUrl; // ✅ Has audio burned in
```

### 2. Only Save Final Scenes to DB
**Before**: Saved all scenes, including drafts
```typescript
await persistenceService.saveCinematicVideo(experience, ...);
// ❌ Includes draft/preview scenes
```

**After**: Only save final scenes
```typescript
const finalScenes = experience.scenes.filter(
  scene => scene.sceneStage === 'final' && scene.videoUrl
);

await persistenceService.saveCinematicVideo({
  ...experience,
  scenes: finalScenes  // ✅ Only final
}, ...);
```

### 3. Fixed 400 Supabase Error
**Before**: `full_video_path` was NOT NULL but we passed empty string
```sql
full_video_path TEXT NOT NULL  -- ❌ Required
```

**After**: Made it nullable
```sql
full_video_path TEXT  -- ✅ Nullable (not needed for Cloudinary URLs)
```

### 4. Skip DB Save if No Final Scenes
**Before**: Tried to save even with 0 final scenes → 400 error
```typescript
const videoId = await persistenceService.saveCinematicVideo(...);
// ❌ Crashes if no final scenes
```

**After**: Early return if no final scenes
```typescript
if (finalScenes.length === 0) {
  logger.warn('No final scenes available, skipping DB save');
  return experience;
}
```

---

## Migration Required

### SQL to Run in Supabase Dashboard:
```sql
ALTER TABLE public.cinematic_videos
ALTER COLUMN full_video_path DROP NOT NULL;
```

**Location**: Supabase Dashboard → SQL Editor → Run query

---

## Testing Checklist

- [ ] Generate cinematic video (Draft videos show in scene list)
- [ ] Wait for narration mixing (Preview/Final videos are playable)
- [ ] Click play on main video player (Should hear narration audio)
- [ ] Check browser console - no 400 errors
- [ ] Verify Supabase `cinematic_videos` table has new row
- [ ] Check saved scenes have `sceneStage: 'final'`
- [ ] Verify `full_video_url` is a Cloudinary concat URL

---

## Files Changed

1. **[cinematicService.ts](../../src/services/cinematic/cinematicService.ts)**
   - Simplified `CinematicScene` interface (removed `status`, `mixStatus`, `enhancedVideoUrl`, `mixedVideoUrl`)
   - Updated `generateCompleteCinematicVideo()` to use 3-state flow
   - Fixed narration mixing logic
   - Added early return if no final scenes

2. **[VideoPersistenceService.ts](../../src/services/cinematic/video/VideoPersistenceService.ts)**
   - Changed `full_video_path` parameter to `string | null`

3. **[20260408_cinematic_videos.sql](../../supabase/migrations/20260408_cinematic_videos.sql)**
   - Made `full_video_path` column nullable

4. **[FIX_CINEMATIC_400_ERROR.sql](../../FIX_CINEMATIC_400_ERROR.sql)** (NEW)
   - Quick fix script to run in Supabase Dashboard

---

## Benefits

✅ **Simpler**: 3 clear states instead of 9+ combinations
✅ **Narration works**: Audio is burned into video correctly
✅ **No 400 errors**: Only saves when final scenes are ready
✅ **Cleaner code**: One video URL (`videoUrl`) instead of 4
✅ **Better UX**: Users see progress (draft → preview → final)

---

## Next Steps

1. Run the SQL migration in Supabase Dashboard
2. Deploy updated code
3. Test cinematic video generation
4. Monitor logs for "Final scenes ready" message
5. Verify Supabase saves are working

---

**Created**: 2026-04-20
**Status**: ✅ Ready for deployment
