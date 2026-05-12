# Veo Video Generation - Quick Start Guide

## Current Status

✅ **Working:** Video generation (step 1)
⚠️ **Limited:** Operation polling (API endpoint issues)
✅ **Working:** Video storage (step 3)

## Quick Test Workflow

### Step 1: Generate a Video ✅

```bash
curl -X POST 'https://gpfccicfqynahflehpqo.supabase.co/functions/v1/veo-generate-video' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZmNjaWNmcXluYWhmbGVocHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2MjEwNzMsImV4cCI6MjA1NDE5NzA3M30.vPdI0gZdKm28jbfmU3r6tPaRBMm-g-VWKPTn5-UMoOM' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "generate",
    "prompt": "A serene ocean sunset with gentle waves, cinematic lighting, 4K quality",
    "aspectRatio": "16:9"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "operation": "projects/curios-vertex/locations/us-central1/publishers/google/models/veo-3.1-generate-001/operations/UUID",
  "message": "Video generation started. Use 'check' action to poll status."
}
```

**✅ SAVE THE OPERATION ID!**

---

### Step 2: Check Status (Manual via Google Cloud Console) ⚠️

Since the API polling has endpoint issues, check status manually:

1. **Go to Google Cloud Console:**
   ```
   https://console.cloud.google.com/vertex-ai/generative/video/locations/us-central1/operations?project=curios-vertex
   ```

2. **Find your operation** using the operation ID from Step 1
   - Example ID: `d6939894-56f0-4376-b366-b94c562ca17a`

3. **Wait for completion** (5-15 minutes)

4. **Once complete, copy the GCS URI** (gs://bucket/path/to/video.mp4)

**Alternative - Try API check (limited functionality):**
```bash
curl -X POST 'https://gpfccicfqynahflehpqo.supabase.co/functions/v1/veo-generate-video' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZmNjaWNmcXluYWhmbGVocHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2MjEwNzMsImV4cCI6MjA1NDE5NzA3M30.vPdI0gZdKm28jbfmU3r6tPaRBMm-g-VWKPTn5-UMoOM' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "check",
    "operationName": "PASTE_OPERATION_HERE"
  }'
```

Returns: Reminder to check Google Cloud Console

---

### Step 3: Save to Supabase Storage ✅

Once you have the video GCS URI from Google Cloud Console:

```bash
curl -X POST 'https://gpfccicfqynahflehpqo.supabase.co/functions/v1/veo-generate-video' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZmNjaWNmcXluYWhmbGVocHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2MjEwNzMsImV4cCI6MjA1NDE5NzA3M30.vPdI0gZdKm28jbfmU3r6tPaRBMm-g-VWKPTn5-UMoOM' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "save",
    "gcsUri": "gs://your-bucket/path/to/video.mp4",
    "userId": "your-user-id"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Video saved to Supabase Storage successfully",
  "storagePath": "videos/your-user-id/veo-1234567890.mp4",
  "publicUrl": "https://gpfccicfqynahflehpqo.supabase.co/storage/v1/object/public/generated-videos/videos/your-user-id/veo-1234567890.mp4"
}
```

🎬 **Open the publicUrl to watch your video!**

---

## Current Limitations

### API Polling Issue
The Vertex AI operations endpoint for Veo returns 404 errors when checking status via API:
- Tried: `https://us-central1-aiplatform.googleapis.com/v1/{full-operation-path}` ❌
- Tried: `https://us-central1-aiplatform.googleapis.com/v1/projects/.../operations/{id}` ❌

**Workaround:** Check status manually in Google Cloud Console

**Future Fix:** Once Veo's operations API is stable, the polling endpoint will be updated.

---

## Before You Start

### 1. Create Storage Bucket
Go to: https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/storage/buckets

- Click "New bucket"
- Name: `generated-videos`
- Public: ✅ Yes
- Click "Create bucket"

### 2. Verify Secrets Are Set
```bash
supabase secrets list --project-ref gpfccicfqynahflehpqo
```

Should show:
- `VERTEX_AI_SERVICE_ACCOUNT_EMAIL`
- `VERTEX_AI_PRIVATE_KEY`

---

## Testing Your First Video

**Complete Example:**

```bash
# 1. Generate
RESPONSE=$(curl -s -X POST 'https://gpfccicfqynahflehpqo.supabase.co/functions/v1/veo-generate-video' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZmNjaWNmcXluYWhmbGVocHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2MjEwNzMsImV4cCI6MjA1NDE5NzA3M30.vPdI0gZdKm28jbfmU3r6tPaRBMm-g-VWKPTn5-UMoOM' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "generate",
    "prompt": "A beautiful mountain landscape at dawn with mist rolling over peaks",
    "aspectRatio": "16:9"
  }')

echo "Response: $RESPONSE"

# Extract operation ID (last part of operation path)
OPERATION=$(echo $RESPONSE | jq -r '.operation')
OPERATION_ID=$(echo $OPERATION | awk -F'/' '{print $NF}')

echo ""
echo "✅ Video generation started!"
echo "Operation ID: $OPERATION_ID"
echo ""
echo "Next steps:"
echo "1. Go to: https://console.cloud.google.com/vertex-ai/generative/video/locations/us-central1/operations?project=curios-vertex"
echo "2. Find operation: $OPERATION_ID"
echo "3. Wait 5-15 minutes"
echo "4. Copy the GCS URI when complete"
echo "5. Use the save command below:"
echo ""
echo "# Save command (replace GCS_URI):"
echo "curl -X POST 'https://gpfccicfqynahflehpqo.supabase.co/functions/v1/veo-generate-video' \\"
echo "  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZmNjaWNmcXluYWhmbGVocHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2MjEwNzMsImV4cCI6MjA1NDE5NzA3M30.vPdI0gZdKm28jbfmU3r6tPaRBMm-g-VWKPTn5-UMoOM' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"action\":\"save\",\"gcsUri\":\"GCS_URI_HERE\",\"userId\":\"test-user\"}'"
```

---

## Troubleshooting

### Error: "Service Account credentials not configured"
```bash
# Set the secrets
supabase secrets set VERTEX_AI_SERVICE_ACCOUNT_EMAIL="your-sa@curios-vertex.iam.gserviceaccount.com" --project-ref gpfccicfqynahflehpqo
supabase secrets set VERTEX_AI_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..." --project-ref gpfccicfqynahflehpqo
```

### Error: "Failed to upload to Supabase Storage"
- Verify the `generated-videos` bucket exists
- Make sure it's set as public
- Check storage quota

### Can't find operation in Google Cloud Console
- Make sure you're logged into the correct Google account
- Verify project is `curios-vertex`
- Check the region is `us-central1`

---

## What's Next?

Once you've successfully generated and saved a video:

1. **Integrate into your app UI**
   - Add video generation button
   - Show progress indicator (5-15 min wait)
   - Display generated videos

2. **Add database tracking**
   - Store video metadata (prompt, timestamp, user)
   - Track costs per user
   - Build video gallery

3. **Enhance features**
   - Video thumbnails
   - Different aspect ratios (9:16 for vertical, 1:1 for square)
   - Batch generation
   - Video editing/effects

---

## Summary

**What Works:**
- ✅ Generating videos via Vertex AI Veo
- ✅ Saving videos to Supabase Storage
- ✅ Accessing public URLs

**What's Limited:**
- ⚠️ API-based status polling (use Google Cloud Console instead)

**Your current operation:**
- ID: `d6939894-56f0-4376-b366-b94c562ca17a`
- Check at: https://console.cloud.google.com/vertex-ai/generative/video/locations/us-central1/operations?project=curios-vertex

Once complete, you'll have the GCS URI to save to Supabase! 🎬
