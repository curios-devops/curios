# 🍿 MOVIE MODE BLUEPRINT

## Overview

Movie Mode is a new premium content generation experience inspired by Cinematic.

Unlike Cinematic, where the user provides a creative prompt, Movie Mode starts from a question and automatically transforms that question into a cinematic visual explanation optimized for engagement, sharing, and virality.

Examples:

* Why is Bitcoin valuable?
* What happens if AI replaces all jobs?
* Why are housing prices rising?
* How did Rome become an empire?

Movie Mode automatically:

1. Enhances the question
2. Researches facts when needed
3. Creates a visual narrative
4. Writes a complete movie script
5. Generates a storyboard
6. Creates scene images
7. Generates scene videos
8. Creates narration
9. Plays scenes immediately while generation continues
10. Stitches all scenes into a final movie
11. Runs viral optimization
12. Produces a shareable final video

---

# New Directory

Create new application module:

/app/movie

Structure:

/app/movie
/components
/hooks
/services
/types
/utils
/page.tsx

---

# Homepage Integration

Add new dropdown option.

Current:

* Search
* Deep Research
* Cinematic

Add:

🍿 Movie

When selected:

Navigate to:

/movie

Movie page uses same design language as Cinematic.

Reuse:

* layout
* player
* progress system
* generation architecture
* job tracking

---

# User Input

Single input.

Example:

"Why is inflation happening?"

No prompt engineering required.

User asks a normal question.

---

# Generation Pipeline

Step 1

Question Enhancement Agent

Input:

Why is inflation happening?

Output:

Research Question

Visual Story Question

Example:

Research:

Explain inflation causes globally.

Visual:

Tell the story of a family experiencing rising prices.

---

# Step 2

Grounding Agent

Determine:

needs_search=true/false

If true:

Use existing search stack.

Priority:

1. Tavily
2. Brave
3. Wikipedia fallback

Output:

facts
statistics
citations
timeline

---

# Step 3

Movie Director Agent

Model:

GPT-5.5

Generate:

* narrative arc
* emotional beats
* scene structure
* visual metaphors
* narration script

Output:

Complete movie script.

Not prompts.

Actual screenplay.

---

# Step 4

Storyboard Agent

Convert screenplay into scenes.

Output:

[
scene1,
scene2,
scene3...
]

Each scene includes:

* duration
* narration
* image prompt
* video prompt
* transition style

Target:

6-20 scenes.

---

# Step 5

Image Generation

Use:

GPT Image-2

Reason:

Highest consistency.
Best storytelling quality.
Superior composition.

Generate:

16:9 cinematic images.

Store:

scene-images/

Each image immediately appears in carousel.

User sees progress instantly.

---

# Step 6

Narration

Use existing ElevenLabs integration.

Reuse existing API keys.

Voice selection:

Auto based on content.

Educational:
Professional narrator.

History:
Documentary narrator.

Science:
Curious narrator.

Output:

scene narration audio.

Store:

scene-audio/

---

# Step 7

Video Generation

Use:

LTX Video

Hosted on RunPod.

Do not use external APIs.

Reason:

Lower long-term cost.
Better scalability.
No vendor lock-in.

Deployment:

Dedicated RunPod endpoint.

Movie service sends:

image
prompt
duration

Returns:

scene video.

---

# Scene-Based Generation

DO NOT generate one large video.

Generate per scene.

Example:

Scene 1
5 sec

Scene 2
7 sec

Scene 3
6 sec

Advantages:

* Faster perceived speed
* Parallel rendering
* Retry individual scenes
* Better UX
* Lower failure impact

---

# Immediate Playback

Important.

As soon as Scene 1 is ready:

Start playback.

Do not wait.

Behavior:

Scene 1 ready

Auto-play.

Scene 2 finishes

Append queue.

Scene 3 finishes

Append queue.

Viewer behaves similarly to Cinematic.

User experiences continuous progress.

---

# Progressive Streaming

Playback order:

Scene 1
Scene 2
Scene 3
Scene 4

As scenes complete.

If next scene not ready:

Show cinematic loading transition.

Continue automatically.

---

# Stitching Service

After all scenes complete:

Trigger Cloudflare Video Stitch Worker.

Input:

scene1.mp4
scene2.mp4
scene3.mp4

Merge:

single_movie.mp4

Store:

movies/

Output:

final movie URL.

---

# Viewer Replacement

Current Viewer:

scene playlist

When final movie exists:

Automatically switch.

Replace playlist.

Display:

Final Movie Ready

Load:

single_movie.mp4

Playback begins from start.

---

# Viral Optimization Agent

After final movie generation.

Run:

Viral Director Agent

Analyze:

* hook
* pacing
* retention
* emotional impact
* shareability

Generate:

title
caption
hashtags
thumbnail text
viral score

Example:

Title:

"The Hidden Reason Homes Became Unaffordable"

Caption:

Most people blame greed.
The real answer is far more surprising.

Hashtags:

#economics
#housing
#explained
#ai

---

# Sharing System

One-click sharing.

Generate:

Share Page

/movie/share/{id}

Contains:

* video
* title
* caption
* thumbnail

Optimized for:

X
LinkedIn
Facebook
WhatsApp
TikTok download

---

# Storage

Images

R2:
/movie/images

Scene Videos

R2:
/movie/scenes

Final Movies

R2:
/movie/final

Metadata

Postgres

movie_projects

movie_scenes

movie_assets

movie_analytics

---

# RunPod Infrastructure

Recommended

2× RTX 4090

or

1× H100

Initial scale.

Autoscale later.

Services:

ltx-worker-1

ltx-worker-2

Queue:

BullMQ

Redis

---

# Cost Optimization

Generate:

Images first.

Then:

Only generate videos for approved storyboard.

Optional future feature:

Preview storyboard before rendering.

Can reduce video costs by 60%+.

---

# Success Metrics

Track:

* completion rate
* average watch time
* shares
* reposts
* downloads
* viral score
* engagement score

Primary KPI:

Shares per generated movie.

Goal:

Users generate movies that are inherently shareable.

My recommendation is to reuse the UI (except to moving the Scenes in desktop from behing to the side, and make it carrusel to get space forr all images) and  70–80% of the existing Cinematic infrastructure (job orchestration, progress tracking, asset storage, viewer, queueing, Cloudflare R2, sharing system, generation status UI) and only replace the content pipeline:

Cinematic: Prompt → Images → Video

Movie: Question → Research → Script → Storyboard → Images → Scene Videos → Full Movie → Viral Packaging (for the viral packaging make a new share section like a row with the icons of the social networks see how singularity put the row of socials and copy the UI row social from https://singularityhub.com/2026/06/12/is-richard-dawkins-right-about-claude-no-but-its-not-surprising-ai-chatbots-feel-conscious-to-us/ , just the socua row nothing else)

That will get Movie Mode into production much faster while keeping maintenance costs low and UX consistent.