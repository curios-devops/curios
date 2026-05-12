🎬 Cinematic Video Refactor – Feature Request

Goal: Improve the cinematic experience, UX, and shareability of generated videos.

1. Scene Display (UI/UX Update)
Resize all generated scenes from full-width to a smaller framed format, similar to the “Continue Exploring” section.
Scenes should feel like preview cards, not full video players.
Disable autoplay for all individual scenes.
Users should manually initiate playback if they want to preview a scene.
2. Full Video Generation (Core Feature)
Generate a single, complete video by stitching all scenes together in the correct sequence. using transitions between scenes so video  se as one fluid video no scenes just stiching together.
This full video should be the primary cinematic output.
3. Narrative Overlay (Text + Voice)
Embed the text explanation directly into the Scenes in parallel  (as captions or styled overlays synced with scenes).
Generate voice narration using:
Primary: ElevenLabs
Fallback: Whisper (if ElevenLabs is unavailable)
The narration should:
Follow the explanation flow
Be synchronized with scenes and text
Be mixed with the existing scene audio (not replacing it completely)
4. Audio Composition
Combine:
Existing scene audio (if any)
Generated voice narration
Ensure proper audio balancing so narration is clear but background audio is still present.
5. Video Persistence
Save the final generated video as a persistent asset.
The user should be able to:
Access it later
Replay it without regeneration
Share it externally
6. Engagement Action Bar

Add a button bar below the final video with:

Share (export / post to platforms like X)
Save (bookmark or store in user library)
Like
Feedback (collect qualitative input)
Expected Outcome

A polished cinematic experience where:

Scenes act as previews (not the main event)
The full video becomes the hero content
The video includes storytelling (text + narration), not just visuals
Users feel motivated to watch, save, and share