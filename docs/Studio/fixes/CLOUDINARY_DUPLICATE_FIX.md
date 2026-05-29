# Cloudinary Duplicate Folder Path Fix

**Date:** 2026-04-23
**Priority:** 🔴 **CRITICAL** - Blocks video generation
**Status:** ✅ **FIXED** - Awaiting deployment

---

## The Problem

Cloudinary was returning **400 Bad Request** errors with malformed URLs like:
```
https://res.cloudinary.com/doha07wk9/video/upload/
  l_video:cinematic:veo:cinematic:veo:curios-guest:veo_1776977164356,fl_splice/...
          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
          Duplicate folder path!
```

Notice `cinematic:veo` appears **twice** in the public ID.

---

## Root Cause

In [cloudinary-process-video/index.ts](supabase/functions/cloudinary-process-video/index.ts), the code was:

### ❌ BEFORE (Wrong):
```typescript
// Line 235
const publicId = `${CLOUDINARY_FOLDER}/${userId}/veo_${Date.now()}`;
//                 ^^^^^^^^^^^^^^^^^^^
//                 Already includes "cinematic/veo"

// Line 157-162 (uploadToCloudinary function)
const signParams: Record<string, string> = {
  folder: CLOUDINARY_FOLDER,  // ❌ Adds "cinematic/veo" AGAIN!
  public_id: publicId,         // Already has "cinematic/veo" prefix
  //...
};
```

### How Cloudinary processes this:
```
folder:    "cinematic/veo"
public_id: "cinematic/veo/curios-guest/veo_123"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Result:    "cinematic/veo/cinematic/veo/curios-guest/veo_123"  ❌
```

When using **both** `folder` and a `public_id` with the folder prefix, Cloudinary concatenates them, causing duplication.

---

## The Fix

### ✅ AFTER (Correct):
```typescript
// Line 236
// Don't include CLOUDINARY_FOLDER in publicId - it's added via the folder parameter
const publicId = `${userId}/veo_${Date.now()}`;
//                NO FOLDER PREFIX - just userId/filename

// Line 157-162 (uploadToCloudinary function)
const signParams: Record<string, string> = {
  folder: CLOUDINARY_FOLDER,  // ✅ Only specify folder here
  public_id: publicId,         // ✅ No folder prefix
  //...
};
```

### How Cloudinary processes this:
```
folder:    "cinematic/veo"
public_id: "curios-guest/veo_123"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Result:    "cinematic/veo/curios-guest/veo_123"  ✅
```

---

## Files Modified

1. **supabase/functions/cloudinary-process-video/index.ts:236**
   - Removed `${CLOUDINARY_FOLDER}/` from video publicId

2. **supabase/functions/cloudinary-process-video/index.ts:308**
   - Removed `${CLOUDINARY_FOLDER}/` from audio publicId

3. **src/services/cinematic/cinematicService.ts:1067-1117**
   - Added debug logging to `buildCloudinaryConcatUrl()` to help diagnose future issues

---

## Deployment

### Option 1: Use the deployment script
```bash
./scripts/deploy-cloudinary-fix.sh
```

### Option 2: Manual deployment
```bash
supabase functions deploy cloudinary-process-video --no-verify-jwt
```

### Option 3: Supabase Dashboard (if CLI fails)
1. Go to https://app.supabase.com/project/YOUR_PROJECT/functions
2. Find `cloudinary-process-video` function
3. Update the code with the changes from this commit
4. Deploy via the dashboard

---

## Testing After Deployment

1. **Clear any cached videos** (if applicable)
2. **Generate a new cinematic video** with 3-4 scenes
3. **Verify in console logs:**
   ```
   [CinematicService] Building Cloudinary concat URL
   [CinematicService] Parsed Cloudinary URL
     publicId: "cinematic/veo/curios-guest/veo_123"  ✅ Single occurrence
   ```
4. **Check the final concat URL** should be valid:
   ```
   https://res.cloudinary.com/doha07wk9/video/upload/
     l_video:cinematic:veo:curios-guest:veo_2,fl_splice/
     l_video:cinematic:veo:curios-guest:veo_3,fl_splice/
     f_mp4,q_auto:good/
     cinematic/veo/curios-guest/veo_1.mp4
   ```

5. **Verify the stitched video plays** without 400 errors

---

## Impact

This fix resolves:
- ✅ Cloudinary 400 errors when stitching scenes
- ✅ Malformed layer public IDs in splice transformations
- ✅ Full video generation failures
- ✅ Scene concat URL construction

**Before:** Videos couldn't be stitched, all scenes played individually only
**After:** All scenes stitch into a final playable video

---

## Related Issues

- Scene 1 not showing: Fixed in [CinematicResults.tsx](src/services/cinematic/pages/CinematicResults.tsx) (index mismatch)
- Missing captions: Already working, no fix needed
- VideoPersistence warning: Expected behavior for guests

---

## Additional Notes

### Why This Wasn't Caught Earlier
- Individual scene mixing worked fine (no concat needed)
- The bug only manifested when building the **full video** concat URL
- Parse function improvements helped identify the issue

### Prevention
Added extensive logging in `buildCloudinaryConcatUrl()` to catch similar issues early.
