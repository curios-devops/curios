Here’s your **organized New Feature Request** for an LLM agent to implement the feature. I preserved your ideas, clarified structure, and added missing technical/spec elements where needed.

---

# 🎬 New Feature Request: **Curios Visual Answer (Cinematic AI)**

## 1. Overview

**Feature Name:** Curios Visual Answer (Cinematic AI)

**Concept:**
A new search experience where user queries generate **short cinematic videos (20–30s)** composed of multiple **micro-scenes (4–6s each)**.

Instead of:

* Google → text answers

We deliver:

* Curios → **cinematic explanations**

This should feel like:

> **“Netflix for knowledge.”**

---

## 2. Core Experience

### Input

* User submits a query from homepage

### Output

* Auto-generated cinematic video composed of multiple scenes
* Structured storytelling:

  1. Hook
  2. Explanation
  3. Mind-blowing insight

---

## 3. Example Experience

### Query:

> “Black holes explained”

### Generated Video:

* Scene 1: space cinematic
* Scene 2: gravity lensing animation
* Scene 3: event horizon visualization
* Scene 4: matter falling

**Scene duration:** 4–6 seconds
**Total video duration:** 20–30 seconds

---

### Example 2 (Detailed)

**Query:**

> Why do octopuses have 3 hearts?

**Generated Scenes:**

1. Hook

   * Visual: octopus swimming cinematic
   * Text: “Octopuses have THREE hearts.”

2. Explanation

   * Visual: anatomy visualization
   * Text: “Two pump blood to the gills.”

3. Explanation

   * Visual: circulation animation
   * Text: “The third pumps blood to the body.”

4. Insight

   * Visual: behavior animation
   * Text: “And when they swim… the heart stops.”

5. Conclusion

   * Visual: close octopus shot
   * Text: “That’s why octopuses prefer crawling.”

---

## 4. Workflow Pipeline

```
User Query (Homepage)
        ↓
Answer LLM
        ↓
Scene Director Agent
        ↓
Visual Style Selection
        ↓
Scene Generation
        ↓
Video Assembly (Composer)
```

---

## 5. System Architecture

### Required Agents (4 Total)

1. **Answer LLM**

   * Generates structured explanation
   * Extracts key concepts

2. **Scene Director (Core Agent)**

   * Converts explanation into scenes
   * Defines cinematic structure

3. **Visual Generator**

   * Produces visuals (video, animation, diagrams)

4. **Video Composer**

   * Assembles scenes into final video
   * Adds transitions, timing, audio (optional future)

---

## 6. Scene Director (Key Agent)

### Responsibilities

The Scene Director defines:

* `number_of_scenes`
* `scene_duration`
* `visual_style`
* `camera_motion`
* `emotion`
* `asset_type`

### Example Output Schema

```json
{
  "scenes": [
    {
      "id": 1,
      "type": "hook",
      "duration": 4,
      "visual_style": "cinematic ocean",
      "camera_motion": "slow pan",
      "emotion": "mystery",
      "asset_type": "real_world",
      "text": "Octopuses have THREE hearts."
    },
    {
      "id": 2,
      "type": "explanation",
      "visual_style": "scientific visualization",
      "asset_type": "diagram",
      "text": "Two pump blood to the gills."
    }
  ]
}
```

---

## 7. Visual Categories

The system must support **3 types of visuals**:

### 1️⃣ Cinematic Scenes

Used for storytelling, history, culture

Examples:

* Ancient Rome
* Pyramids
* Dinosaurs

---

### 2️⃣ Knowledge Visualization

Used for science explanations

Examples:

* Black holes
* Neurons
* Atoms
* Evolution

Formats:

* Generated animations
* Diagrams
* Infographics

---

### 3️⃣ Real-World Footage

Used for real-life subjects

Examples:

* Animals
* Cities
* Nature

---

## 8. Video Structure Rules

Each video MUST include:

### 1. Hook (first scene)

* Attention-grabbing
* Bold statement

### 2. Explanation (middle scenes)

* Clear breakdown
* Visual + text sync

### 3. Mind-Blow Moment (final scene)

* Key viral/shareable insight

---

### Example: Mind-Blow Moment

**Query:** How big is the universe?

Scene:

* Zoom out: Earth → Solar System → Galaxy → Cosmic Web
* Final text:

  > “You are here.”

---

## 9. UX/UI Design

### Base

* Based on current **Studio screen**
* With modified UX/UI for cinematic playback

### Visual Style Guidelines

* Dark cinematic background
* Glow accents
* Minimal typography
* Slow motion transitions
* Consistent visual identity (NOT random styles)

---

## 10. Interaction Model

### Curios Visual Thread

After a search, system suggests a **sequence of connected videos**.

#### Example:

Search: Black holes

Suggested thread:

1. What is a black hole
2. How they form
3. What happens if you fall into one
4. Could one destroy Earth

---

## 11. Key Product Principles

* Video is **not decorative**
* It is the **primary answer format**
* Must be:

  * Educational
  * Cinematic
  * Shareable

---

## 12. Shareability Requirement

Each video must include:

✅ A **“mind-blow moment”**
✅ A **clear narrative arc**
✅ Strong visual identity

Goal:

> Maximize social sharing and retention

---

## 13. Additional Considerations (Added)

### Performance

* Generate preview quickly (low-latency first frame)
* Progressive rendering for scenes

### Personalization (optional future)

* Adjust style based on user preference:

  * cinematic / educational / documentary

### Audio (future enhancement)

* Voice narration
* Ambient sound/music

### Export/Sharing

* Share as:

  * short video
  * vertical format (TikTok/Reels-ready)

