# 🎬 Studio Architecture - Phase 6 Implementation Guide

## Default Studio Output (MVP)

### Video Format Specifications

**Duration:** 30s (range: 20-90s, flexible to match content)  
**Ratio:** 
- Vertical 9:16 (mobile/TikTok/Reels/Shorts)
- Horizontal 16:9 (desktop/YouTube)

### Video Structure (5-scene template)

1. **Hook (3s)**  
   → Strong stock video + large text  
   → Image overlay: None (video-only for impact)

2. **Key Point 1 (7s)**  
   → Stock video background + text animation + subtitles  
   → Image overlay: Optional (supporting evidence)

3. **Key Point 2 (7s)**  
   → **Brave Image Search overlay** (blur + zoom effect)  
   → Stock video base layer continues

4. **Key Point 3 (7s)**  
   → Stock video + supporting visuals  
   → Image overlay: Optional

5. **Conclusion (5s)**  
   → Stock video + CTA  
   → Image overlay: None

---

## Asset Strategy

### Base Layer (Background)
- ✅ Stock videos from Pexels/Unsplash
- Continuous, cinematic footage
- Mood-driven (emotion + context)
- **Layer:** z-index 1 (bottom)

### Overlay Layer (Supporting Evidence)
- ✅ Brave Image Search results
- Short duration (3-5s per image)
- Used for key points only (2-3 per video)
- **Never as continuous background**
- Effects: Ken Burns, blur, zoom, fade
- **Layer:** z-index 5 (middle)

### Audio Layer
- ✅ OpenAI TTS narration
- Clear, neutral voice (nova default)
- Fast pacing
- Synchronized with scenes
- **Layer:** Audio track

### Text Layer
- ✅ Large, readable subtitles
- Works without sound
- Animated overlays
- Minimal branding
- **Layer:** z-index 10 (top)

---

## Why This Format is Most Viral

**Key Success Factors:**
- ✅ Understandable without sound (subtitles)
- ✅ Grabs attention in 5 seconds (strong hook)
- ✅ Not dependent on realism (simple visuals)
- ✅ Perceived as "useful," not tech demo
- ✅ Shareable across platforms:
  - WhatsApp
  - Instagram Reels
  - TikTok
  - LinkedIn
  - YouTube Shorts

---

## How to Make It Sticky

### Critical Retention Decisions

**1. Consistent Format**
- Always same visual style
- Recognizable in feed
- Predictable structure

**2. Human Language**
- Not corporate
- Not academic
- Conversational: "Here's what's really going on..."

**3. Subtle Branding**
- Soft intro/outro (2s max)
- "Created with CuriosAI"
- Light watermark (bottom right corner)

---

## Critical Rule for Visual Search

### The Most Important Guideline

❌ **DO NOT** search what the user asked  
✅ **DO** search the visual idea that represents it

### Example Query Engineering

**User query:** "Is AI taking jobs?"

❌ **Bad search:** `AI jobs automation`  
→ Results: Charts, logos, generic office photos

✅ **Good search:** `empty office people leaving deserted workplace uncertainty editorial photography`  
→ Results: Cinematic, emotional, metaphorical imagery

---

## Search Strategy for Web Images

### Query Engineering Framework

**Use 3-5 keywords per concept:**
- Mood + Action + Metaphor
- Include topic briefly if needed
- Always add "editorial photography" for quality

### Three Search Buckets (Use in Order)

#### 🟢 Bucket 1 — Context / Mood

*What emotion does the topic convey?*

**Examples:**
- uncertainty
- growth
- pressure
- innovation
- simplicity
- chaos
- focus
- urgency
- calm
- tension

👉 This yields "cinematic" images perfect for backgrounds

---

#### 🔵 Bucket 2 — Human Action

*What is a person doing related to the topic?*

**Examples:**
- thinking
- working
- scrolling phone
- presenting
- explaining
- collaborating
- waiting
- celebrating
- stressed
- overwhelmed
- focused
- discussing

👉 This provides relatable, human-centered imagery

---

#### 🟠 Bucket 3 — Metaphor / Object

*What object or scene symbolizes the concept?*

**Examples (for "AI taking jobs"):**
- empty desk
- closed door
- robot arm
- computer screen
- abandoned office
- handshake
- factory floor
- digital interface

👉 This gives concrete visual anchors

---

## Engineering Formula

```
[Metaphor] + [Action] + [Mood] + [Context] + "editorial photography"
```

### Real Examples

| Topic | Raw Query | Engineered Query |
|-------|-----------|------------------|
| AI Safety | "AI safety concerns" | `robot hand human uncertainty ethical dilemma editorial photography` |
| Climate Change | "global warming effects" | `dry earth cracked ground extreme heat desolation editorial` |
| Mental Health | "workplace stress" | `person overwhelmed office pressure anxiety burnout editorial` |
| Remote Work | "remote work declining" | `empty office deserted workplace closed doors uncertainty editorial` |
| Innovation | "tech innovation" | `breakthrough light collaboration future optimistic editorial` |

---

## Video Generation Pipeline (Phase 6 - Chunked Rendering)

### Architecture Overview

```
User Request
    ↓
Generate Video Recipe (LLM)
    ↓
[PARALLEL ASSET FETCHING - 5 seconds total]
    ├─ Stock Videos (Pexels) - background
    ├─ Images (Brave Search) - overlays
    └─ Audio (OpenAI TTS) - narration
    ↓
Split into Chunks (5-10s each, respect sentences)
    ↓
Render Chunks in Parallel (3 at a time)
    ├─ Chunk 0: 0-7s    [render] → [upload] → ready
    ├─ Chunk 1: 7-14s   [render] → [upload] → ready
    └─ Chunk 2: 14-21s  [render] → [upload] → ready
    ↓
Progressive Playback (start at 15s)
    ↓
[Optional] Stitch Final Video (for download)
```

### Why Chunked Rendering?

**Problem:** 
- Serverless functions timeout (Netlify: 10s, Supabase: 60s)
- 60s video takes 45-60s to render = TIMEOUT
- User waits entire duration before seeing anything

**Solution:** 
- Split 60s video into 8 × 7.5s chunks
- Render 3 chunks in parallel
- Each chunk: 3-7s render time (well under limits)
- Start playback as soon as first chunk ready

**Benefits:**
- ⚡ Time-to-first-frame: **15s** (vs 60s)
- 🚀 Parallel rendering: **3x speed** improvement
- 💰 No serverless timeouts
- 📱 Progressive playback: watch while rendering
- 🔄 Retry individual chunks on failure (not entire video)

---

### Flow Example (60s Video)

**Step 1:** User query → LLM generates recipe JSON

```json
{
  "duration": 60,
  "chunks": [
    {
      "id": "chunk_0",
      "start": 0,
      "end": 7,
      "script": "Remote work is declining worldwide...",
      "mood": "uncertain",
      "videoKeywords": ["empty office", "deserted workplace", "closed doors"],
      "imageKeywords": ["people leaving work", "uncertain future", "office exodus"],
      "imageOverlay": {
        "enabled": false,
        "reason": "Hook scene - video only for maximum impact"
      }
    },
    {
      "id": "chunk_1",
      "start": 7,
      "end": 14,
      "script": "Companies are bringing employees back to the office...",
      "mood": "hopeful",
      "videoKeywords": ["team meeting", "collaboration", "office interaction"],
      "imageKeywords": ["handshake", "teamwork", "office reunion"],
      "imageOverlay": {
        "enabled": true,
        "timing": "4-7s",
        "effect": "ken-burns",
        "opacity": 0.8
      }
    },
    {
      "id": "chunk_2",
      "start": 14,
      "end": 21,
      "script": "This shift is driven by productivity concerns...",
      "mood": "analytical",
      "videoKeywords": ["data analysis", "charts", "business metrics"],
      "imageKeywords": ["graph trending down", "productivity metrics", "data visualization"],
      "imageOverlay": {
        "enabled": true,
        "timing": "2-5s",
        "effect": "blur",
        "opacity": 0.7
      }
    }
  ]
}
```

**Step 2:** Asset Fetching (Parallel - 5 seconds total)

```typescript
// All three happen simultaneously
const [videos, images, audio] = await Promise.all([
  // Pexels: 1 API call for entire video
  pexelsService.searchForVideo("empty office deserted workplace"),
  
  // Brave: 2 API calls for image overlays
  Promise.all([
    braveImageSearch("handshake teamwork office reunion editorial"),
    braveImageSearch("graph trending down productivity metrics editorial")
  ]),
  
  // OpenAI TTS: 1 API call for full narration
  ttsService.generateFullNarration(allSceneText)
]);
```

**Step 3:** Chunk Planning (Respect Sentence Boundaries)

```typescript
// GOOD: Split at sentence end
Chunk 0: "Remote work is declining worldwide."  ← Complete sentence
Chunk 1: "Companies are bringing employees back to the office."  ← Complete

// BAD: Mid-sentence split
Chunk 0: "Remote work is declining world-"  ← CUT MID-WORD
Chunk 1: "-wide. Companies are..."  ← BROKEN SENTENCE
```

**Sentence Boundary Detection:**
```typescript
function isSentenceBoundary(text: string): boolean {
  // Check if text ends with sentence-ending punctuation
  return /[.!?]\s*$/.test(text.trim());
}
```

**Step 4:** Render Chunks in Priority Order

```
Priority Queue:
  HIGH:   Chunk 0 (hook)         - render first
  HIGH:   Chunk 2 (has image)    - render second
  NORMAL: Chunk 1, 3, 4, 5, 6, 7 - render after

Parallel Execution:
  Batch 1: [Chunk 0, Chunk 2, Chunk 1] → 7s render time
  Batch 2: [Chunk 3, Chunk 4, Chunk 5] → 7s render time
  Batch 3: [Chunk 6, Chunk 7]         → 5s render time

Total time: 19s (vs 60s for full video)
```

**Step 5:** Progressive Playback

```
At 15s: Chunk 0 ready → START PLAYBACK
At 17s: Chunk 1 ready → seamless transition
At 20s: Chunk 2 ready → continue
At 25s: Chunk 3 ready → continue
...
User watching from 15s, rendering finishes at 35s
Net experience: 15s wait, not 60s
```

**Step 6:** [Optional] Final Stitching

```typescript
// For download/sharing, stitch chunks into single MP4
const finalVideo = await stitchChunks([
  chunk0.mp4,
  chunk1.mp4,
  chunk2.mp4,
  // ... all chunks
]);

// Upload to permanent storage
const downloadUrl = await uploadFinalVideo(finalVideo);
```

---

## Engineered Query Examples

### For Stock Video Background (Pexels)

```typescript
function engineerVideoQuery(scene: VideoScene): string {
  const mood = scene.style; // hook, explain, takeaway, outro
  const metaphor = extractMetaphor(scene.text);
  
  // Mood mapping
  const moodKeywords = {
    hook: 'dramatic intense cinematic',
    explain: 'clear focused professional',
    takeaway: 'inspiring hopeful bright',
    outro: 'conclusive satisfying calm'
  };
  
  return `${metaphor} ${moodKeywords[mood]} high quality footage`;
}

// Examples:
// Hook: "empty office dramatic intense cinematic high quality footage"
// Explain: "team meeting clear focused professional high quality footage"
```

### For Image Overlay (Brave Search)

```typescript
function engineerImageQuery(scene: VideoScene): string {
  const { mood, action, metaphor } = analyzeScene(scene);
  
  return `${metaphor} ${action} ${mood} editorial photography`;
}

// Examples:
// "handshake teamwork hopeful editorial photography"
// "graph trending down uncertainty editorial photography"
// "person overwhelmed stress burnout editorial photography"
```

### Query Quality Checklist

✅ **Include emotion/mood** (uncertain, hopeful, urgent)  
✅ **Include human action** (leaving, collaborating, thinking)  
✅ **Include metaphor/object** (empty office, handshake, graph)  
✅ **Add quality modifier** ("editorial photography" or "high quality footage")  
❌ **Avoid literal user query** (no "AI taking jobs")  
❌ **Avoid technical jargon** (no "machine learning algorithm")  
❌ **Avoid brand names** (generic visuals only)

---

## Video Recipe JSON Structure (Complete)

```typescript
interface VideoRecipe {
  videoId: string;
  duration: number; // total seconds
  format: 'vertical' | 'horizontal';
  
  // Chunks for rendering
  chunks: VideoChunk[];
  
  // Global assets (applied to all chunks)
  globalAssets: {
    backgroundVideo: string;  // Pexels URL
    narrationAudio: string;   // OpenAI TTS data URL
    accentColor: string;      // Brand color
  };
  
  // Metadata
  metadata: {
    userQuery: string;
    generatedAt: string;
    estimatedRenderTime: number; // seconds
  };
}

interface VideoChunk {
  id: string;              // chunk_0, chunk_1, etc.
  index: number;
  startTime: number;       // seconds
  endTime: number;
  startFrame: number;      // 30 FPS
  endFrame: number;
  
  // Content
  script: string;
  mood: string;
  
  // Assets specific to this chunk
  videoKeywords: string[];
  imageOverlay?: {
    enabled: boolean;
    imageUrl?: string;
    keywords?: string[];
    timing: string;        // "2-5s" within chunk
    effect: 'zoom' | 'blur' | 'ken-burns' | 'fade';
    position: 'center' | 'top' | 'bottom';
    opacity: number;       // 0-1
  };
  
  // Scenes within this chunk
  scenes: VideoScene[];
  
  // Rendering
  priority: 'high' | 'normal';
  status: 'pending' | 'rendering' | 'complete' | 'failed';
  chunkUrl?: string;       // URL after rendering
}
```

---

## Implementation Checklist

### Phase 6A: Brave Image Search Integration

- [ ] Create `ImageAssetAgent` service
- [ ] Implement query engineering logic (3 buckets)
- [ ] Add image overlay assignment strategies
- [ ] Update `VideoScene` types with image fields
- [ ] Create `ImageOverlay` Remotion component
- [ ] Add image effects (Ken Burns, blur, zoom, fade)
- [ ] Update orchestrator to fetch images in parallel
- [ ] Test image search and overlay rendering

### Phase 6B: Chunked Rendering

- [ ] Create `ChunkPlanner` service
- [ ] Implement sentence boundary detection
- [ ] Create `ChunkedRenderer` service
- [ ] Build Netlify function for chunk rendering
- [ ] Implement Supabase Storage upload
- [ ] Add chunk prioritization logic
- [ ] Update orchestrator for chunked workflow
- [ ] Test parallel chunk rendering

### Phase 6C: Progressive Playback

- [ ] Create `ProgressivePlayer` component
- [ ] Implement chunk buffering logic
- [ ] Add seamless chunk transitions
- [ ] Create rendering progress UI
- [ ] Update `StudioResults` to use ProgressivePlayer
- [ ] Test progressive playback experience
- [ ] Add error handling for failed chunks

---

## Performance Targets

### Speed Metrics
- ⚡ First chunk ready: **<15 seconds**
- 🚀 Full video ready: **<35 seconds** (8 chunks × ~4s avg)
- 💾 Asset fetching: **<5 seconds** (parallel)
- 📹 Chunk rendering: **<10 seconds** each (serverless-safe)

### Quality Metrics
- 🎯 No mid-sentence splits: **100%** (validation check)
- 🖼️ Image relevance: **>80%** (manual review of engineered queries)
- 🔄 Smooth transitions: **Seamless** (no visible cuts between chunks)
- 🎬 Progressive playback: **Works** without buffering

### Cost Metrics
- 💰 API cost per video: **<$0.05** (Pexels free, Brave ~$0.01, OpenAI ~$0.03)
- 💾 Storage cost: **<$0.01** per video (Supabase)
- 📊 Bandwidth: **Minimal** (chunks cached)

---

## API Configuration

### Required Environment Variables

```bash
# .env.local

# OpenAI (content generation + TTS)
VITE_OPENAI_API_KEY=sk-...

# Pexels (stock videos)
VITE_PEXELS_API_KEY=...

# Brave (image search) - NEW
BRAVE_API_KEY=...
```

### Optional Configuration

```typescript
// In orchestrator or Studio settings
const renderConfig = {
  // Image overlay strategy
  imageStrategy: 'key-points', // 'key-points' | 'all-scenes' | 'none'
  maxImagesPerVideo: 3,
  
  // Chunked rendering
  enableChunking: true,
  chunkTargetDuration: 7, // seconds
  maxParallelChunks: 3,
  
  // Playback
  enableProgressivePlayback: true,
  
  // Quality
  renderQuality: 'balanced', // 'fast' | 'balanced' | 'high'
};
```

---

## Testing Strategy

### Manual Testing Checklist

**Image Search:**
- [ ] Generate video with query: "Why is AI dangerous?"
- [ ] Verify Brave images appear as overlays (2-3 images)
- [ ] Check images are relevant (not literal user query)
- [ ] Verify image effects work (Ken Burns, blur, zoom)
- [ ] Test without BRAVE_API_KEY (graceful fallback)

**Chunked Rendering:**
- [ ] Generate 60s video
- [ ] Verify splits into 8-9 chunks
- [ ] Check no mid-sentence splits (validate each chunk)
- [ ] Verify 3 chunks render in parallel
- [ ] Check each chunk <10s render time
- [ ] Test chunk upload to Supabase Storage

**Progressive Playback:**
- [ ] Start playback when first chunk ready (~15s)
- [ ] Verify smooth transitions between chunks
- [ ] Check buffering of next chunks
- [ ] Verify rendering progress UI updates
- [ ] Test error handling (simulate chunk failure)

---

## Summary

Phase 6 transforms Studio into a production-ready, serverless-friendly video generation system with:

**New Capabilities:**
1. 🖼️ **Brave Image Search** - Supporting evidence overlays with engineered queries
2. ✂️ **Chunked Rendering** - 5-10s segments, parallel generation, no timeouts
3. ▶️ **Progressive Playback** - Start watching immediately, render continues

**Key Benefits:**
- ⚡ **3x faster** time-to-first-frame (15s vs 60s)
- 🚀 **3x faster** overall rendering (parallel chunks)
- 💰 **100% serverless-compatible** (no timeouts)
- 🎨 **Richer visuals** (videos + images + audio)
- 📱 **Better UX** (progressive loading)

**Implementation Timeline:**
- Week 1: Brave Image Search Integration (6A)
- Week 2: Chunked Rendering (6B)
- Week 3: Progressive Playback (6C)
- Week 4: Testing & Optimization

**Ready to implement! 🚀📹✨**
