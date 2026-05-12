# 🎬 Cinematic Video Improvements - Implementation Complete

**Date:** April 10, 2026
**Status:** ✅ Complete - Ready for Deployment

---

## 📋 Summary of Changes

All three requested improvements have been successfully implemented:

### 1. ✅ Hover Effects on Scene Cards
**Requirement:** Play video on hover with zoom effect while keeping frame size

**Implementation:**
- **File:** [src/components/cinematic/ScenePreviewCard.tsx](src/components/cinematic/ScenePreviewCard.tsx)
- Auto-plays video when mouse enters card
- Pauses and resets video when mouse leaves
- Smooth scale-110 transform (1.1x zoom) on hover
- Video stays within aspect-video container (no resize)

**Code Changes:**
```typescript
const handleMouseEnter = () => {
  setIsHovered(true);
  if (videoRef.current && status === 'ready' && !isPlaying) {
    videoRef.current.play().catch(() => {});
    setIsPlaying(true);
  }
};

const handleMouseLeave = () => {
  setIsHovered(false);
  if (videoRef.current && isPlaying) {
    videoRef.current.pause();
    videoRef.current.currentTime = 0;
    setIsPlaying(false);
  }
};
```

---

### 2. ✅ Per-Scene Narration with Voice-Over
**Requirement:** Add narrative text AND voice narration to EACH scene using ElevenLabs (with OpenAI TTS fallback)

**Implementation:**

#### A. Updated Type Definition
**File:** [src/services/cinematic/cinematicService.ts](src/services/cinematic/cinematicService.ts:14-25)
```typescript
export interface CinematicScene {
  id: string;
  title: string;
  narration: string;
  visualPrompt: string;
  status: 'queued' | 'generating' | 'ready' | 'failed';
  operationName?: string;
  videoUrl?: string; // Original video from VEO
  enhancedVideoUrl?: string; // Video with narration + text overlay burned in
  narrationAudioUrl?: string; // TTS audio URL
  error?: string;
}
```

#### B. New Edge Function: add-scene-narration
**File:** [supabase/functions/add-scene-narration/index.ts](supabase/functions/add-scene-narration/index.ts)

**Purpose:** Burns TTS narration audio and text overlay into scene video using FFmpeg

**Process:**
1. Downloads scene video from URL
2. Decodes base64 narration audio to MP3
3. Uses FFmpeg to combine:
   - Video stream
   - Narration audio stream
   - Text overlay (drawtext filter)
4. Uploads enhanced video to Supabase Storage
5. Returns public URL

**FFmpeg Command:**
```bash
ffmpeg -i scene.mp4 -i narration.mp3 \
  -vf "drawtext=text='Scene Title':fontsize=48:x=(w-text_w)/2:y=h-100:box=1:boxcolor=black@0.7:boxborderw=10" \
  -map 0:v:0 -map 1:a:0 \
  -c:v libx264 -preset fast -c:a aac \
  -shortest -y output.mp4
```

#### C. Updated Workflow in cinematicService
**File:** [src/services/cinematic/cinematicService.ts](src/services/cinematic/cinematicService.ts:760-820)

**New Process:**
1. Generate scenes (existing VEO workflow)
2. **For each ready scene:**
   - Generate TTS narration using ElevenLabs (fallback to OpenAI)
   - Store `narrationAudioUrl` in scene
   - Call `add-scene-narration` edge function
   - Burn narration + text overlay into video
   - Store `enhancedVideoUrl` in scene
3. Stitch **enhanced** videos (with narration already burned in)
4. Save final video to database

**Key Code:**
```typescript
// Generate narration for each scene
for (const scene of readyScenes) {
  // Generate TTS for this scene
  const narrationResult = await narrationService.generateNarration([{
    text: scene.narration,
    startTime: 0,
    duration: VEO_MAX_SECONDS_PER_SCENE,
    sceneId: scene.id,
  }]);

  scene.narrationAudioUrl = narrationResult.audioUrl;

  // Burn narration + text overlay into scene video
  if (narrationResult.audioBase64) {
    const enhancedResponse = await callEdgeFunction('add-scene-narration', {
      videoUrl: scene.videoUrl,
      narrationAudio: narrationResult.audioBase64,
      textOverlay: {
        text: scene.title,
        position: 'bottom',
        fontSize: 48,
        fontColor: 'white',
        backgroundColor: 'black@0.7',
      },
      userId,
      sceneId: scene.id,
    });

    if (enhancedResponse.success) {
      scene.enhancedVideoUrl = enhancedResponse.videoUrl;
    }
  }
}
```

#### D. TTS Integration
**File:** [src/services/cinematic/audio/NarrationService.ts](src/services/cinematic/audio/NarrationService.ts)

- Uses existing ElevenLabs edge function at `VITE_ELEVENLABS_TTS_URL`
- Default voice: Sarah (`EXAVITQu4vr4xnSDxMaL`) - Mature, Reassuring, Confident
- Returns audio as both base64 and data URL
- Automatic fallback to OpenAI TTS if ElevenLabs fails

---

### 3. ✅ Full Video Stitching with Download
**Requirement:** Stitch ALL scenes (not just first 8 seconds) with smooth transitions, save as downloadable .mp4

**Implementation:**

#### A. Updated Stitching Logic
**File:** [src/services/cinematic/cinematicService.ts](src/services/cinematic/cinematicService.ts:822-859)

**Changes:**
- Now uses `scene.enhancedVideoUrl || scene.videoUrl` (enhanced videos with narration)
- Stitches ALL scenes in order (no 8-second limit)
- Applies smooth dissolve transitions (0.5s) between scenes
- Removed separate audio mixing step (audio already in enhanced scenes)
- Removed separate text overlay step (text already in enhanced scenes)

```typescript
const stitchResponse = await callEdgeFunction('stitch-cinematic-video', {
  scenes: readyScenes.map((scene, index) => ({
    id: scene.id,
    // Use enhanced video (with narration + text) if available, otherwise original
    videoUrl: scene.enhancedVideoUrl || scene.videoUrl!,
    duration: VEO_MAX_SECONDS_PER_SCENE,
    order: index,
  })),
  transitionType: 'dissolve',
  transitionDuration: 0.5,
  userId,
  videoId: crypto.randomUUID(),
  aspectRatio,
});
```

#### B. Download Button
**File:** [src/components/cinematic/EngagementBar.tsx](src/components/cinematic/EngagementBar.tsx)

**Added:**
- New `onDownload` prop and handler
- Download button in engagement bar (shown when `videoUrl` is available)
- Downloads video as `.mp4` file with sanitized title as filename

```typescript
const handleDownload = () => {
  if (videoUrl) {
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};
```

**UI:**
```tsx
{videoUrl && (
  <button
    onClick={handleDownload}
    className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 font-medium transition-all"
    aria-label="Download"
  >
    <Download size={20} />
    <span className="text-sm">Download</span>
  </button>
)}
```

---

## 🎯 Complete Workflow

### Before (Old Workflow)
```
1. Generate scenes (videos only)
2. Generate ONE narration for entire experience
3. Stitch scenes
4. Add text overlays to stitched video
5. Mix ONE narration audio with stitched video
```

### After (New Workflow)
```
1. Generate scene videos (VEO)
2. For EACH scene:
   a. Generate TTS narration from scene.narration text (ElevenLabs/OpenAI)
   b. Burn narration audio into scene video (FFmpeg)
   c. Burn text overlay (scene.title) into scene video (FFmpeg)
   d. Upload enhanced scene video to storage
3. Stitch ALL enhanced scenes with dissolve transitions
4. Save final video to database
5. User can download complete .mp4 file
```

---

## 📁 Files Modified/Created

### New Files (2)
1. ✅ `supabase/functions/add-scene-narration/index.ts` - Edge function to burn narration into videos
2. ✅ `scripts/deploy-scene-narration.sh` - Deployment script

### Modified Files (3)
1. ✅ `src/components/cinematic/ScenePreviewCard.tsx` - Added hover effects
2. ✅ `src/services/cinematic/cinematicService.ts` - Updated workflow for per-scene narration
3. ✅ `src/components/cinematic/EngagementBar.tsx` - Added download button

### Existing Files (Referenced)
- ✅ `src/services/cinematic/audio/NarrationService.ts` - Already configured for ElevenLabs
- ✅ `supabase/functions/stitch-cinematic-video/index.ts` - Already stitches all scenes correctly

---

## 🚀 Deployment Instructions

### 1. Deploy Edge Function

```bash
# Deploy add-scene-narration function
./scripts/deploy-scene-narration.sh

# Or manually:
supabase functions deploy add-scene-narration
```

### 2. Verify Dependencies

Ensure these environment variables are set in Supabase:
- `VITE_ELEVENLABS_TTS_URL` - ElevenLabs TTS edge function URL
- `VITE_OPENAI_TTS_URL` - OpenAI TTS fallback URL
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for storage uploads
- `SUPABASE_STORAGE_BUCKET` - Storage bucket name (default: "videos")

### 3. Test End-to-End

```bash
# Run a test query through the cinematic workflow
# Verify:
# 1. Scene cards play on hover ✓
# 2. Each scene has narration ✓
# 3. Full video contains all scenes ✓
# 4. Download button appears and works ✓
```

---

## 🧪 Testing Checklist

- [ ] Hover over scene card → video plays and zooms
- [ ] Move mouse away → video stops and resets
- [ ] Generate cinematic video → each scene has TTS narration
- [ ] Play individual scene → hear voice-over narration
- [ ] Play full video → all scenes stitched with narration and text
- [ ] Full video has smooth transitions between scenes
- [ ] Click download button → receives .mp4 file
- [ ] Downloaded video plays correctly with all scenes + narration

---

## 📊 Performance Considerations

### Per-Scene Narration Impact
- **Before:** 1 TTS call for entire video
- **After:** N TTS calls (one per scene, typically 3-5 scenes)
- **Mitigation:** Calls are sequential but fail gracefully (continues without narration if TTS fails)

### Video Enhancement Impact
- **New Step:** FFmpeg processing for each scene (adds ~5-10s per scene)
- **Benefit:** Final stitching is cleaner (no separate overlay/mixing steps)
- **Progress Updates:** User sees "Adding voice narration to each scene..." message

### Total Generation Time
- **Estimated:** +30-60s for TTS + FFmpeg enhancement (for 3-5 scenes)
- **User Experience:** Progress bar shows 96% → 98% → 100%

---

## 🎨 User Experience Flow

1. **User submits query**
2. **Planning stage (5%):** "Preparing your video..."
3. **Research stage (15%):** "Collecting trusted sources..."
4. **Directing stage (25-32%):** "Writing a clear explanation..." → "Planning your scenes..."
5. **Generating stage (35-95%):** "Creating N video scenes..." → "Rendering scene: [title]"
6. **Composing stage (95-98%):**
   - "Composing your full cinematic video..."
   - "Adding voice narration to each scene..." ← NEW
   - "Stitching all scenes together..." ← UPDATED
7. **Complete (100%):** "Your cinematic video is ready!"
8. **User can:**
   - Hover over scene cards to preview
   - Watch full video with narration
   - Download complete .mp4 file ← NEW

---

## 🐛 Error Handling

All new features include graceful fallbacks:

1. **TTS Fails:**
   - Try OpenAI TTS as fallback
   - If both fail: Log warning, continue with video without narration
   - User still gets stitched video

2. **Scene Enhancement Fails:**
   - Log warning with scene ID
   - Use original video without narration
   - Continue stitching with available videos

3. **Download Fails:**
   - Button only shows when `videoUrl` is available
   - Handles missing video gracefully

---

## 📈 Next Steps (Optional Enhancements)

1. **Parallel Narration Generation:** Generate TTS for all scenes in parallel instead of sequentially
2. **Custom Voice Selection:** Allow users to choose TTS voice (currently uses default Sarah voice)
3. **Narration Speed Control:** Add speed parameter to TTS calls
4. **Progress Granularity:** Show per-scene progress (e.g., "Adding narration to scene 2/5...")
5. **Preview Enhanced Scenes:** Update ScenePreviewCard to play enhanced videos if available

---

## ✅ Implementation Complete!

All three requested improvements are now ready for deployment:
1. ✅ Hover effects on scene cards
2. ✅ Per-scene narration with ElevenLabs TTS
3. ✅ Full video stitching with download button

**Ready to deploy and test!** 🚀
