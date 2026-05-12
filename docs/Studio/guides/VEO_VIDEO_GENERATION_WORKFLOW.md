# Veo Video Generation Workflow

## Overview
Complete workflow for generating videos using Google Vertex AI Veo 3.1 and saving them to Supabase Storage.

## Architecture

### Edge Function: `veo-generate-video`
Location: `supabase/functions/veo-generate-video/index.ts`

### Workflow Steps

```
1. Generate → 2. Poll Status → 3. Save to Storage
   (instant)     (5-15 mins)      (few seconds)
```

## API Actions

### 1. Generate Video

**Action:** `generate`

**Request:**
```json
{
  "action": "generate",
  "prompt": "A serene ocean sunset with gentle waves",
  "aspectRatio": "16:9"  // Optional: "16:9", "9:16", or "1:1"
}
```

**Response:**
```json
{
  "success": true,
  "operation": "projects/curios-vertex/locations/us-central1/operations/UUID",
  "message": "Video generation started. Use 'check' action to poll status."
}
```

### 2. Check Operation Status

**Action:** `check`

**Request:**
```json
{
  "action": "check",
  "operationName": "projects/curios-vertex/locations/us-central1/operations/UUID"
}
```

**Response (In Progress):**
```json
{
  "success": true,
  "done": false,
  "message": "Video generation in progress...",
  "operationName": "projects/..."
}
```

**Response (Completed):**
```json
{
  "success": true,
  "done": true,
  "message": "Video generation completed successfully",
  "operationName": "projects/...",
  "videoUrl": "gs://bucket-name/path/to/video.mp4"
}
```

**Response (Failed):**
```json
{
  "success": true,
  "done": true,
  "message": "Video generation failed: error details",
  "operationName": "projects/...",
  "error": "error details"
}
```

### 3. Save to Supabase Storage

**Action:** `save`

**Request:**
```json
{
  "action": "save",
  "gcsUri": "gs://bucket-name/path/to/video.mp4",
  "userId": "user-uuid-here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Video saved to Supabase Storage successfully",
  "storagePath": "videos/user-uuid-here/veo-1234567890.mp4",
  "publicUrl": "https://[project].supabase.co/storage/v1/object/public/generated-videos/videos/user-uuid-here/veo-1234567890.mp4"
}
```

## Implementation Details

### Authentication
- Uses Service Account JWT authentication for Vertex AI
- Requires `VERTEX_AI_SERVICE_ACCOUNT_EMAIL` and `VERTEX_AI_PRIVATE_KEY` secrets
- Uses `SUPABASE_SERVICE_ROLE_KEY` for storage uploads

### Video Generation Parameters
- **Model:** `veo-3.1-generate-001`
- **Location:** `us-central1`
- **Aspect Ratios:** 16:9 (default), 9:16, 1:1
- **Sample Count:** 1 video per generation

### Polling Strategy
- Recommended interval: 30 seconds
- Expected duration: 5-15 minutes
- Maximum attempts: 40 (20 minutes timeout)

### Storage Structure
```
generated-videos/
  videos/
    {userId}/
      veo-{timestamp}.mp4
```

## Frontend Integration Example

```typescript
// 1. Start generation
const generateResponse = await fetch(
  'https://[project].supabase.co/functions/v1/veo-generate-video',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${anonKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'generate',
      prompt: userPrompt,
      aspectRatio: '16:9'
    })
  }
);

const { operation } = await generateResponse.json();

// 2. Poll for completion
const pollInterval = setInterval(async () => {
  const checkResponse = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${anonKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'check',
      operationName: operation
    })
  });

  const status = await checkResponse.json();

  if (status.done) {
    clearInterval(pollInterval);

    if (status.videoUrl) {
      // 3. Save to storage
      const saveResponse = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'save',
          gcsUri: status.videoUrl,
          userId: currentUserId
        })
      });

      const { publicUrl } = await saveResponse.json();
      console.log('Video ready:', publicUrl);
    }
  }
}, 30000); // Poll every 30 seconds
```

## Error Handling

### Common Errors

1. **Missing Secrets**
   ```
   Service Account credentials not configured
   ```
   Solution: Set `VERTEX_AI_SERVICE_ACCOUNT_EMAIL` and `VERTEX_AI_PRIVATE_KEY` secrets

2. **Invalid Prompt**
   ```
   Invalid prompt. Must be a non-empty string.
   ```
   Solution: Provide a descriptive text prompt

3. **Operation Not Found**
   ```
   Failed to check operation status: 404
   ```
   Solution: Verify the operation name is correct

4. **GCS Download Failed**
   ```
   Failed to download video from GCS
   ```
   Solution: Ensure the access token has proper permissions

5. **Storage Upload Failed**
   ```
   Failed to upload to Supabase Storage
   ```
   Solution: Verify the `generated-videos` bucket exists and is publicly accessible

## Required Supabase Setup

### 1. Create Storage Bucket
```sql
-- In Supabase Dashboard > Storage
-- Create new bucket: "generated-videos"
-- Set as public bucket
```

### 2. Set Secrets
```bash
# Set Vertex AI credentials
supabase secrets set VERTEX_AI_SERVICE_ACCOUNT_EMAIL="your-sa@project.iam.gserviceaccount.com"
supabase secrets set VERTEX_AI_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Supabase credentials are auto-available as:
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
```

## Testing

Use the test script:
```bash
./scripts/test-veo-workflow.sh
```

Or test manually with curl (see script for examples).

## Performance Considerations

1. **Generation Time:** 5-15 minutes per video
2. **Video Size:** Typically 10-50 MB for 5-second clips
3. **Storage Costs:** Videos stored in Supabase Storage count toward quota
4. **Rate Limits:** Vertex AI has per-minute quotas for video generation

## Future Improvements

- [ ] Implement webhooks instead of polling
- [ ] Add video preview/thumbnail generation
- [ ] Support batch video generation
- [ ] Add video metadata tracking in database
- [ ] Implement video processing (trimming, filters, etc.)
- [ ] Add cost tracking per user
