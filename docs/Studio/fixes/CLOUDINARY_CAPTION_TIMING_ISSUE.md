# Cloudinary Caption Timing Issue

## Problem
Text overlays (`l_text`) in Cloudinary **do not support `so` (start offset) parameter**. All text layers appear simultaneously, stacked on top of each other.

## What We Tried
1. `l_text:...,so_X,du_Y,fl_layer_apply` - All text appears at once
2. Using `/` separators - No effect
3. Using `e_fade` - Fades don't apply to individual text layers with timing

## Root Cause
According to Cloudinary documentation, **text overlays don't support timeline offsets (`so`/`eo`/`du`)**. These parameters only work for:
- Video overlays (`l_video`)
- Image overlays (`l_image`)
- **Not** text overlays (`l_text`)

## Solutions

### Option 1: Generate SRT file (Recommended)
Create a proper `.srt` subtitle file and use Cloudinary Video Player with `textTracks`:
- Pros: Proper subtitle timing, fade effects, player controls
- Cons: Requires client-side player, not burned into video

### Option 2: Pre-render text as images
Convert each caption to an image overlay, then use `l_image` with `so`/`du`:
- Pros: Burns captions into video
- Cons: More complex, need to generate images per caption

### Option 3: Use video concatenation
Create separate video segments with different text, then concatenate:
- Pros: Full control
- Cons: Very complex transformation URL

### Option 4: Accept limitation - Show all text
Just show all the narration text at once:
- Pros: Simple, works now
- Cons: Not ideal UX

## Recommendation
For cinematic video feature, we should either:
1. Generate SRT files from narration text and use Cloudinary Video Player
2. Or accept showing full narration text at once (simple captions, not timed)

## References
- https://cloudinary.com/documentation/video_layers
- https://cloudinary.com/documentation/video_player_subtitles_and_captions
