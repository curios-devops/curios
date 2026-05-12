# Sequential Video Player - TikTok-Style Playback

**Status:** ✅ Implemented
**Component:** `SequentialVideoPlayer`
**Date:** 2026-04-11

## Overview

Instead of using FFmpeg-based server-side video stitching (which requires infrastructure we don't have), we implemented a **client-side sequential video player** that plays 8-second clips one after another with smooth transitions - similar to TikTok/Instagram Reels.

## Why This Approach?

### Problems with FFmpeg Edge Functions
- ❌ Supabase Edge Functions (Deno Deploy) don't support FFmpeg
- ❌ Cloud video processing services (Cloudinary, Mux) are expensive for short clips
- ❌ Self-hosting FFmpeg requires infrastructure management

### Benefits of Sequential Playback
- ✅ **No server processing** - Everything runs in the browser
- ✅ **Instant playback** - No waiting for stitching/rendering
- ✅ **Zero infrastructure costs** - Just video storage
- ✅ **Better UX for short clips** - TikTok-style is familiar to users
- ✅ **Smooth transitions** - CSS-based fade effects (300ms)
- ✅ **Preloading** - Next clip loads while current plays
- ✅ **Mobile-optimized** - Works great on all devices

## Features

### Core Functionality
- **Sequential Playback** - Plays clips in order, one after another
- **Smooth Transitions** - 300ms fade between clips
- **Auto-loop** - Optional loop back to first clip
- **Scene Navigation** - Skip to any scene with dot navigation
- **Progress Bar** - Shows progress within current clip
- **Responsive Controls** - Play/pause, next/previous, scene counter

### UI/UX
- **TikTok-style interface** - Familiar vertical/horizontal layout
- **Aspect ratio support** - 16:9 (desktop), 1:1 (mobile), 9:16 (stories)
- **Preloading** - Next video loads in background
- **Touch-friendly** - Large buttons, swipe-friendly
- **Dark theme** - Optimized for video viewing

### Download Options
- **Single clip** - Downloads current clip directly
- **Multiple clips** - Downloads all clips sequentially (one by one)
- **Future:** Client-side stitching with MediaRecorder API (experimental)

## Implementation

### Component Structure

```typescript
<SequentialVideoPlayer
  clips={[
    { id: 'scene-1', url: 'https://...', title: 'Scene 1', duration: 8 },
    { id: 'scene-2', url: 'https://...', title: 'Scene 2', duration: 8 },
  ]}
  autoPlay={false}
  loop={true}
  enableDownload={true}
  onDownload={handleDownload}
  aspectRatio="16:9"
  transitionDuration={300}
/>
```

### Key Files
- **[SequentialVideoPlayer.tsx](../../../src/components/cinematic/SequentialVideoPlayer.tsx)** - Main player component
- **[CinematicResults.tsx](../../../src/services/cinematic/pages/CinematicResults.tsx)** - Integration into results page
- **[videoStitcher.ts](../../../src/services/cinematic/utils/videoStitcher.ts)** - Download utilities

## User Flow

1. **Generation**
   - User asks a question
   - System generates 3-4 scenes (8 seconds each)
   - Each scene is a separate VEO 3.1 video

2. **Playback**
   - Sequential player loads first clip
   - User clicks play
   - Clips play one after another with smooth transitions
   - Optional loop back to start

3. **Navigation**
   - Click dots to jump to specific scene
   - Use prev/next buttons
   - See progress bar for current clip
   - See scene counter (e.g., "2 / 4")

4. **Download**
   - Single scene: Downloads that clip as MP4
   - Multiple scenes: Downloads all clips sequentially as separate files
   - Future: Option to stitch on client-side (MediaRecorder API)

## Technical Details

### Transition Effect
```typescript
// Fade transition between clips
setIsTransitioning(true);
setTimeout(() => {
  setCurrentIndex(nextIndex);
  setIsTransitioning(false);
}, transitionDuration); // 300ms
```

### Preloading Strategy
```typescript
// Preload next video while current plays
<video ref={nextVideoRef} src={nextClip.url} preload="auto" className="hidden" />
```

### Progress Tracking
```typescript
// Track progress within current clip
const handleTimeUpdate = () => {
  const progress = (video.currentTime / video.duration) * 100;
  setProgress(progress);
};
```

## Comparison: Sequential vs Stitched

| Feature | Sequential Player | Stitched Video |
|---------|------------------|----------------|
| Server processing | ❌ None | ✅ FFmpeg required |
| Wait time | ✅ Instant | ❌ 30-60 seconds |
| Infrastructure cost | ✅ Free | ❌ $$/month |
| Mobile playback | ✅ Excellent | ✅ Good |
| Download | ⚠️ Multiple files | ✅ Single file |
| Editing/sharing | ⚠️ Harder | ✅ Easier |
| UX familiarity | ✅ TikTok-like | ⚠️ Traditional |

## Future Enhancements

### Client-Side Stitching (Optional)
For users who want a single file, we can add:
- **MediaRecorder API** - Record canvas playback to WebM
- **FFmpeg.wasm** - Stitch MP4s in browser (heavy, slow)
- **Background processing** - Use Web Workers

### Advanced Features
- **Crossfade transitions** - Blend frames between clips
- **Custom transition effects** - Wipe, slide, zoom
- **Audio mixing** - Fade in/out narration
- **Text overlays** - Client-side canvas rendering
- **Playback speed** - 0.5x, 1x, 1.5x, 2x

## Performance

### Load Times
- **First clip:** ~500ms (depends on video size)
- **Transition:** 300ms fade
- **Preload next:** Background, no impact
- **Total playback:** Instant after first load

### Browser Support
- ✅ Chrome/Edge (Chromium)
- ✅ Safari (iOS/macOS)
- ✅ Firefox
- ✅ Mobile browsers (all major)

### Video Specs
- **Duration:** 8 seconds per clip
- **Resolution:** 1024x1024 (1:1), 1024x576 (16:9)
- **Format:** MP4 (H.264)
- **Bitrate:** ~2-5 Mbps
- **File size:** ~1-5 MB per clip

## Related Documentation

- [FFmpeg Edge Function Limitation](../fixes/FFMPEG_EDGE_FUNCTION_LIMITATION.md)
- [Cinematic AI Implementation](../architecture/CINEMATICAI_IMPLEMENTATION_PLAN.md)
- [VEO Video Generation](../guides/VEO_VIDEO_GENERATION_WORKFLOW.md)

## Summary

The **Sequential Video Player** provides a simple, efficient, zero-cost solution for playing short cinematic clips. It's optimized for the 8-second format, provides a familiar TikTok-style UX, and eliminates the need for expensive server-side video processing.

For most use cases (especially short educational clips), this approach is **better than stitching** because:
1. Users get instant results (no waiting for rendering)
2. No infrastructure costs
3. Familiar UX (TikTok/Reels pattern)
4. Mobile-optimized
5. Easy to maintain

If users need a single file for editing/sharing, we can add optional client-side stitching in the future.
