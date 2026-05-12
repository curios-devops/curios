# Cinematic Mix & Autoplay Flow Fix

**Date:** 2026-04-30
**Status:** ✅ Fixed

## Problem

Videos were being sent to the main player **before** they were mixed with audio and captions using Cloudinary. This resulted in:

1. ❌ Users seeing raw videos without narration audio
2. ❌ Videos without captions being played in the main player
3. ❌ Unclear UX about which videos were "ready" vs "draft"
4. ❌ Autoplay loop not configured correctly

## Root Cause

The flow was:
```
Raw Video → Main Player (WRONG)
           ↓
       Cloudinary Mix (audio + captions)
```

Instead of:
```
Raw Video → Cloudinary Mix (audio + captions) → Main Player (CORRECT)
```

## Solution

### 1. Updated Video Player Filter ([CinematicResults.tsx](src/services/cinematic/pages/CinematicResults.tsx))

**Before:**
```typescript
.filter(({ scene }) => scene.status === 'ready' && (scene.enhancedVideoUrl || scene.videoUrl))
```

**After:**
```typescript
.filter(({ scene }) => scene.status === 'ready' && scene.mixStatus === 'ready' && scene.mixedVideoUrl)
```

Now the main player **only** shows videos that have been mixed with audio and captions.

### 2. Updated Scene Carousel

**Changes:**
- Shows draft videos (raw, no audio) with "Draft" badge
- Shows mixing videos with "Mixing..." badge and overlay
- Shows ready mixed videos with "Ready" badge
- Uses `mixedVideoUrl` when available, falls back to `rawVideoUrl` for carousel preview

**Code:**
```typescript
const sceneVideoUrl = scene.mixedVideoUrl || scene.enhancedVideoUrl || scene.videoUrl || scene.rawVideoUrl;
const isMixing = scene.status === 'ready' && scene.mixStatus !== 'ready' && !scene.mixedVideoUrl;
```

### 3. Enabled Continuous Autoplay Loop

**Configuration:**
```typescript
<SequentialVideoPlayer
  clips={...}
  autoPlay={true}
  loop={true}  // ✅ Continuous loop enabled
  enableDownload={true}
  aspectRatio={aspectRatio}
  transitionDuration={300}
/>
```

### 4. Updated Documentation ([CINEMATIC_UX.MD](docs/Cinematic/Arquitecture/CINEMATIC_UX.MD))

Updated specs to reflect correct flow:
- Draft videos → carousel only (with appropriate badges)
- Mixed videos (audio + captions) → main player autoplay
- Continuous loop behavior documented

## Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│ 1. Generate Raw Video (Pexels/LTX/WAN/VEO)             │
│    ↓                                                     │
│    rawVideoUrl / videoUrl                               │
│    Status: 'ready', sceneStage: 'draft'                 │
│                                                          │
│ 2. Show in Carousel (draft badge, no main player)       │
│    ↓                                                     │
│    Badge: "Draft" or "Mixing..."                        │
│                                                          │
│ 3. Mix with Cloudinary (audio + captions)               │
│    ↓                                                     │
│    mixedVideoUrl                                        │
│    mixStatus: 'ready'                                   │
│                                                          │
│ 4. Add to Main Player Autoplay Loop                     │
│    ↓                                                     │
│    Badge: "Ready" or "Final"                            │
│    Autoplay in continuous loop                          │
└─────────────────────────────────────────────────────────┘
```

## Scene States

| State | rawVideoUrl | mixedVideoUrl | mixStatus | Where Visible | Badge |
|-------|-------------|---------------|-----------|---------------|-------|
| Draft | ✅ | ❌ | - | Carousel only | "Draft" |
| Mixing | ✅ | ❌ | 'processing' | Carousel only | "Mixing..." |
| Ready | ✅ | ✅ | 'ready' | Carousel + Main Player | "Ready" |
| Final | ✅ | ✅ | 'ready' | Carousel + Main Player | "Final" |

## Key Rules

1. **NEVER** send videos to main player without Cloudinary mix
2. **ALWAYS** check `mixStatus === 'ready'` and `mixedVideoUrl` exists
3. **Carousel** shows all videos (draft, mixing, ready)
4. **Main Player** shows only mixed videos in continuous autoplay loop
5. Loop continues indefinitely until user stops

## Files Modified

1. [src/services/cinematic/pages/CinematicResults.tsx](src/services/cinematic/pages/CinematicResults.tsx)
   - Updated video player filter to check `mixStatus` and `mixedVideoUrl`
   - Updated carousel to show draft videos with mixing status
   - Added "Mixing..." badge and overlay

2. [docs/Cinematic/Arquitecture/CINEMATIC_UX.MD](docs/Cinematic/Arquitecture/CINEMATIC_UX.MD)
   - Updated flow documentation
   - Clarified draft → mix → autoplay sequence
   - Added badge descriptions

## Testing Checklist

- [ ] Videos appear in carousel immediately as draft (no audio)
- [ ] "Mixing..." badge shows while Cloudinary is processing
- [ ] Main player only starts when first mixed video is ready
- [ ] Autoplay loop continues with all ready mixed videos
- [ ] New mixed videos are added to the loop dynamically
- [ ] Carousel shows appropriate badges (Draft, Mixing, Ready, Final)
- [ ] No raw videos (without audio) play in main player

## Related Docs

- [CINEMATIC_UX.MD](docs/Cinematic/Arquitecture/CINEMATIC_UX.MD) - Full UX specification
- [cloudinaryFlow.ts](src/services/cinematic/subservices/cloudinaryFlow.ts) - Mixing implementation
- [SequentialVideoPlayer.tsx](src/components/cinematic/SequentialVideoPlayer.tsx) - Player component
