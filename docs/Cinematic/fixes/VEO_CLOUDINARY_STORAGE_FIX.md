# Fix: VEO Storage Error - Use Cloudinary Only

## Error

```
Failed to upload base64 video to GCS: 404
"The specified bucket does not exist."
```

## Root Cause

VEO edge function trying to use GCS bucket that doesn't exist. **Correct architecture uses Cloudinary**, not GCS or Supabase Storage.

---

## ✅ Correct Architecture

```
VEO Flow:
1. VEO generates → Temporary GCS URL
2. Cloudinary downloads → Processes → Stores
3. App gets Cloudinary playback URL
4. Only URLs in Supabase DB (NO video files)
```

---

## Quick Fix

```bash
cd /Users/marcelo/Documents/Curios
./scripts/fix-veo-storage.sh
```

Or manual:

```bash
# 1. Configure Cloudinary
npx supabase secrets set CLOUDINARY_CLOUD_NAME=your_cloud_name
npx supabase secrets set CLOUDINARY_API_KEY=your_api_key
npx supabase secrets set CLOUDINARY_API_SECRET=your_api_secret

# 2. Remove old configs
npx supabase secrets unset VIDEO_STORAGE_BACKEND
npx supabase secrets unset GCS_VIDEO_BUCKET

# 3. Redeploy
npx supabase functions deploy veo-generate-video
```

---

**Date**: 2026-04-18
**Status**: ✅ Use Cloudinary Only
