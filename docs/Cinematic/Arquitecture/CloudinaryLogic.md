# ✅ AI Agent TODO — Video Retrofit Pipeline (Audio + Text + Final Publish Only)

## 🚫 Critical Rules (Must Follow)

* ❌ NEVER save any raw or intermediate video to Supabase
* ❌ NEVER publish or play raw video (only final quality processed version allowed)
* ✔️ Scene previews are allowed (draft state only)
* ✔️ Only final processed video can be marked as publishable / playable / storable / 
* ✔️ Only if there is no final queality processed video is available for an scene use fast video procesed with audio and captions as publishable / playable / storable /


# 🎬 Pipeline Overview

## 1. Scene Generation Phase

* Generate scene (fast or quality mode)
* Immediately mark scene with status:

  * `"draft"` OR `"final_indicator: pending processing"`
* Add scene to **preview system immediately**
* Do NOT persist anything to Supabase at this stage

---

## 2. Media Upload Phase (Cloudinary)

For every generated scene:

* Upload base video to Cloudinary
* Attach:

  * Scene video
  * Associated script text (for narration)
  * ElevenLabs generated audio (voiceover)

---

## 3. Audio Processing (ElevenLabs + Mixing Request)

* Generate voiceover using ElevenLabs from scene text
* Send to Cloudinary processing request:

  * Mix ElevenLabs audio into video
  * Reduce original video audio volume (background ducking)
  * Ensure ElevenLabs voice is dominant and clear

---

## 4. Captioning

Request Cloudinary to:

* Generate captions from provided scene text
* Sync captions with ElevenLabs audio timing
* Burn captions into video (hard subtitles preferred unless configurable)

---

## 5. Video Editing / Alignment Rules

Ask Cloudinary processing to:

* Trim video duration to match:

  * Audio duration (ElevenLabs voice)
  * Caption timing
* If video is longer than narration:

  * Cut or speed-adjust intelligently
* If video is shorter:

  * Loop or extend background visuals (if needed)

---

## 6. Compression & Optimization

Request:

* Final video compression (web optimized)
* Keep quality high but reduce file size
* Ensure smooth playback across devices

---

## 7. Final Output Definition

Only when ALL steps are complete:

Mark scene as:

* `"status": "final"`
* `"ready_for_playback": true`

Output must include:

* Final Cloudinary video URL only
* Embedded audio (ElevenLabs mixed)
* Captions burned in
* No raw assets exposed

---

## 8. Supabase Rule (Strict)

* ❌ DO NOT create or update Supabase row with:

  * raw video
  * intermediate video
  * draft video
* ✔️ ONLY allow Supabase save when:

  * video is fully processed
  * audio is mixed
  * captions are embedded
  * compression complete
  * Cloudinary final URL exists for each scene
    finally upload all final scenes in sequence to cloudnary and ask to mix and compress and download the full VIDEO and save to Supabase
    Also add the URL to download and URL to share in the button below the video
    

---

## 9. Playback Rule

* ❌ NEVER play raw or draft video
* ✔️ ONLY play:

  * final Cloudinary-rendered Scenes

---

## 10. Scene Preview Rule

* Scene previews are allowed but must include:

  * visual draft only
  * status indicator (draft / processing)
* No audio playback required at preview stage

---

# 🧠 Summary Logic (One Line)

> Generate → Preview draft → Upload to Cloudinary → Add ElevenLabs audio → Duck original audio → Add captions → Sync timing → Trim/extend → Compress → Output final video → THEN allow Supabase save & playback

---

If you want, I can convert this into:

* a JSON workflow spec for an agent system
* or a LangGraph / n8n pipeline definition
* or a strict OpenAI tool-calling schema
