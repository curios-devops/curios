# Veo Video Generation - Testing Instructions

## Prerequisites

Before testing, ensure you have:

1. ✅ Deployed the `veo-generate-video` function
2. ✅ Set the required Supabase secrets:
   - `VERTEX_AI_SERVICE_ACCOUNT_EMAIL`
   - `VERTEX_AI_PRIVATE_KEY`
3. ✅ Created a `generated-videos` storage bucket in Supabase (set as public)

## Quick Test Commands

### 1. Test Function Deployment (Health Check)

```bash
curl -X POST 'https://gpfccicfqynahflehpqo.supabase.co/functions/v1/veo-generate-video' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZmNjaWNmcXluYWhmbGVocHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2MjEwNzMsImV4cCI6MjA1NDE5NzA3M30.vPdI0gZdKm28jbfmU3r6tPaRBMm-g-VWKPTn5-UMoOM' \
  -H 'Content-Type: application/json'
```

**Expected:** Error message about missing action (confirms function is running)

---

### 2. Generate a Video

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
  "operation": "projects/curios-vertex/locations/us-central1/operations/1234567890",
  "message": "Video generation started. Use 'check' action to poll status."
}
```

**⚠️ SAVE THE OPERATION ID** - You'll need it for the next step!

---

### 3. Check Generation Status

Replace `OPERATION_ID` with the operation ID from step 2:

```bash
curl -X POST 'https://gpfccicfqynahflehpqo.supabase.co/functions/v1/veo-generate-video' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZmNjaWNmcXluYWhmbGVocHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2MjEwNzMsImV4cCI6MjA1NDE5NzA3M30.vPdI0gZdKm28jbfmU3r6tPaRBMm-g-VWKPTn5-UMoOM' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "check",
    "operationName": "OPERATION_ID"
  }'
```

**While Processing:**
```json
{
  "success": true,
  "done": false,
  "message": "Video generation in progress...",
  "operationName": "projects/..."
}
```

**When Complete:**
```json
{
  "success": true,
  "done": true,
  "message": "Video generation completed successfully",
  "operationName": "projects/...",
  "videoUrl": "gs://bucket-name/path/to/video.mp4"
}
```

⏱️ **Note:** Generation takes 5-15 minutes. Check every 30-60 seconds.

**⚠️ SAVE THE VIDEO URL** - You'll need it for the next step!

---

### 4. Save Video to Supabase Storage

Replace `GCS_URI` with the videoUrl from step 3, and `YOUR_USER_ID` with your actual user ID:

```bash
curl -X POST 'https://gpfccicfqynahflehpqo.supabase.co/functions/v1/veo-generate-video' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZmNjaWNmcXluYWhmbGVocHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2MjEwNzMsImV4cCI6MjA1NDE5NzA3M30.vPdI0gZdKm28jbfmU3r6tPaRBMm-g-VWKPTn5-UMoOM' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "save",
    "gcsUri": "GCS_URI",
    "userId": "YOUR_USER_ID"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Video saved to Supabase Storage successfully",
  "storagePath": "videos/YOUR_USER_ID/veo-1234567890.mp4",
  "publicUrl": "https://gpfccicfqynahflehpqo.supabase.co/storage/v1/object/public/generated-videos/videos/YOUR_USER_ID/veo-1234567890.mp4"
}
```

🎉 **Open the publicUrl in your browser to watch the video!**

---

## Automated Test Script

For easier testing, use the provided script:

```bash
# Edit the script first to add your user ID:
nano scripts/test-veo-workflow.sh

# Find and replace:
USER_ID="test-user-123"  # Replace with your actual user ID

# Run the script:
./scripts/test-veo-workflow.sh
```

The script will:
1. ✅ Generate a video
2. ⏳ Poll for completion (every 30s, up to 20 minutes)
3. 💾 Save to Supabase Storage
4. 🎬 Display the public URL

---

## Verify Supabase Setup

### Check Storage Bucket

1. Go to: https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/storage/buckets
2. Verify `generated-videos` bucket exists
3. If not, create it:

```bash
# In Supabase Dashboard:
# Storage > New Bucket
# Name: generated-videos
# Public bucket: ✅ Yes
```

### Check Secrets

```bash
# List all secrets (IDs only, not values)
supabase secrets list --project-ref gpfccicfqynahflehpqo
```

Should show:
- `VERTEX_AI_SERVICE_ACCOUNT_EMAIL`
- `VERTEX_AI_PRIVATE_KEY`
- `SUPABASE_URL` (auto-available)
- `SUPABASE_SERVICE_ROLE_KEY` (auto-available)

---

## Troubleshooting

### Error: "Service Account credentials not configured"

**Solution:** Set the Vertex AI secrets:

```bash
supabase secrets set VERTEX_AI_SERVICE_ACCOUNT_EMAIL="your-sa@curios-vertex.iam.gserviceaccount.com" --project-ref gpfccicfqynahflehpqo

supabase secrets set VERTEX_AI_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...your key here...
-----END PRIVATE KEY-----" --project-ref gpfccicfqynahflehpqo
```

### Error: "Failed to upload to Supabase Storage"

**Solutions:**
1. Create the `generated-videos` bucket (see above)
2. Make sure it's set as public
3. Check storage quota isn't exceeded

### Error: "Failed to get access token"

**Solutions:**
1. Verify Service Account has proper permissions in GCP
2. Check the private key is correctly formatted (with \n newlines)
3. Ensure the Service Account email matches the project

### Video Generation Takes Too Long

**Normal behavior:**
- First-time generation: 10-15 minutes
- Subsequent generations: 5-10 minutes
- The operation endpoint returns status updates

---

## Expected Timeline

1. **Generate** → Instant response with operation ID
2. **Poll Status** → 5-15 minutes (check every 30-60s)
3. **Save to Storage** → 10-30 seconds (depending on video size)

---

## Next Steps After Testing

Once you verify the function works:

1. 📱 **Integrate into your frontend:**
   - Create UI for video generation
   - Add progress indicator for polling
   - Display generated videos

2. 🗄️ **Add database tracking:**
   - Store video metadata (prompt, user, timestamp)
   - Track generation costs
   - Create video library per user

3. 🎨 **Enhance features:**
   - Add video preview/thumbnails
   - Support multiple aspect ratios
   - Batch generation
   - Custom duration (when Veo supports it)

---

## Quick Reference

**Function URL:**
```
https://gpfccicfqynahflehpqo.supabase.co/functions/v1/veo-generate-video
```

**Anon Key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZmNjaWNmcXluYWhmbGVocHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2MjEwNzMsImV4cCI6MjA1NDE5NzA3M30.vPdI0gZdKm28jbfmU3r6tPaRBMm-g-VWKPTn5-UMoOM
```

**Actions:**
- `generate` - Start video generation
- `check` - Poll operation status
- `save` - Save to Supabase Storage

---

**Ready to test? Start with Step 1!** 🚀
