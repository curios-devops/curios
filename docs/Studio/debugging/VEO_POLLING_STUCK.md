# VEO Polling Stuck - Troubleshooting Guide

**Issue:** App freezes/waits indefinitely for VEO videos that never arrive
**Last Log:** `[VeoVertex] Checking operation status`
**Symptoms:** Supabase functions boot/shutdown many times, no videos returned

## Root Cause Analysis

### What's Happening
1. VEO video generation starts (`action: 'generate'`)
2. Operation name is returned (e.g., `projects/.../operations/daea07b9-...`)
3. Client polls operation status every 15 seconds (`action: 'check'`)
4. **Problem:** `data.done` never becomes `true`
5. Client keeps polling for up to 6 minutes (24 attempts × 15s)
6. Eventually times out or user gets frustrated

### Possible Causes

#### 1. VEO API Response Format Changed
The edge function expects specific response structure:
```typescript
{
  "done": true,  // ← This field determines completion
  "response": {
    "videos": [{
      "gcsUri": "gs://...",  // or
      "bytesBase64Encoded": "..."
    }]
  }
}
```

**If Google changed the format**, `data.done` might be missing or false indefinitely.

#### 2. Operation Never Completes
VEO might be:
- Still processing (normal - takes 2-5 minutes)
- Failed silently on Google's side
- Stuck in pending state
- Rate limited

#### 3. Edge Function Times Out Before Completion
- Edge function has 60-120s timeout
- VEO status check might be slow
- Multiple retries cause edge function restarts (23 boots/shutdowns)

## Debugging Steps

### Step 1: Check Current Logs

**Browser Console:**
Look for these new logs (added in latest fix):
```
[CinematicService] Waiting for VEO operation
[CinematicService] Polling VEO operation (attempt X)
[CinematicService] VEO status received
```

**What to look for:**
- Does `done` ever become `true`?
- Is `hasVideoUrl` or `hasVideoBase64` ever `true`?
- What is the `message` field?

### Step 2: Check Supabase Function Logs

**If you can deploy the updated edge function**, you'll see:
```
[VEO checkStatus] Raw response: { ...full JSON... }
```

This shows EXACTLY what VEO API returns.

**To access logs:**
1. Go to https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/logs/edge-functions
2. Filter by `veo-generate-video`
3. Look for the raw response log

### Step 3: Manual API Test

Test the VEO API directly to see what it returns:

```bash
# Get access token (from edge function logs or manually)
ACCESS_TOKEN="your-token-here"

# Check operation status
OPERATION="projects/curios-vertex/locations/us-central1/publishers/google/models/veo-3.1-lite-generate-001/operations/daea07b9-70f5-42a6-b889-c4da75f1ed24"

curl -X POST \
  "https://us-central1-aiplatform.googleapis.com/v1/projects/curios-vertex/locations/us-central1/publishers/google/models/veo-3.1-lite-generate-001:fetchPredictOperation" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"operationName\": \"$OPERATION\"}"
```

**Analyze the response:**
- Is `done` true or false?
- Is there a `response` object?
- Is there an `error` object?
- What's the structure?

## Quick Fixes

### Fix 1: Increase Timeout (Already Implemented)

The client now has better error handling:
- ✅ Logs each polling attempt
- ✅ Times out after 6 minutes
- ✅ Shows clear error message
- ✅ Handles partial failures gracefully

**No action needed** - this is already in your code.

### Fix 2: Add Fallback to Partial Results

If some videos complete but others get stuck, show what worked:

**Already implemented** - failed scenes don't block successful ones.

### Fix 3: Skip Polling, Use Webhooks (Future)

Instead of polling:
1. VEO generates video
2. Google calls our webhook when done
3. We save the video
4. User gets notified

**Requires:**
- Webhook endpoint
- Google Cloud Pub/Sub setup
- More complex architecture

## Immediate Action

### What You Should Do Now:

1. **Open browser console** and generate a video
2. **Watch for these logs:**
   ```
   [CinematicService] Waiting for VEO operation
   [CinematicService] Polling VEO operation
   [CinematicService] VEO status received
   ```

3. **Copy the full output** and check:
   - How many polling attempts happened?
   - What was the final error message?
   - Did `done` ever become `true`?
   - Was there a `videoUrl` or `videoBase64`?

4. **If you can deploy the edge function:**
   - Deploy updated `veo-generate-video/index.ts`
   - Check Supabase logs for `[VEO checkStatus] Raw response`
   - This shows the EXACT VEO API response

5. **Share the logs** so we can identify:
   - If VEO API format changed
   - If operations are actually completing
   - What the actual response structure is

## Expected Behavior

### Normal Success Flow
```
[CinematicService] Waiting for VEO operation
[CinematicService] Polling VEO operation (attempt 1)
[VeoVertex] Checking operation status
[CinematicService] VEO status received { done: false, ... }
... (waits 15 seconds)
[CinematicService] Polling VEO operation (attempt 8)
[CinematicService] VEO status received { done: true, hasVideoUrl: true }
[CinematicService] VEO operation completed
[CinematicService] Using GCS URL directly
```

### Stuck Behavior (Current Issue)
```
[CinematicService] Waiting for VEO operation
[CinematicService] Polling VEO operation (attempt 1)
[VeoVertex] Checking operation status
[CinematicService] VEO status received { done: false, ... }
... (waits 15 seconds)
[CinematicService] Polling VEO operation (attempt 2)
... (repeats forever or until timeout)
[CinematicService] VEO operation timed out (after 24 attempts)
```

## Code Changes Made

### 1. Enhanced Logging
**File:** [cinematicService.ts:360-415](../../../src/services/cinematic/cinematicService.ts#L360-415)

Added detailed logs for every polling attempt with structured data.

### 2. Edge Function Debug Log
**File:** [veo-generate-video/index.ts:193](../../../supabase/functions/veo-generate-video/index.ts#L193)

Logs raw VEO API response to identify format issues.

### 3. Better Error Messages
**File:** [cinematicService.ts:414](../../../src/services/cinematic/cinematicService.ts#L414)

Clear timeout message explaining the issue.

## Next Steps

Based on the logs, we can:
1. **If `done` never becomes true:** VEO is slow or stuck
2. **If response format is different:** Update parsing logic
3. **If edge function times out:** Increase timeout or use webhooks
4. **If rate limited:** Add backoff or reduce concurrency

**Action Required:** Test and share the console logs!
