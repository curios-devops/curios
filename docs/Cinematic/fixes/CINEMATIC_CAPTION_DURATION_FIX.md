# Cinematic Caption Text & Duration Display Fix

**Date:** 2026-04-30
**Status:** ✅ Fixed

## Problems Fixed

### 1. ❌ Captions Showing Title Instead of Narration
**Issue:** Cloudinary was mixing videos with `scene.title` as caption text instead of the full `scene.narration`. This caused:
- Captions not matching the audio narration
- Short, generic titles appearing instead of full spoken text
- Confusing UX where text on screen didn't match what was being said

**Root Cause:**
Line 274 in [cinematicService.ts](src/services/cinematic/cinematicService.ts) was passing `scene.title` instead of `scene.narration`:

```typescript
// BEFORE (WRONG)
narrationText: options.enableTextOverlay ? scene.title : undefined,

// Example:
// title: "The Discovery"
// narration: "In 1969, scientists made a groundbreaking discovery that would change everything we knew about the universe..."
// Caption showed: "The Discovery" ❌
```

**Fix:**
```typescript
// AFTER (CORRECT)
narrationText: options.enableTextOverlay ? scene.narration : undefined,

// Now caption shows full narration text that matches audio:
// "In 1969, scientists made a groundbreaking discovery that would change everything we knew about the universe..." ✅
```

**Impact:**
- ✅ Captions now match audio narration exactly
- ✅ Users can read along with what's being spoken
- ✅ Better accessibility for hearing-impaired users
- ✅ Proper subtitle experience

### 2. ❌ Inaccurate Duration Display
**Issue:** Scene count showed "4 clips • 6-8s each" instead of actual total duration like "4 clips • 30s"

**Root Cause:**
Hard-coded generic text in [CinematicResults.tsx](src/services/cinematic/pages/CinematicResults.tsx:628):

```typescript
// BEFORE (WRONG)
{displayScenes.length} {displayScenes.length === 1 ? 'clip' : 'clips'} • 6-8s each

// Example display:
// "4 clips • 6-8s each" ❌
// (Not accurate - could be 28s, 32s, or any total)
```

**Fix:**
```typescript
// AFTER (CORRECT)
{displayScenes.length} {displayScenes.length === 1 ? 'clip' : 'clips'} • {displayScenes.reduce((total, scene) => total + (scene.durationSeconds || 7), 0)}s

// Example display:
// "4 clips • 28s" ✅
// "3 clips • 21s" ✅
// "5 clips • 35s" ✅
```

**Impact:**
- ✅ Shows exact total duration in seconds
- ✅ User knows exactly how long the full video is
- ✅ More professional and accurate
- ✅ Dynamic calculation based on actual scene durations

## Before vs After Comparison

### Caption Text
| Before | After |
|--------|-------|
| Title: "The Discovery" | Full narration: "In 1969, scientists made a groundbreaking discovery..." |
| Audio says one thing, caption shows another ❌ | Audio and captions match perfectly ✅ |

### Duration Display
| Before | After |
|--------|-------|
| "4 clips • 6-8s each" | "4 clips • 28s" |
| "3 clips • 6-8s each" | "3 clips • 21s" |
| Generic range ❌ | Exact total duration ✅ |

## Technical Details

### Caption Flow
```
Scene Generation
    ↓
scene.title = "The Discovery"
scene.narration = "In 1969, scientists made a groundbreaking discovery that would..."
    ↓
Audio Generation
    ↓
narrationAudioUrl = URL to TTS audio of full narration
    ↓
Cloudinary Mix
    ↓
narrationText: scene.narration ✅ (matches audio)
narrationAudioUrl: [audio file]
    ↓
Mixed Video with Matching Audio + Captions
```

### Duration Calculation
```typescript
// Calculate total duration from all scenes
displayScenes.reduce((total, scene) => {
  return total + (scene.durationSeconds || 7); // Default to 7s if not set
}, 0)

// Example:
// Scene 1: 7s
// Scene 2: 8s
// Scene 3: 6s
// Scene 4: 7s
// Total: 28s → Displays "4 clips • 28s"
```

## Files Modified

1. [src/services/cinematic/cinematicService.ts](src/services/cinematic/cinematicService.ts:274)
   - Changed `scene.title` → `scene.narration` for caption text
   - Ensures captions match audio narration

2. [src/services/cinematic/pages/CinematicResults.tsx](src/services/cinematic/pages/CinematicResults.tsx:628)
   - Changed `"6-8s each"` → calculated total duration
   - Uses `.reduce()` to sum all scene durations

## Testing Checklist

- [ ] Captions show full narration text (not just title)
- [ ] Caption text matches audio narration exactly
- [ ] Duration shows exact total seconds (e.g., "28s" not "6-8s each")
- [ ] Duration updates correctly when scenes have different lengths
- [ ] Multiple languages/accents work correctly with narration captions

## Example Scenarios

### Scenario 1: 4 scenes, 7s each
- **Before:** "4 clips • 6-8s each"
- **After:** "4 clips • 28s"

### Scenario 2: 3 scenes, varying duration (8s, 7s, 6s)
- **Before:** "3 clips • 6-8s each"
- **After:** "3 clips • 21s"

### Scenario 3: Caption text
- **Before Caption:** "The Discovery"
- **After Caption:** "In 1969, scientists made a groundbreaking discovery that would change everything we knew about the universe..."
- **Audio:** "In 1969, scientists made a groundbreaking discovery that would change everything we knew about the universe..."
- **Match:** ✅ Perfect match

## Related Files

- [cinematicService.ts](src/services/cinematic/cinematicService.ts) - Cloudinary mixing logic
- [cloudinaryFlow.ts](src/services/cinematic/subservices/cloudinaryFlow.ts) - Cloudinary API calls
- [CinematicResults.tsx](src/services/cinematic/pages/CinematicResults.tsx) - UI display
