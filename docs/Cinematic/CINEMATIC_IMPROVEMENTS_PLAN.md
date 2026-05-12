# 🎬 Cinematic Video Improvements - Implementation Plan

**Date:** April 8, 2026
**Status:** In Progress

---

## 📋 Requirements

### 1. ✅ Hover Effects on Scene Cards (COMPLETED)
- [x] Play video on hover
- [x] Scale animation (1.1x zoom)
- [x] Keep video in same frame (no resize)
- [x] Similar to "Continue Exploring" section

### 2. ⏳ Per-Scene Narration (IN PROGRESS)
- [ ] Generate TTS narration for EACH scene individually
- [ ] Use ElevenLabs TTS (primary)
- [ ] Fallback to OpenAI TTS
- [ ] Burn narration audio + text overlay into each scene video
- [ ] Each scene becomes a complete mini-video with voiceover

### 3. ⏳ Full Video Stitching (IN PROGRESS)
- [ ] Stitch ALL scenes (not just first 8 seconds)
- [ ] Apply smooth transitions between scenes
- [ ] Create downloadable .mp4 file
- [ ] Add download button to EngagementBar

---

## 🏗️ Architecture Changes Needed

### Current Workflow
```
1. Generate scenes (videos only)
2. Generate ONE narration for entire experience
3. Stitch scenes
4. Add text overlays to stitched video
5. Mix ONE narration audio with stitched video
```

###  New Workflow
```
1. Generate scene videos
2. For EACH scene:
   a. Generate TTS narration from scene.narration text
   b. Burn narration audio into scene video
   c. Burn text overlay (scene.title) into scene video
3. Stitch ALL enhanced scenes with transitions
4. Save final video
5. Provide download link
```

---

## 📦 Implementation Steps

### Step 1: ✅ ScenePreviewCard Hover Effects (COMPLETED)

**File:** `src/components/cinematic/ScenePreviewCard.tsx`

Changes made:
- Added `handleMouseEnter` - auto-plays video on hover
- Added `handleMouseLeave` - pauses and resets video
- Added `transform scale-110` on hover for zoom effect
- Maintained aspect-video container (no resize)

**Result:** ✅ Videos play on hover with smooth zoom animation

---

### Step 2: ⏳ Per-Scene Narration Generation (IN PROGRESS)

**File:** `src/services/cinematic/audio/NarrationService.ts`

Changes made:
- ✅ Updated `generateWithElevenLabs()` to use correct API format
- ✅ Returns audioDataUrl and audioBase64
- ✅ Has `generateSegmentedNarration()` method for per-scene generation

**Still needed:**
- [ ] Update `cinematicService.ts` to call `generateSegmentedNarration()` instead of `generateNarration()`
- [ ] Store narration URLs per scene in `CinematicScene` type

---

### Step 3: ⏳ Burn Narration into Scene Videos

**New Edge Function Needed:** `supabase/functions/add-scene-narration/index.ts`

This function will:
1. Take scene video URL
2. Take narration audio URL (or base64)
3. Take text overlay config
4. Use FFmpeg to:
   - Combine video + narration audio
   - Add text overlay
   - Output enhanced scene video
5. Upload to Supabase Storage
6. Return public URL

**FFmpeg Command:**
```bash
ffmpeg -i scene.mp4 -i narration.mp3 \
  -vf "drawtext=text='Scene Title':fontsize=48:x=(w-text_w)/2:y=h-100" \
  -c:v libx264 -c:a aac \
  -shortest output.mp4
```

---

### Step 4: ⏳ Update Stitching to Use ALL Scenes

**File:** `supabase/functions/stitch-cinematic-video/index.ts`

Currently: Works correctly (stitches all scenes)

**File:** `src/services/cinematic/cinematicService.ts`

Need to update:
- Use enhanced scene videos (with narration burned in)
- Ensure ALL scenes are included
- Remove the audio mixing step (already in scenes)

---

### Step 5: ⏳ Add Download Button

**File:** `src/components/cinematic/EngagementBar.tsx`

Add:
```typescript
<button onClick={onDownload}>
  <Download size={20} />
  <span>Download</span>
</button>
```

**Handler:**
```typescript
const handleDownload = () => {
  if (fullVideoUrl) {
    const a = document.createElement('a');
    a.href = fullVideoUrl;
    a.download = `${title}.mp4`;
    a.click();
  }
};
```

---

## 🔄 Updated Workflow Diagram

```
User Query
    ↓
[Generate Individual Scenes]
    ↓
For each scene in parallel:
├─ Generate TTS Narration (ElevenLabs/OpenAI)
├─ Burn Narration Audio into Video
├─ Burn Text Overlay into Video
└─ Upload Enhanced Scene → scene.videoUrl
    ↓
[Stitch ALL Enhanced Scenes]
    ├─ Scene 1 (with narration + text)
    ├─ Transition (dissolve, 0.5s)
    ├─ Scene 2 (with narration + text)
    ├─ Transition
    └─ ... Scene N
    ↓
[Save Full Video]
    ↓
[Provide Download Link]
```

---

## 📁 Files to Modify/Create

### Modified Files (3)
1. ✅ `src/components/cinematic/ScenePreviewCard.tsx` - Hover effects (DONE)
2. ✅ `src/services/cinematic/audio/NarrationService.ts` - ElevenLabs integration (DONE)
3. ⏳ `src/services/cinematic/cinematicService.ts` - Per-scene workflow
4. ⏳ `src/components/cinematic/EngagementBar.tsx` - Download button

### New Files (1)
1. ⏳ `supabase/functions/add-scene-narration/index.ts` - Burn narration into video

### Type Updates (1)
1. ⏳ `src/services/cinematic/cinematicService.ts` - Add narration fields to `CinematicScene`

---

## 🎯 Detailed Implementation

### Update CinematicScene Type

```typescript
export interface CinematicScene {
  id: string;
  title: string;
  narration: string;
  visualPrompt: string;
  status: 'queued' | 'generating' | 'ready' | 'failed';
  operationName?: string;
  videoUrl?: string;           // Original video from VEO
  enhancedVideoUrl?: string;   // NEW: Video with narration + text
  narrationAudioUrl?: string;  // NEW: TTS audio URL
  error?: string;
}
```

### Update generateCompleteCinematicVideo()

```typescript
// After scenes are generated from VEO...

// NEW: Generate per-scene narration and enhance videos
const narrationService = new NarrationService();

for (const scene of experience.scenes) {
  if (scene.status !== 'ready') continue;

  // Generate narration for this scene
  const narrationResult = await narrationService.generateNarration([{
    text: scene.narration,
    startTime: 0,
    duration: VEO_MAX_SECONDS_PER_SCENE,
    sceneId: scene.id
  }]);

  scene.narrationAudioUrl = narrationResult.audioUrl;

  // Burn narration + text into scene video
  const enhancedResponse = await callEdgeFunction('add-scene-narration', {
    videoUrl: scene.videoUrl,
    narrationAudio: narrationResult.audioBase64,
    textOverlay: {
      text: scene.title,
      position: 'bottom',
      fontSize: 48
    },
    userId,
    sceneId: scene.id
  });

  scene.enhancedVideoUrl = enhancedResponse.videoUrl;
}

// Stitch using enhancedVideoUrl instead of videoUrl
const stitchResponse = await callEdgeFunction('stitch-cinematic-video', {
  scenes: readyScenes.map((scene, index) => ({
    id: scene.id,
    videoUrl: scene.enhancedVideoUrl || scene.videoUrl, // Use enhanced if available
    duration: VEO_MAX_SECONDS_PER_SCENE,
    order: index,
  })),
  ...
});
```

---

## 🧪 Testing Checklist

- [ ] Hover over scene card - video plays and zooms
- [ ] Move mouse away - video stops and resets
- [ ] Generate video - each scene has narration
- [ ] Play individual scene - hear voiceover
- [ ] Play full video - all scenes stitched with narration
- [ ] Click download - receives .mp4 file
- [ ] Download plays correctly with all scenes + narration

---

## 🚀 Deployment Order

1. ✅ Deploy updated ScenePreviewCard (hover effects)
2. ⏳ Create `add-scene-narration` edge function
3. ⏳ Deploy `add-scene-narration` function
4. ⏳ Update `cinematicService.ts` workflow
5. ⏳ Add download button to EngagementBar
6. ⏳ Test end-to-end workflow
7. ⏳ Deploy to production

---

## 📊 Current Status

| Feature | Status | Files |
|---------|--------|-------|
| Hover effects | ✅ Complete | ScenePreviewCard.tsx |
| ElevenLabs integration | ✅ Complete | NarrationService.ts |
| Per-scene narration logic | ✅ Complete | cinematicService.ts |
| Burn narration edge function | ✅ Complete | add-scene-narration/index.ts |
| Download button | ✅ Complete | EngagementBar.tsx |
| Full workflow integration | ✅ Complete | cinematicService.ts |

---

**Implementation Complete! ✅**

All three requested improvements have been implemented:
1. ✅ Hover effects on scene cards (play + zoom)
2. ✅ Per-scene narration with ElevenLabs TTS (fallback to OpenAI)
3. ✅ Full video stitching with all scenes + download button

**Next Steps for Deployment:**
1. Deploy `add-scene-narration` edge function to Supabase
2. Test end-to-end workflow with a sample query
3. Verify download functionality works correctly
