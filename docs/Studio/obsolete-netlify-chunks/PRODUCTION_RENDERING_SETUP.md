# Production Rendering Setup Guide 🎬

## Overview

This guide explains how to set up **production rendering** for Phase 6, enabling **real video generation** with Remotion and Supabase Storage.

---

## Architecture

```
User Request
    ↓
ChunkedRenderer (production mode)
    ↓
Netlify Function (render-chunk.mjs)
    ↓
Remotion Renderer (creates MP4)
    ↓
Supabase Storage (uploads video)
    ↓
Returns Public URL
    ↓
ProgressivePlayer (plays video)
```

**Video Specifications**:
- **Total video duration**: 20-40 seconds (optimized for Shorts/Reels)
- **Chunk duration**: 5-7 seconds per chunk (1-2 sentences)
- **Chunks per video**: 4-6 chunks
- **Render time**: ~10-20 seconds per chunk (2-3x realtime)
- **Total render time**: ~60-120 seconds for full video (parallel rendering)

---

## Step 1: Setup Supabase Storage Bucket

### 1.1 Run SQL Script

1. Open **Supabase Dashboard** → Your Project
2. Navigate to **SQL Editor**
3. Run the script: `/scripts/setup-studio-videos-bucket.sql`
4. Verify output shows bucket created successfully

**Expected Result**:
```
id: studio-videos
public: true
file_size_limit: 52428800 (50MB)
allowed_mime_types: {video/mp4, video/webm}
```

### 1.2 Verify Bucket

1. Go to **Storage** in Supabase Dashboard
2. You should see `studio-videos` bucket
3. Try uploading a test video to verify permissions

---

## Step 2: Configure Netlify Environment Variables

### 2.1 Get Supabase Service Role Key

1. **Supabase Dashboard** → Project Settings → API
2. Find **Service Role Key** (secret, starts with `eyJ...`)
3. **DO NOT share this key** - it bypasses Row Level Security

### 2.2 Add Environment Variables in Netlify

1. **Netlify Dashboard** → Your Site → Site Settings → Environment Variables
2. Add these variables:

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://[PROJECT_REF].supabase.co` | Already exists |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` | **NEW** - Service role key from Supabase |
| `VITE_ENABLE_PRODUCTION_RENDERING` | `true` | **NEW** - Enable production mode |

3. Click **Save**
4. **Re-deploy** your site for env vars to take effect

---

## Step 3: Install Remotion Dependencies

The required Remotion packages should already be in `package.json`, but verify:

```json
{
  "dependencies": {
    "@remotion/bundler": "^4.0.x",
    "@remotion/renderer": "^4.0.x",
    "@remotion/player": "^4.0.x",
    "@supabase/supabase-js": "^2.x.x"
  }
}
```

If missing, install:

```bash
npm install @remotion/bundler @remotion/renderer @remotion/player @supabase/supabase-js
```

---

## Step 4: Test Production Rendering

### 4.1 Enable Production Mode

1. Navigate to: **http://localhost:8888/phase6-test**
2. Toggle **"Production Mode"** checkbox in the header
3. You'll see a yellow warning:
   ```
   ⚠️ Production Mode Enabled
   Videos will be rendered with Remotion (30-60 seconds per chunk)
   and uploaded to Supabase Storage.
   ```

### 4.2 Run Test

1. Click **"Test Chunked Renderer"** button
2. Watch console logs:
   ```
   [Chunked Renderer] Production mode ENABLED - will render real videos
   [Chunked Renderer] Production render starting
   [Render Chunk] Starting render { chunkId: "chunk_0", format: "horizontal" }
   [Render Chunk] Bundling...
   [Render Chunk] Bundle complete
   [Render Chunk] Rendering chunk...
   [Render Chunk] Progress: 20%
   [Render Chunk] Progress: 40%
   [Render Chunk] Progress: 60%
   [Render Chunk] Progress: 80%
   [Render Chunk] Progress: 100%
   [Render Chunk] Render complete { renderTime: "32000ms" }
   [Render Chunk] Upload complete
   [Render Chunk] Public URL: https://[PROJECT_REF].supabase.co/storage/v1/object/public/studio-videos/chunk_0_test-video-123.mp4
   ```

3. **Expected Behavior**:
   - Each chunk takes **10-20 seconds** to render (for 5-7s of video)
   - Videos uploaded to Supabase Storage
   - Public URLs returned
   - ProgressivePlayer shows **actual video playback** ✅
   - Full 30s video completes in **~2 minutes** (parallel rendering)

---

## Step 5: Verify Video Storage

### 5.1 Check Supabase Storage

1. **Supabase Dashboard** → Storage → `studio-videos` bucket
2. You should see files like:
   ```
   chunk_0_test-video-123.mp4
   chunk_1_test-video-123.mp4
   chunk_2_test-video-123.mp4
   ...
   ```

### 5.2 Test Video Playback

1. Copy a video URL from storage
2. Open in browser or video player
3. Should play MP4 video successfully

---

## Files Created

### 1. `/scripts/setup-studio-videos-bucket.sql` ✅
- Creates Supabase storage bucket
- Sets up RLS policies
- Allows public read, authenticated write

### 2. `/netlify/functions/render-chunk.mjs` ✅
- Netlify serverless function
- Renders chunks with Remotion
- Uploads to Supabase Storage
- Returns public URL

### 3. `/src/services/studio/rendering/chunkedRenderer.ts` ✅ (Updated)
- Added `productionMode` flag
- Added `renderChunkProduction()` method
- Calls Netlify function when in production mode
- Falls back to preview mode when disabled

### 4. `/src/pages/Phase6TestPage.tsx` ✅ (Updated)
- Added production mode toggle
- Added warning banner
- Passes `productionMode` to renderer
- Shows mode in test results

---

## How It Works

### Preview Mode (Default - Fast Testing)

```typescript
const renderer = new ChunkedRenderer(3, false); // preview mode
```

**Behavior**:
- Simulates rendering delays (2-3s per chunk)
- Returns `chunkUrl: null`
- No actual videos generated
- Fast, free, good for testing logic

### Production Mode (Real Videos)

```typescript
const renderer = new ChunkedRenderer(3, true); // production mode
```

**Behavior**:
- Calls `/.netlify/functions/render-chunk`
- Renders real MP4 files with Remotion
- Uploads to Supabase Storage
- Returns public URLs
- **Slow (30-60s/chunk), real videos**

---

## Cost Estimation

### Netlify Function Costs

| Plan | Function Executions | Cost per 1000 Executions |
|------|---------------------|--------------------------|
| Free | 125,000/month | $0 |
| Pro | 2 million/month | ~$0.25 |

**Chunk Rendering**:
- 5-10 chunks per video
- ~125,000 free executions = **12,500-25,000 videos/month** (free tier)

### Supabase Storage Costs

| Storage | Bandwidth | Cost |
|---------|-----------|------|
| 1 GB | 2 GB | **FREE** |
| 100 GB | 200 GB | ~$10/month |

**Video Storage**:
- ~10MB per chunk
- 50MB per full video
- 1GB = **20 videos** (free tier)
- 100GB = **2,000 videos** ($10/month)

---

## Troubleshooting

### Issue 1: "Supabase not configured"

**Error**:
```
Error: Supabase not configured. Set SUPABASE_SERVICE_ROLE_KEY environment variable.
```

**Fix**:
1. Add `SUPABASE_SERVICE_ROLE_KEY` in Netlify environment variables
2. Re-deploy site
3. Verify key is correct (starts with `eyJ...`)

---

### Issue 2: "Failed to upload to Supabase"

**Error**:
```
Failed to upload to Supabase: Storage bucket not found
```

**Fix**:
1. Run SQL script: `/scripts/setup-studio-videos-bucket.sql`
2. Verify bucket exists in Supabase Dashboard → Storage
3. Check bucket name is exactly `studio-videos`

---

### Issue 3: Render takes too long / times out

**Error**:
```
Function timeout after 26 seconds
```

**Cause**: Remotion rendering can take 10-20 seconds per chunk (2-3x realtime)

**Solutions**:
1. **Use Netlify Pro**: 26 second timeout (handles up to ~10s video chunks)
2. **Shorten chunks**: Keep chunks 5-7 seconds max
3. **Optimize quality**: Use `quality: 'fast'` setting (CRF 28)
4. **Reduce scenes**: Fewer images per chunk = faster rendering

**Recommended Settings**:
- Chunk duration: **5-7 seconds** (not longer)
- Quality: **balanced** (CRF 23) or **fast** (CRF 28)
- Max chunks: **4-6 per video** (30-40s total)

---

### Issue 4: Videos not playing

**Error**:
```
CSP violation or video won't load
```

**Fix**:
1. Verify video URL is public (check in browser)
2. Check Supabase bucket is public (`public: true`)
3. Verify RLS policies allow public read

---

## Performance Tips

### 1. Optimize Chunk Duration

**Shorter chunks = faster rendering**:
- Recommended: **5-10 seconds per chunk**
- Avoid: 15+ second chunks (may timeout)

### 2. Parallel Rendering

```typescript
const renderer = new ChunkedRenderer(3, true); // Render 3 chunks at once
```

**More parallel = faster overall** (but uses more function executions)

### 3. Quality Settings

```typescript
await renderer.renderChunks(chunks, format, videoId, {
  quality: 'fast'    // CRF 28 - Fastest, lower quality
  quality: 'balanced' // CRF 23 - Good balance (default)
  quality: 'high'    // CRF 18 - Slowest, best quality
});
```

---

## Next Steps

### Option 1: Test Production Mode Locally

1. Set env var: `VITE_ENABLE_PRODUCTION_RENDERING=true` in `.env`
2. Start dev server: `npm run dev`
3. Toggle production mode in Phase6TestPage
4. Click "Test Chunked Renderer"
5. Wait 30-60s per chunk
6. Verify videos in Supabase Storage

### Option 2: Deploy to Netlify

1. Push changes to Git
2. Netlify auto-deploys
3. Add env vars in Netlify Dashboard
4. Test on live site

### Option 3: Add Video Stitching

Create a function to combine chunks into final video:
- Use FFmpeg to concatenate chunks
- Upload final video to Supabase
- Add download button

---

## Summary

✅ **Files Created**: 2 new files, 2 updated files  
✅ **Supabase**: Storage bucket ready  
✅ **Netlify**: Function ready for deployment  
✅ **Production Mode**: Toggle in UI  
✅ **Cost**: ~$0-10/month for 1000s of videos  

**You're now ready to generate real videos!** 🎉

Toggle production mode in Phase6TestPage and start rendering! 🚀
