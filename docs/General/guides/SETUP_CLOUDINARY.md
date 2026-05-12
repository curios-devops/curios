# Setup Cloudinary for Video Storage

**Status:** 🔧 Configuration Required
**Date:** 2026-04-18
**Priority:** HIGH - Required to prevent 546 errors

## Why Cloudinary?

The system now uses Cloudinary to **completely avoid** storing video files in Supabase Storage, which causes 546 memory errors.

### Old Flow (Causes 546 Errors):
```
VEO → GCS → Download to Edge Function → Upload to Supabase Storage ❌ (150 MB memory limit exceeded)
```

### New Flow (No Memory Issues):
```
VEO → GCS → Cloudinary fetches directly → Returns optimized URL ✅
Supabase → Only stores Cloudinary URLs (no files)
```

## Setup Steps

### 1. Create Cloudinary Account

1. Go to https://cloudinary.com/users/register_free
2. Sign up for a free account (25 GB storage, 25 GB bandwidth/month)
3. Verify your email

### 2. Get Your Credentials

After logging in, go to Dashboard:
- **Cloud Name:** Found at top (e.g., `dxyz123abc`)
- **API Key:** Found under "Account Details"
- **API Secret:** Click "Reveal" to show it

### 3. Add to Supabase Secrets

Go to: https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/settings/secrets

Add these three secrets:

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `CLOUDINARY_CLOUD_NAME` | Your cloud name | `dxyz123abc` |
| `CLOUDINARY_API_KEY` | Your API key | `123456789012345` |
| `CLOUDINARY_API_SECRET` | Your API secret | `abcdefghijklmnopqrstuvwxyz123456` |

**Optional:**
- `CLOUDINARY_FOLDER` - Folder for videos (default: `cinematic/veo`)

### 4. Add to Local .env (Optional)

Add to `/Users/marcelo/Documents/Curios/.env`:

```bash
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=cinematic/veo
```

### 5. Deploy Edge Functions

After adding secrets, redeploy:

```bash
cd /Users/marcelo/Documents/Curios
npm run deploy:cloudinary-process-video
npm run deploy:veo-generate-video
```

Or deploy all at once:
```bash
supabase functions deploy
```

## How It Works

### Video Processing Flow

1. **VEO generates video** → Stored in Google Cloud Storage (GCS)
2. **Edge function receives GCS URL** → Passes to Cloudinary
3. **Cloudinary fetches video** → From GCS directly (no memory in edge function!)
4. **Cloudinary processes** → Compresses and optimizes
5. **Returns URLs:**
   - `h264Url` - H.264 codec, 2000k bitrate (universal compatibility)
   - `h265Url` - H.265 codec, 1200k bitrate (better compression, modern devices)
   - `playbackUrl` - Defaults to H.264

### Benefits

✅ **No 546 errors** - Edge function never loads video into memory
✅ **Compressed videos** - Cloudinary optimizes (typically 50-70% smaller)
✅ **Fast playback** - CDN delivery worldwide
✅ **Multiple formats** - H.264 and H.265 support
✅ **Automatic optimization** - Quality and bitrate tuned per device

## Cloudinary Free Tier Limits

- **Storage:** 25 GB
- **Bandwidth:** 25 GB/month
- **Transformations:** 25,000/month

For cinematic videos:
- Average video size: ~5 MB
- Storage: ~5,000 videos
- Bandwidth: ~5,000 video views/month

If you exceed limits, upgrade to paid plan or implement video cleanup.

## Testing

After setup, generate a cinematic video:

```
https://curiosai.com/cinematic-results?q=How do volcanoes form?
```

Check console for:
```
[VEO Save] Skipping Supabase Storage, using Cloudinary directly to prevent 546 errors
[VEO Save] Video uploaded to Cloudinary successfully
```

Videos should now:
- ✅ Load faster (Cloudinary CDN)
- ✅ No 546 errors
- ✅ Optimized quality
- ✅ Work on all devices

## Troubleshooting

### "Cloudinary credentials not configured"

**Solution:** Add secrets to Supabase and redeploy edge functions.

### Cloudinary upload fails

**Fallback behavior:**
- System returns GCS URL directly
- Video still plays (from Google Cloud Storage)
- Check Cloudinary dashboard for errors

### Videos still show 546 errors

**Possible causes:**
1. Edge functions not redeployed after adding secrets
2. Using old cached function version
3. Cloudinary secrets incorrect

**Fix:**
```bash
# Force redeploy
supabase functions deploy veo-generate-video --no-verify-jwt
supabase functions deploy cloudinary-process-video --no-verify-jwt
```

## Storage Architecture

### What's Stored Where

| Item | Location | Format |
|------|----------|--------|
| VEO videos | Cloudinary | Optimized MP4 (H.264/H.265) |
| Video URLs | Supabase DB | Text (Cloudinary URLs) |
| Video metadata | Supabase DB | JSON |
| TTS audio | Data URLs | Base64-encoded MP3 |

### Database Schema

Videos are referenced by Cloudinary URLs:

```sql
-- Cinematic experiences table
CREATE TABLE cinematic_experiences (
  id UUID PRIMARY KEY,
  user_id UUID,
  title TEXT,
  scenes JSONB -- Contains Cloudinary URLs
);

-- Scene structure
{
  "id": "scene-1",
  "title": "Volcano Formation",
  "videoUrl": "https://res.cloudinary.com/.../veo_1234567.mp4",
  "cloudinaryPublicId": "cinematic/veo/user-123/veo_1234567"
}
```

## File References

- [veo-generate-video/index.ts](../../../supabase/functions/veo-generate-video/index.ts) - Main VEO function (updated)
- [cloudinary-process-video/index.ts](../../../supabase/functions/cloudinary-process-video/index.ts) - Cloudinary upload
- [VEO_546_ERROR_FIX.md](../../Studio/fixes/VEO_546_ERROR_FIX.md) - Original 546 error analysis

## Summary

✅ **Never store video files in Supabase** - Only URLs
✅ **Cloudinary handles all video storage** - Optimized and compressed
✅ **No 546 errors** - Edge functions don't download/upload files
✅ **Better performance** - CDN delivery + optimized formats
