# Video Specifications for CuriosAI Studio 🎬

## Overview

CuriosAI Studio generates **short-form videos** optimized for social media platforms (YouTube Shorts, Instagram Reels, TikTok). This document outlines the video specifications, render times, and cost implications.

---

## Video Format

### Duration
- **Target**: 20-40 seconds (perfect for Shorts/Reels)
- **Minimum**: 15 seconds
- **Maximum**: 60 seconds (not recommended - longer render times)

### Aspect Ratios
- **Vertical (9:16)**: 1080x1920 (mobile, default)
- **Horizontal (16:9)**: 1920x1080 (desktop)
- **Square (1:1)**: 1080x1080 (Instagram posts)

### Codec & Quality
- **Format**: H.264 MP4
- **Frame Rate**: 30 FPS
- **Quality Options**:
  - `fast`: CRF 28 (~5-8 MB per video)
  - `balanced`: CRF 23 (~8-12 MB per video) ⭐ **Default**
  - `high`: CRF 18 (~15-25 MB per video)

---

## Chunked Rendering Architecture

### Why Chunks?

Instead of rendering one large video file, we split into **chunks** for:
1. **Progressive playback**: Start playing while still rendering
2. **Parallel processing**: Render multiple chunks simultaneously
3. **Resilience**: If one chunk fails, others continue
4. **Cost optimization**: Shorter function executions

### Chunk Specifications

| Video Duration | Chunk Size | Number of Chunks | Example |
|----------------|------------|------------------|---------|
| 20 seconds | 5-6 seconds | 3-4 chunks | 5s + 5s + 5s + 5s |
| 30 seconds | 6-7 seconds | 4-5 chunks | 7s + 7s + 7s + 9s |
| 40 seconds | 7-8 seconds | 5-6 chunks | 8s + 8s + 8s + 8s + 8s |
| 60 seconds | 10 seconds | 6 chunks | 10s + 10s + 10s + 10s + 10s + 10s |

**Smart Splitting**:
- Chunks split at **sentence boundaries** (no mid-sentence cuts)
- Minimum chunk: **3 seconds** (avoid too-short chunks)
- Maximum chunk: **12 seconds** (avoid Netlify timeouts)

---

## Render Time Estimates

### Remotion Rendering Speed

Remotion renders at **~2-3x realtime** depending on:
- Scene complexity (number of images, animations)
- Quality setting (fast/balanced/high)
- Server CPU power

### Per-Chunk Render Time

| Chunk Duration | Render Time (balanced) | Render Time (fast) |
|----------------|------------------------|---------------------|
| 5 seconds | 10-15 seconds | 8-12 seconds |
| 7 seconds | 14-21 seconds | 10-15 seconds |
| 10 seconds | 20-30 seconds | 15-20 seconds |

**⚠️ Important**: Netlify timeout limits:
- **Free tier**: 10 seconds → Max ~5s video chunks
- **Pro tier**: 26 seconds → Max ~10s video chunks

### Total Video Render Time

**With parallel rendering** (3 chunks at once):

| Video Duration | Chunks | Render Time (sequential) | Render Time (parallel) |
|----------------|--------|--------------------------|------------------------|
| 20 seconds | 4 chunks | ~60 seconds | ~30 seconds |
| 30 seconds | 5 chunks | ~90 seconds | ~40 seconds |
| 40 seconds | 6 chunks | ~120 seconds | ~60 seconds |

**Example**: 30-second video with 5 chunks (7s each)
```
Chunk 0, 1, 2: Render in parallel (batch 1) → ~20 seconds
Chunk 3, 4: Render in parallel (batch 2) → ~20 seconds
Total: ~40 seconds
```

---

## Scene Structure

### Scene Duration
- **Minimum**: 1 second (30 frames)
- **Typical**: 3-5 seconds per scene
- **Maximum**: 10 seconds per scene

### Scenes per Video
- **20s video**: 4-7 scenes
- **30s video**: 6-10 scenes
- **40s video**: 8-13 scenes

### Scene Styles
1. **Hook** (0-3s): Eye-catching opening
2. **Context** (3-8s): Setup/background
3. **Key Point** (8-15s): Main insight
4. **Detail** (15-25s): Supporting evidence
5. **Takeaway** (25-28s): Summary/CTA
6. **Outro** (28-30s): Branding/thanks

---

## Cost Analysis

### Netlify Function Costs

**Execution Time**:
- 5-chunk video (~35 function executions)
- Each chunk: ~20 seconds = **100 total seconds**

**Pricing**:
| Plan | Function Minutes/Month | Cost | Videos/Month (30s) |
|------|------------------------|------|--------------------|
| Free | 125,000 seconds | $0 | ~3,500 videos |
| Pro | 2 million seconds | ~$25 | ~57,000 videos |

**Monthly Cost** (estimated):
```
1,000 videos/month:
- 1,000 videos × 5 chunks × 20s = 100,000 seconds
- Free tier limit: 125,000 seconds
- Cost: $0 ✅
```

### Supabase Storage Costs

**File Sizes** (per video):
- Chunks: 5 × 2 MB = 10 MB
- Full video: 10 MB
- Total: **20 MB per video**

**Pricing**:
| Storage | Bandwidth | Cost | Videos |
|---------|-----------|------|--------|
| 1 GB | 2 GB | $0 (free) | ~50 videos |
| 10 GB | 20 GB | ~$5/mo | ~500 videos |
| 100 GB | 200 GB | ~$20/mo | ~5,000 videos |

**Monthly Cost** (estimated):
```
100 videos/month:
- Storage: 100 × 20 MB = 2 GB
- Bandwidth: 100 × 50 views × 20 MB = 100 GB
- Cost: ~$10/mo
```

### Total Cost Breakdown

| Videos/Month | Netlify | Supabase | Total |
|--------------|---------|----------|-------|
| 100 | $0 | ~$10 | **$10** |
| 500 | $0 | ~$15 | **$15** |
| 1,000 | $0 | ~$20 | **$20** |
| 5,000 | ~$10 | ~$100 | **$110** |

---

## Optimization Tips

### 1. Reduce Render Time

✅ **Use `quality: 'fast'`**:
```typescript
await renderer.renderChunks(chunks, format, videoId, {
  quality: 'fast' // CRF 28 - 30% faster
});
```

✅ **Shorter chunks** (5-6 seconds):
```typescript
const planner = new ChunkPlanner(5); // 5s chunks instead of 7s
```

✅ **Fewer scenes per chunk**:
- Aim for 2-3 scenes per chunk (not 5+)
- Simple scenes render faster

### 2. Reduce Storage Costs

✅ **Delete old videos**:
```typescript
// Auto-delete videos after 30 days
await supabase.storage
  .from('studio-videos')
  .remove(oldVideoIds);
```

✅ **Compress videos**:
- Use `quality: 'fast'` (smaller files)
- Consider 720p for mobile-only (not 1080p)

✅ **CDN caching**:
- Supabase Storage has built-in CDN
- Videos cached at edge locations
- Reduces bandwidth costs

### 3. Parallel Rendering

✅ **Increase parallel chunks** (if resources allow):
```typescript
const renderer = new ChunkedRenderer(5, productionMode); // 5 parallel instead of 3
```

⚠️ **Caution**: More parallel = more Netlify function executions at once

---

## Technical Constraints

### Netlify Function Limits
| Tier | Timeout | Memory | Concurrent |
|------|---------|--------|------------|
| Free | 10s | 1 GB | 1 |
| Pro | 26s | 1 GB | 10 |
| Business | 26s | 1 GB | 50 |

**Recommendation**: Use **Netlify Pro** for production rendering

### Supabase Storage Limits
| Limit | Value |
|-------|-------|
| Max file size | 50 MB (per chunk) |
| Max upload size | 50 MB |
| Max storage (free) | 1 GB |
| Max bandwidth (free) | 2 GB |

**Recommendation**: Keep chunks under **10 MB** each

---

## Example: 30-Second Video

```typescript
// Video Specs
duration: 30 seconds
scenes: 7 scenes (4-5s each)
format: vertical (1080x1920)
quality: balanced (CRF 23)

// Chunk Plan
chunks: 5 chunks
- chunk_0: 6s (scenes 0-1)
- chunk_1: 6s (scenes 2-3)
- chunk_2: 6s (scenes 4)
- chunk_3: 6s (scenes 5-6)
- chunk_4: 6s (scene 7)

// Render Time
parallel batches: 2
- Batch 1: chunks 0,1,2 → 18 seconds
- Batch 2: chunks 3,4 → 18 seconds
total: ~36 seconds

// File Sizes
- chunk_0.mp4: 2.1 MB
- chunk_1.mp4: 2.0 MB
- chunk_2.mp4: 2.1 MB
- chunk_3.mp4: 2.0 MB
- chunk_4.mp4: 2.1 MB
total: 10.3 MB

// Cost (per video)
- Netlify: $0.001 (100 seconds)
- Supabase: $0.002 (storage + bandwidth)
total: ~$0.003 per video
```

---

## Recommendations

### ✅ Best Practices

1. **Keep videos short** (20-40 seconds)
2. **Use 5-7 second chunks** (optimal for Netlify timeouts)
3. **Quality: balanced** (good quality, reasonable size)
4. **Vertical format** (1080x1920 for mobile)
5. **Parallel rendering** (3 chunks at once)
6. **Netlify Pro tier** (for production workloads)

### ❌ Avoid

1. **Long videos** (>60 seconds) - expensive, slow
2. **Large chunks** (>10 seconds) - Netlify timeouts
3. **Too many scenes** (>15 per video) - rendering bottleneck
4. **High quality everywhere** - use for final exports only
5. **Sequential rendering** - much slower than parallel

---

## Summary

| Metric | Value |
|--------|-------|
| **Video duration** | 20-40 seconds |
| **Chunk size** | 5-7 seconds |
| **Render time** | ~10-20s per chunk |
| **Total render** | ~40-60s (parallel) |
| **File size** | ~10-15 MB per video |
| **Cost** | ~$0.01 per video |
| **Platform** | YouTube Shorts, Reels, TikTok |

**Perfect for**: Short-form social media content, quick turnaround, cost-effective production at scale.
