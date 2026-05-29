# 🔴 URGENT: Deployment Instructions

**All code fixes are complete. You MUST deploy the edge function to make them work!**

---

## What Was Fixed

### ✅ Frontend Fixes (Already Applied)
1. **Scene index mismatch** - Scene 1 will now display correctly
2. **URL parser enhancement** - Better handling of transformed Cloudinary URLs

### 🔴 Backend Fix (REQUIRES DEPLOYMENT)
3. **Duplicate folder path** - The critical Cloudinary 400 error fix

---

## Deployment Steps

### Option 1: Quick Deploy Script
```bash
cd /Users/marcelo/Documents/Curios
./scripts/deploy-cloudinary-fix.sh
```

### Option 2: Manual Supabase CLI
```bash
cd /Users/marcelo/Documents/Curios
supabase functions deploy cloudinary-process-video --no-verify-jwt
```

### Option 3: Supabase Dashboard (If CLI Fails)
1. Go to https://app.supabase.com/project/YOUR_PROJECT_ID/functions
2. Click on `cloudinary-process-video` function
3. Click "Edit"
4. Update lines 236 and 308 in the code:

**Line 236 - Change:**
```typescript
// FROM:
const publicId = `${CLOUDINARY_FOLDER}/${userId}/veo_${Date.now()}`;

// TO:
const publicId = `${userId}/veo_${Date.now()}`;
```

**Line 308 - Change:**
```typescript
// FROM:
const audioPublicId = `${CLOUDINARY_FOLDER}/${userId}/audio_${Date.now()}`;

// TO:
const audioPublicId = `${userId}/audio_${Date.now()}`;
```

5. Click "Deploy"

---

## Testing After Deployment

1. **Generate a new cinematic video** (not one you generated before)
2. **Check browser console** for these log messages:
   ```
   [CinematicService] Building Cloudinary concat URL
   [CinematicService] Parsed Cloudinary URL
     publicId: "cinematic/veo/curios-guest/veo_123"  ← Should appear once, not twice!
   ```
3. **Verify:**
   - [ ] All 4 scenes display in the carousel
   - [ ] Scene 1 shows and plays correctly
   - [ ] No Cloudinary 400 errors in console
   - [ ] Full stitched video URL is generated and playable
   - [ ] Captions appear on videos (white text at bottom)

---

## What Should Work After Deployment

### Before (Broken):
- ❌ Scene 1 missing or not showing
- ❌ Cloudinary 400 errors: `cinematic:veo:cinematic:veo:...`
- ❌ No full stitched video
- ❌ Only individual scenes playable

### After (Fixed):
- ✅ All scenes visible and playable
- ✅ Scene 1 displays correctly
- ✅ No Cloudinary errors
- ✅ Full stitched video generates successfully
- ✅ Main player shows all scenes concatenated
- ✅ Captions display on each scene

---

## Troubleshooting

### If Supabase CLI gives a symbol error:
```bash
brew upgrade supabase/tap/supabase
```

### If deployment fails:
Use Option 3 (Supabase Dashboard) above

### If issues persist after deployment:
1. Clear browser cache
2. Generate a **NEW** video (old ones use cached URLs)
3. Check console for the new log messages
4. Share the console logs if still having issues

---

## Documentation

- **Detailed fix explanation:** [CLOUDINARY_DUPLICATE_FIX.md](CLOUDINARY_DUPLICATE_FIX.md)
- **All fixes summary:** [CINEMATIC_MIX_FIXES_SUMMARY.md](CINEMATIC_MIX_FIXES_SUMMARY.md)

---

## Files Modified

### Frontend (No deployment needed):
- `src/services/cinematic/pages/CinematicResults.tsx`
- `src/services/cinematic/cinematicService.ts`

### Backend (REQUIRES DEPLOYMENT):
- `supabase/functions/cloudinary-process-video/index.ts` ⚠️ **MUST DEPLOY!**

---

**Don't forget to deploy! The frontend fixes alone won't solve the 400 errors.**
