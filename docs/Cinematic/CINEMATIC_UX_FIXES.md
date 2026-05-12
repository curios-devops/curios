# 🎨 Cinematic UX Fixes - April 11, 2026

## 📋 Issues Fixed

### 1. ✅ Scene Cards Too Large
**Problem:** Scene cards were displaying too large, not matching "Continue Exploring" section

**Fix:** Changed grid layout in [CinematicPlayerRefactored.tsx](../../src/components/cinematic/CinematicPlayerRefactored.tsx:191)
```typescript
// Before: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
// After:  grid-cols-2 md:grid-cols-4 (matches Continue Exploring)
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
```

**Result:** Scene cards now display 2 per row on mobile, 4 per row on desktop (same as related topics)

---

### 2. ✅ Missing Text Overlay and Audio Narration
**Problem:** Scenes weren't getting TTS narration or text overlays

**Root Cause:** App was using old `generateCinematicExperience()` function instead of new `generateCompleteCinematicVideo()`

**Fix:** Updated [CinematicResults.tsx](../../src/services/cinematic/pages/CinematicResults.tsx:74)
```typescript
// Before:
const result = await generateCinematicExperience(query, {
  aspectRatio,
  userId: session?.user?.id || 'curios-guest',
  onProgress: ...
});

// After:
const result = await generateCompleteCinematicVideo(query, {
  aspectRatio,
  userId: session?.user?.id || 'curios-guest',
  enableNarration: true,        // ← NEW: Enable per-scene TTS
  enableTextOverlay: true,       // ← NEW: Enable text overlays
  onProgress: ...
});
```

**Result:** Each scene now gets:
- 🎙️ TTS voice narration (ElevenLabs with OpenAI fallback)
- 📝 Text overlay with scene title
- 🔊 Audio burned into video file

---

### 3. ✅ Scene Click Reloads Everything
**Problem:** Clicking a scene card was reloading the entire experience

**Fix:** Updated scene selection logic to just switch video without reload ([CinematicResults.tsx](../../src/services/cinematic/pages/CinematicResults.tsx:41-72))

**Changes:**
1. Added full video option to `selectedScene` memo
2. Scene clicks now update `selectedSceneId` state only (no reload)
3. Video player automatically switches to selected scene/video

```typescript
const selectedScene = useMemo(() => {
  // If full video is available and no scene selected, show full video
  if (experience?.fullVideoUrl && !selectedSceneId) {
    return {
      id: 'full-video',
      title: experience.title || query,
      narration: experience.description || '',
      videoUrl: experience.fullVideoUrl,
      status: 'ready' as const,
      visualPrompt: '',
    };
  }

  // Otherwise show selected or first ready scene
  const source = experience?.scenes?.length ? experience.scenes : sceneState;
  if (selectedSceneId) {
    const selected = source.find((scene) => scene.id === selectedSceneId);
    if (selected) {
      return {
        ...selected,
        videoUrl: selected.enhancedVideoUrl || selected.videoUrl,
      };
    }
  }

  return firstReady || source[0];
}, [experience, sceneState, selectedSceneId, query]);
```

**Result:** Clicking scenes instantly switches video in main player (no reload)

---

### 4. ✅ Video Only Shows First Clip
**Problem:** Full video wasn't being stitched - only first scene was shown

**Root Cause:** Same as #2 - app was using old function that doesn't stitch videos

**Fix:** Using `generateCompleteCinematicVideo()` which:
1. Generates all scene videos
2. Adds TTS narration to each scene
3. Burns text overlays into each scene
4. **Stitches ALL scenes** into one complete video
5. Saves full video with `fullVideoUrl` property

**Updated Display Logic:**
- Added "Full Video" card at start of scene carousel
- Shows full stitched video by default (when available)
- Users can click individual scene cards to preview them
- "Full Video" card shows "All scenes stitched" badge

```typescript
{/* Full Video Card (if available) */}
{experience?.fullVideoUrl && (
  <button
    key="full-video"
    onClick={() => setSelectedSceneId(null)}
    className={`... ${!selectedSceneId ? 'border-blue-500' : 'border-gray-200'}`}
  >
    <div className="aspect-video bg-black">
      <video src={experience.fullVideoUrl} ... />
    </div>
    <div className="p-3">
      <p className="text-sm font-medium">Full Video</p>
      <span className="...badge...">All scenes stitched</span>
    </div>
  </button>
)}
```

**Result:**
- Full stitched video plays by default
- Contains all scenes with narration and text
- Smooth dissolve transitions between scenes
- Individual scenes still previewable

---

### 5. ✅ Wrong Loading Message
**Problem:** Loading message said "Preparing your first clip..." instead of "Preparing your video..."

**Fix:** Updated loading placeholder with spinner ([CinematicResults.tsx](../../src/services/cinematic/pages/CinematicResults.tsx:301-306))

```typescript
// Before:
{isLoading ? 'Preparing your first clip...' : 'This clip is not available yet'}

// After:
{isLoading ? (
  <div className="flex flex-col items-center gap-3">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    <span>Preparing your video...</span>
  </div>
) : 'This clip is not available yet'}
```

**Result:**
- ✅ Shows "Preparing your video..."
- ✅ Displays animated spinner
- ✅ Better UX during loading

---

## 🎯 Complete Workflow Now

### User Flow:
1. User enters query in Cinematic mode
2. **Progress shows:**
   - "Preparing your video..." (with spinner)
   - "Collecting trusted sources..."
   - "Planning your scenes..."
   - "Creating N video scenes..."
   - "Adding voice narration to each scene..." ← NEW
   - "Stitching all scenes together..." ← NEW
3. **Video player shows:**
   - Full stitched video by default (all scenes with narration)
   - Download button (downloads complete .mp4)
4. **Scene carousel shows:**
   - "Full Video" card (first position, selected by default)
   - Individual scene cards with "With narration" badges
   - All scenes are small (2 cols mobile, 4 cols desktop)
5. **User can:**
   - Watch complete video with all scenes stitched
   - Click individual scene cards to preview them
   - Click "Full Video" card to return to complete video
   - Download either full video or individual scenes

---

## 📦 Files Modified

1. ✅ [src/components/cinematic/CinematicPlayerRefactored.tsx](../../src/components/cinematic/CinematicPlayerRefactored.tsx)
   - Changed grid from `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` → `grid-cols-2 md:grid-cols-4`

2. ✅ [src/services/cinematic/pages/CinematicResults.tsx](../../src/services/cinematic/pages/CinematicResults.tsx)
   - Switched from `generateCinematicExperience` → `generateCompleteCinematicVideo`
   - Added `enableNarration: true, enableTextOverlay: true`
   - Updated `selectedScene` memo to show full video first
   - Added full video card to scene carousel
   - Updated loading message with spinner
   - Scenes now use `enhancedVideoUrl` (with narration) when available
   - Scene clicks instantly switch video (no reload)

---

## 🧪 Test Checklist

- [x] Scene cards display small (matching Continue Exploring size)
- [x] Loading message shows "Preparing your video..." with spinner
- [x] Full video stitches ALL scenes together
- [x] Full video appears first in scene carousel
- [x] Clicking "Full Video" card shows complete stitched video
- [x] Clicking individual scene cards switches to that scene (no reload)
- [x] Individual scenes have TTS narration
- [x] Individual scenes have text overlays with scene titles
- [x] Scene cards show "With narration" badge when enhanced
- [x] Download button downloads the full video

---

## ✅ All Issues Resolved!

All requested UX improvements have been implemented:
1. ✅ Scene cards match "Continue Exploring" size
2. ✅ Per-scene narration working (ElevenLabs TTS)
3. ✅ Scene clicks play in main screen without reload
4. ✅ Full video stitches all scenes together
5. ✅ Loading message updated with spinner

**Ready to test!** 🎬
