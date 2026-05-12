# 🚀 Cinematic Video - Deployment Guide

**Last Updated:** April 11, 2026
**For:** Scene Narration Feature Deployment

---

## 📋 Overview

This guide will help you deploy the new `add-scene-narration` edge function to Supabase, which enables per-scene TTS narration with text overlays.

---

## 🔧 Prerequisites

Before deploying, ensure you have:

1. **Supabase CLI installed** (if deploying from CLI)
   ```bash
   npm install -g supabase
   ```

2. **Supabase project linked** (if using CLI)
   ```bash
   supabase link --project-ref gpfccicfqynahflehpqo
   ```

3. **Required secrets configured** (check in Supabase Dashboard → Edge Functions → Secrets):
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Service role key for storage uploads
   - `SUPABASE_STORAGE_BUCKET` - Storage bucket name (default: "videos")

---

## 📦 Method 1: Deploy via Supabase Dashboard (Recommended)

This is the easiest method if you don't have the CLI installed.

### Step 1: Prepare the Function Code

The function code is located at:
```
supabase/functions/add-scene-narration/index.ts
```

### Step 2: Access Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/gpfccicfqynahflehpqo
2. Click on **"Edge Functions"** in the left sidebar
3. Click **"Deploy a new function"** button

### Step 3: Create Function

1. **Function name:** `add-scene-narration`
2. **Runtime:** Deno
3. **Code:** Copy and paste the entire contents of `supabase/functions/add-scene-narration/index.ts`

### Step 4: Configure Function Settings

- **Memory:** 512 MB (recommended for FFmpeg processing)
- **Timeout:** 300 seconds (5 minutes)
- **Verify JWT:** Disabled (we handle auth with anon key)

### Step 5: Deploy

Click **"Deploy function"** button

### Step 6: Verify Deployment

After deployment, you should see:
- Function status: **Active**
- Function URL: `https://gpfccicfqynahflehpqo.supabase.co/functions/v1/add-scene-narration`

---

## 🖥️ Method 2: Deploy via CLI

If you have Supabase CLI installed and linked:

### Step 1: Navigate to Project Root

```bash
cd /Users/marcelo/Documents/Curios
```

### Step 2: Deploy Function

```bash
supabase functions deploy add-scene-narration
```

### Step 3: Verify Deployment

```bash
supabase functions list
```

You should see `add-scene-narration` in the list with status "ACTIVE"

---

## 🧪 Test the Deployment

### Test 1: Health Check

```bash
curl -X POST https://gpfccicfqynahflehpqo.supabase.co/functions/v1/add-scene-narration \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected response:**
```json
{
  "success": false,
  "error": "videoUrl is required"
}
```

This confirms the function is deployed and responding.

### Test 2: Full Integration Test

Once deployed, test the complete workflow:

1. Go to your app: https://your-app-url.com
2. Switch to **Cinematic** mode
3. Enter a test query (e.g., "How does photosynthesis work?")
4. Wait for scenes to generate
5. **Verify:**
   - ✅ Hover over scene cards → videos play
   - ✅ Progress shows "Adding voice narration to each scene..."
   - ✅ Play individual scenes → hear TTS narration
   - ✅ Play full video → all scenes stitched with narration
   - ✅ Download button appears
   - ✅ Click download → receives .mp4 file

---

## 🔍 Troubleshooting

### Issue 1: Function not found (404)

**Cause:** Function not deployed or wrong URL

**Fix:**
1. Check function list in Supabase Dashboard
2. Verify function name is exactly `add-scene-narration` (no typos)
3. Redeploy if necessary

### Issue 2: Internal Server Error (500)

**Cause:** Missing environment variables or FFmpeg error

**Fix:**
1. Check Edge Function logs in Supabase Dashboard
2. Verify secrets are set:
   ```bash
   supabase secrets list
   ```
3. Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured

### Issue 3: Video upload fails

**Cause:** Storage bucket doesn't exist or permissions issue

**Fix:**
1. Go to Supabase Dashboard → Storage
2. Create bucket named `videos` if it doesn't exist
3. Set bucket to **Public** (or configure RLS policies)
4. Verify service role key has storage permissions

### Issue 4: FFmpeg errors

**Cause:** Invalid video URL or audio data

**Fix:**
1. Check Edge Function logs for detailed FFmpeg error
2. Verify input video URL is accessible
3. Verify narration audio is valid base64-encoded MP3

### Issue 5: Timeout errors

**Cause:** Function taking too long (>60s default timeout)

**Fix:**
1. Increase function timeout in Dashboard:
   - Go to Edge Functions → add-scene-narration → Settings
   - Set timeout to 300 seconds (5 minutes)
2. Redeploy function

---

## 📊 Monitoring

### View Function Logs

**Via Dashboard:**
1. Go to Supabase Dashboard → Edge Functions
2. Click on `add-scene-narration`
3. Click **"Logs"** tab
4. Real-time logs will appear here

**Via CLI:**
```bash
supabase functions logs add-scene-narration
```

### Check Invocation Stats

In Supabase Dashboard → Edge Functions → add-scene-narration:
- **Invocations:** Total number of calls
- **Errors:** Number of failed calls
- **Duration:** Average execution time

---

## 🎯 Post-Deployment Checklist

After successful deployment, verify:

- [ ] Function appears in Supabase Dashboard with "Active" status
- [ ] Function URL is accessible (not 404)
- [ ] Health check test passes (returns expected error for empty payload)
- [ ] Cinematic video generation works end-to-end
- [ ] Individual scenes have TTS narration
- [ ] Full video stitches all scenes correctly
- [ ] Download button works
- [ ] Downloaded video plays correctly

---

## 📝 Environment Variables Reference

Make sure these are set in Supabase Dashboard → Settings → Edge Functions → Secrets:

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Your Supabase project URL | `https://gpfccicfqynahflehpqo.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (for storage uploads) | `eyJhbGc...` |
| `SUPABASE_STORAGE_BUCKET` | Storage bucket name | `videos` |
| `VITE_ELEVENLABS_TTS_URL` | ElevenLabs TTS edge function | (already configured) |
| `VITE_OPENAI_TTS_URL` | OpenAI TTS fallback | (already configured) |

---

## 🔄 Redeploying (Updates)

If you need to update the function later:

### Via Dashboard:
1. Go to Edge Functions → add-scene-narration
2. Click **"Edit"**
3. Update the code
4. Click **"Deploy"**

### Via CLI:
```bash
supabase functions deploy add-scene-narration --no-verify-jwt
```

---

## 🆘 Getting Help

If you encounter issues:

1. **Check logs first:**
   - Supabase Dashboard → Edge Functions → add-scene-narration → Logs

2. **Common error patterns:**
   - `Cannot find name 'Deno'` → Code is correct, ignore TypeScript warnings in editor
   - `SUPABASE_URL not set` → Add environment variable in Dashboard
   - `Failed to upload to storage` → Check bucket exists and is accessible

3. **Test in isolation:**
   ```bash
   # Test just the FFmpeg part locally (if you have ffmpeg installed)
   ffmpeg -version
   ```

---

## ✅ Success Indicators

You'll know deployment is successful when:

1. ✅ Function shows as "Active" in Dashboard
2. ✅ Test curl returns validation error (not 404/500)
3. ✅ App logs show "Scene narration added successfully"
4. ✅ Enhanced video URLs are returned
5. ✅ Full cinematic workflow completes without errors

---

## 🎉 You're Done!

Once the function is deployed and tested, the new cinematic features are live:
- Per-scene TTS narration
- Text overlays on each scene
- Full video stitching with all scenes
- Download button for .mp4 files

**Happy deploying!** 🚀
