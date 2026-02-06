# Phase 6 Local Testing Instructions

## Overview
This guide will help you test all Phase 6 features locally before deploying to production.

## Prerequisites

### 1. Environment Variables
Ensure these are set in your `.env` file:

```bash
# Supabase (required for Brave Images - Phase 6A)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI (optional, for TTS testing - Phase 5)
VITE_OPENAI_API_KEY=your_openai_key

# Pexels (optional, for video backgrounds - Phase 4)
VITE_PEXELS_API_KEY=your_pexels_key
```

### 2. Supabase Edge Function
Ensure the Brave Search Edge Function is deployed:

```bash
# Location: /supabase/functions/brave-images-search/index.ts

# Deploy command:
cd supabase
supabase functions deploy brave-images-search
```

**Edge Function Configuration:**
- Add Brave API key as secret in Supabase Dashboard:
  - Go to Project Settings → Edge Functions → Secrets
  - Add: `BRAVE_API_KEY=your_brave_api_key`

### 3. Start Development Server

```bash
# From project root
npm install
npm run dev
```

The app should start on `http://localhost:5173`

---

## Testing Phase 6 Features

### Access the Test Page

Navigate to: **http://localhost:5173/phase6-test**

You should see:
- **Test Controls** section with 6 buttons
- **Test Results** section (empty initially)
- **Mock Scene Structure** collapsible section

---

## Test Scenarios

### Test 1: Brave Image Service (Phase 6A)

**What it tests:** Brave Search API integration via Supabase Edge Function

**Steps:**
1. Click **"Test Brave Images"** button
2. Wait 3-5 seconds
3. Check the Test Results section

**Expected Results:**
```
✓ Phase 6A: Brave Images - Success
  Found 3 images

Details should show:
{
  "images": [
    {
      "title": "...",
      "url": "...",
      "thumbnail": "..."
    },
    ...
  ]
}
```

**Success Criteria:**
- ✅ No error messages
- ✅ Found 1-3 images
- ✅ Each image has title, url, thumbnail

**Troubleshooting:**
- ❌ "Brave Image Service not enabled" → Check Supabase env vars
- ❌ "No images found" → Check Brave API key in Supabase secrets
- ❌ Network error → Check Edge Function is deployed
- ❌ 429 error → Rate limit hit, wait 1 minute and retry

---

### Test 2: Image Asset Agent (Phase 6A)

**What it tests:** Image assignment to scenes with strategies

**Steps:**
1. Click **"Test Image Agent"** button
2. Wait 5-10 seconds (makes 2-3 API calls with 1000ms delays)
3. Check the Test Results section

**Expected Results:**
```
✓ Phase 6A: Image Assignment - Success
  Assigned 2 images to 5 scenes

Details should show:
{
  "totalImages": 2,
  "failedScenes": 0,
  "scenesWithImages": [
    {
      "sceneIndex": 1,
      "style": "explain",
      "effect": "ken-burns",
      "keywords": "..."
    },
    ...
  ]
}
```

**Success Criteria:**
- ✅ Assigned 2-3 images (key-points strategy)
- ✅ Images NOT on hook/outro scenes
- ✅ Each scene has effect: 'zoom', 'blur', 'ken-burns', or 'fade'
- ✅ Keywords are meaningful (not empty)
- ✅ failedScenes = 0

**Troubleshooting:**
- ❌ "Image Asset Agent not enabled" → Run Test 1 first
- ❌ High failedScenes count → Check Brave API quota
- ❌ Takes > 20 seconds → Normal (rate limiting at 1000ms per call)

---

### Test 3: Chunk Planner (Phase 6B)

**What it tests:** Video splitting into chunks with sentence boundaries

**Steps:**
1. Click **"Test Chunk Planner"** button
2. Results appear immediately (no API calls)
3. Check the Test Results section

**Expected Results:**
```
✓ Phase 6B: Chunk Planning - Success
  Created 4 chunks

Details should show:
{
  "totalChunks": 4,
  "avgDuration": "7.50s",
  "sentenceCompliance": "100.0%",
  "chunks": [
    {
      "id": "chunk_0",
      "duration": "5.00s",
      "sceneCount": 1,
      "priority": "high"
    },
    ...
  ]
}

✓ Phase 6B: Statistics - Success
{
  "highPriority": 2,
  "withImages": 0,
  "avgDuration": "7.50s",
  "minDuration": "5.00s",
  "maxDuration": "10.00s"
}
```

**Success Criteria:**
- ✅ Created 3-5 chunks (for 30s video)
- ✅ avgDuration between 6-10 seconds
- ✅ sentenceCompliance >= 70%
- ✅ First chunk has priority: "high" (hook)
- ✅ No chunk > 12 seconds (max limit)
- ✅ No chunk < 3 seconds (min limit)

**Troubleshooting:**
- ❌ sentenceCompliance < 70% → Check scene text has proper punctuation
- ❌ Chunk too long → Force split at 12s is working
- ❌ Error → Check console for stack trace

---

### Test 4: Chunked Renderer (Phase 6B)

**What it tests:** Parallel chunk rendering (preview mode)

**Steps:**
1. Click **"Test Renderer"** button
2. Watch progress messages appear (10-15 seconds)
3. Observe the **Progressive Player** appear above Test Results

**Expected Results:**
```
✓ Phase 6B: Rendering - Starting
  Rendering 4 chunks...

✓ Phase 6B: Chunk Progress - Running
  Chunk 1/4: complete
  {
    "chunkId": "chunk_0",
    "status": "complete",
    "renderTime": "3200ms",
    "progress": "25.0%"
  }

[... more progress messages ...]

✓ Phase 6B: Chunked Rendering - Success
  Rendered 4 chunks successfully
  {
    "totalChunks": 4,
    "successful": 4,
    "failed": 0,
    "totalRenderTime": "10500ms",
    "avgRenderTime": "2625ms"
  }
```

**Success Criteria:**
- ✅ All chunks render successfully (failed: 0)
- ✅ Total render time < 20 seconds
- ✅ Avg render time ~2-5 seconds per chunk
- ✅ Progress updates in real-time
- ✅ Progressive Player component appears

**Troubleshooting:**
- ❌ High render times → Normal in preview mode (simulated)
- ❌ Failed chunks → Check console for errors

---

### Test 5: Progressive Playback (Phase 6C)

**What it tests:** Video player with chunk streaming

**Prerequisites:** Run Test 4 first (renders chunks)

**Steps:**
1. After Test 4 completes, scroll to **"Phase 6C: Progressive Playback"** section
2. Observe the video player with controls
3. Video should auto-play first chunk
4. Watch the chunk pills at top of player

**Expected Behavior:**

**Initial State (0-3s):**
```
Chunk Pills: [blue] [gray] [gray] [gray]
Status: "Chunk 1 of 4"
Stats: 1 completed, 3 rendering, 0 pending
```

**Mid-Playback (5-8s):**
```
Chunk Pills: [white] [blue] [white] [yellow]
Status: "Chunk 2 of 4"
Stats: 3 completed, 1 rendering, 0 pending
Auto-transitions to next chunk
```

**Complete (12s+):**
```
Chunk Pills: [white] [white] [white] [white]
Status: "✓ All chunks ready"
Stats: 4 completed, 0 rendering, 0 pending
Test Result: "✓ Video playback complete!"
```

**Success Criteria:**
- ✅ Video auto-starts playing (no manual click)
- ✅ Seamless transitions between chunks
- ✅ Chunk pills show correct status:
  - Blue = currently playing
  - White = completed
  - Yellow (pulsing) = rendering
  - Gray = pending
- ✅ Play/Pause button works
- ✅ Mute/Unmute button works
- ✅ Progress bar updates
- ✅ No black screens or stuttering
- ✅ Completion callback fires

**Troubleshooting:**
- ❌ Video doesn't auto-play → Browser autoplay policy (expected)
  - Click play button manually
- ❌ Chunks don't transition → Check chunk URLs in console
- ❌ Buffering forever → Check renderProgress state
- ❌ No sound → This is preview mode (no actual audio)

---

### Test 6: Run All Tests

**What it tests:** Full Phase 6 workflow

**Steps:**
1. Click **"Run All Tests"** button
2. Wait 20-30 seconds for all tests to complete
3. Review all test results

**Expected Timeline:**
```
0s:  Test Suite starts
3s:  Brave Images complete
8s:  Image Assignment complete
8s:  Chunk Planning complete (instant)
23s: Chunk Rendering complete
23s: All tests complete!
```

**Success Criteria:**
- ✅ All 4 main tests pass
- ✅ Total time < 30 seconds
- ✅ No errors in console
- ✅ Progressive Player appears and works

**Troubleshooting:**
- ❌ Any test fails → Run that test individually to debug
- ❌ Takes > 60 seconds → Check rate limiting (1000ms delays)

---

## Understanding the Results

### Test Results Icons
- **✓ Green checkmark** = Success
- **! Red exclamation** = Error
- **⟳ Blue spinner** = In progress

### Expandable Details
Click **"View Details"** on any result to see:
- API responses
- Image data
- Chunk information
- Statistics

### Mock Scene Structure
The test uses 5 pre-defined scenes (30 seconds total):
1. Hook (5s) - AI introduction
2. Explain (8s) - What is AI
3. Explain (8s) - Machine learning
4. Takeaway (6s) - Key insight
5. Outro (3s) - Closing

---

## Verifying Phase 6 Features

### Phase 6A: Brave Images ✅
**Verification:**
1. Test 2 shows `totalImages: 2-3`
2. `failedScenes: 0`
3. Each scene has:
   - `imageKeywords`: meaningful query
   - `imageEffect`: 'zoom', 'blur', 'ken-burns', or 'fade'
   - `imageUrl`: valid URL (even if preview mode)

### Phase 6B: Chunked Rendering ✅
**Verification:**
1. Test 3 shows 3-5 chunks for 30s video
2. `sentenceCompliance >= 70%`
3. Test 4 shows parallel rendering (3 at once)
4. `successful: 4, failed: 0`
5. Total render time reasonable (~10-15s in preview)

### Phase 6C: Progressive Playback ✅
**Verification:**
1. Player appears after Test 4
2. Auto-plays first chunk
3. Chunk pills update in real-time
4. Smooth transitions (no black screens)
5. Controls work (play/pause/mute)
6. Completion message appears

---

## Console Debugging

### Expected Console Logs

**Brave Images:**
```javascript
[Brave Image Service] Searching for scene...
  count: 3
  country: "us"

[Brave Image Service] Search results
  totalResults: 15
  imagesReturned: 3
```

**Image Assignment:**
```javascript
[Image Asset Agent] Assigning images (key-points strategy)
  totalScenes: 5
  targetScenes: 2-3

[Image Asset Agent] Image assignment complete
  totalImages: 2
  failedScenes: 0
```

**Chunk Planning:**
```javascript
[Chunk Planner] Planning chunks
  targetDuration: 7
  totalScenes: 5

[Chunk Planner] Chunk plan created
  totalChunks: 4
  sentenceCompliance: 100.0%
```

**Chunk Rendering:**
```javascript
[Chunked Renderer] Starting chunk rendering
  totalChunks: 4
  maxParallel: 3

[Chunked Renderer] Rendering batch
  batchNumber: 1
  chunkIndices: [0, 1, 2]

[Chunked Renderer] Chunk complete
  chunkId: 'chunk_0'
  renderTime: '3200ms'
```

### Error Logs to Watch For

**Rate Limit Errors:**
```javascript
❌ [Brave Image Service] Rate limit exceeded
   → Wait 60 seconds and retry
```

**API Errors:**
```javascript
❌ [Brave Image Service] Search failed: 401 Unauthorized
   → Check Brave API key in Supabase
```

**Validation Errors:**
```javascript
❌ [Chunk Planner] Invalid chunk plan
   → Check sentenceCompliance < 70%
```

---

## Production Readiness Checklist

Before deploying Phase 6 to production:

### Phase 6A Checklist
- [ ] Supabase Edge Function deployed
- [ ] Brave API key added to Supabase secrets
- [ ] Test 1 passes (Brave Images)
- [ ] Test 2 passes (Image Assignment)
- [ ] Rate limiting set to 1000ms
- [ ] Image effects render correctly in Remotion

### Phase 6B Checklist
- [ ] Test 3 passes (Chunk Planning)
- [ ] Test 4 passes (Chunked Rendering)
- [ ] Sentence boundary compliance >= 70%
- [ ] Chunks respect 3-12s duration limits
- [ ] Parallel rendering works (3 chunks)
- [ ] Create Netlify function for server-side rendering (TODO)

### Phase 6C Checklist
- [ ] Test 5 passes (Progressive Playback)
- [ ] Auto-play works (or graceful fallback)
- [ ] Chunk transitions are seamless
- [ ] Controls work (play/pause/mute)
- [ ] Buffering handled gracefully
- [ ] Completion callback fires

### Integration Checklist
- [ ] Test 6 passes (Run All Tests)
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Performance acceptable (<30s for full test)
- [ ] All documentation up to date

---

## Next Steps

After successful local testing:

1. **Deploy to Staging**
   ```bash
   # Build production bundle
   npm run build
   
   # Deploy to Netlify staging
   netlify deploy --prod=false
   ```

2. **Create Server-Side Rendering**
   - Implement Netlify function for chunk rendering
   - Use Remotion renderer instead of simulation
   - Upload chunks to Supabase Storage

3. **Test in Production**
   - Generate a real video through Studio UI
   - Verify chunks render on server
   - Check progressive playback works
   - Validate final video quality

4. **Monitor Performance**
   - Track chunk render times
   - Monitor Brave API usage/costs
   - Check serverless function timeouts
   - Measure user experience improvements

---

## Support

If you encounter issues:

1. **Check Documentation:**
   - `/docs/testing/PHASE6A_TESTING_GUIDE.md`
   - `/docs/testing/PHASE6C_TESTING_GUIDE.md`
   - `/docs/status/PHASE6_COMPLETE.md`
   - `/docs/PHASE6_QUICK_START.md`

2. **Check Console Logs:**
   - Open browser DevTools (F12)
   - Look for error messages in Console tab
   - Check Network tab for failed API calls

3. **Verify Environment:**
   - All env vars set correctly
   - Edge Function deployed
   - API keys valid and have quota

4. **Test Individually:**
   - Run tests one at a time
   - Isolate which phase is failing
   - Check test-specific troubleshooting section

---

## Summary

Phase 6 adds three major features:
- **6A**: Contextual image overlays from Brave Search
- **6B**: Chunked rendering with sentence boundaries
- **6C**: Progressive playback (watch while rendering)

**Time Savings**: Users can start watching videos **~50% faster** (10s vs 20s)

**Testing Page**: http://localhost:5173/phase6-test

**All tests should pass** before deploying to production! ✅
