# 🚀 Deploy All Cinematic Fixes - Complete Guide

**Date:** 2026-05-01

## 📋 Overview

Hay **2 funciones** que necesitas hacer deploy para que el sistema funcione correctamente:

1. ✅ **pexels-search** - Arregla CORS y primera escena null
2. ✅ **cloudinary-process-video** - Arregla captions multi-línea y audio completo

---

## 🎯 Deploy Order (Important!)

### Step 1: Deploy `pexels-search` (CRITICAL - Do First!)

**Why First?** Sin esto, NO se generan videos (CORS error).

**Quick Deploy:**
1. Dashboard: https://app.supabase.com → Edge Functions
2. Find/Create: `pexels-search`
3. Copy code from: [DEPLOY_PEXELS_QUICK.md](DEPLOY_PEXELS_QUICK.md)
4. Deploy
5. Verify: Check `PEXELS_API_KEY` environment variable is set

**Test:**
```
Generate cinematic → Should NOT see CORS errors → First scene should have video
```

---

### Step 2: Deploy `cloudinary-process-video` (For Better UX)

**Why?** Arregla captions multi-línea y audio completo (no cortado).

**Quick Deploy:**
1. Dashboard: https://app.supabase.com → Edge Functions
2. Find: `cloudinary-process-video`
3. Copy ENTIRE code from:
   ```
   /Users/marcelo/Documents/Curios/supabase/functions/cloudinary-process-video/index.ts
   ```
4. Deploy
5. Verify: Check `CLOUDINARY_*` environment variables

**Test:**
```
Generate cinematic → Captions should show 2-3 lines → Audio should play completely
```

---

## 📝 Detailed Instructions

### Option A: Supabase Dashboard (Recommended)

#### For `pexels-search`:
See complete instructions: [DEPLOY_PEXELS_QUICK.md](DEPLOY_PEXELS_QUICK.md)

#### For `cloudinary-process-video`:
See complete instructions: [DEPLOY_CLOUDINARY_MANUAL.md](DEPLOY_CLOUDINARY_MANUAL.md)

### Option B: CLI (If Supabase CLI Works)

```bash
# Deploy pexels-search
supabase functions deploy pexels-search

# Deploy cloudinary-process-video
supabase functions deploy cloudinary-process-video --no-verify-jwt
```

**Note:** CLI has compatibility issues on macOS Catalina. Use Dashboard instead.

---

## ✅ What Gets Fixed

### After Deploying `pexels-search`:

| Issue | Before | After |
|-------|--------|-------|
| CORS Error | ❌ `blocked by CORS policy` | ✅ No error |
| First Scene | `null` | ✅ Video URL |
| Console Errors | ❌ 504 Gateway Timeout | ✅ Clean |
| Video Generation | ❌ Fails | ✅ Works |

### After Deploying `cloudinary-process-video`:

| Issue | Before | After |
|-------|--------|-------|
| Captions | Single long line | ✅ 2-3 lines (readable) |
| Audio | Cut at 7 seconds | ✅ Plays fully |
| Caption Position | Middle of screen | ✅ Bottom (proper) |
| Background | None | ✅ Semi-transparent black |

---

## 🔑 Environment Variables to Check

### For `pexels-search`:
- `PEXELS_API_KEY` - Get from https://www.pexels.com/api/

### For `cloudinary-process-video`:
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER` (default: "cinematic/veo")

**Where to set:**
Supabase Dashboard → Project Settings → Edge Functions → Secrets

---

## 🧪 Testing Checklist

### After Both Deploys:

- [ ] Generate NEW cinematic video (old ones use cache)
- [ ] Browser Console (F12) - NO CORS errors
- [ ] Network Tab - See calls to `pexels-search` and `cloudinary-process-video`
- [ ] First scene has video URL (not `null`)
- [ ] All 4 scenes generate successfully
- [ ] Captions show in 2-3 lines (not single line)
- [ ] Audio plays completely (not cut at 7s)
- [ ] Captions at bottom of video with dark background
- [ ] Video autoplays immediately when ready
- [ ] Seamless transitions between scenes (no gaps)

---

## 🐛 Troubleshooting

### Issue: Still seeing CORS errors
**Fix:**
1. Clear browser cache (Cmd+Shift+Delete)
2. Hard refresh (Cmd+Shift+R)
3. Verify `pexels-search` deployed successfully
4. Check Network tab - should see call to `/functions/v1/pexels-search`

### Issue: First scene still null
**Fix:**
1. Check `pexels-search` function logs in Supabase Dashboard
2. Verify `PEXELS_API_KEY` is set
3. Try different query (some might not have videos)

### Issue: Captions still single line
**Fix:**
1. Verify `cloudinary-process-video` deployed with latest code
2. Generate NEW video (old URLs cached by Cloudinary)
3. Check Network tab - URL should have multiple text layers

### Issue: Audio still cuts off
**Fix:**
1. Verify `cloudinary-process-video` has latest code (line 367-371)
2. Should NOT have duration limit when `narrationAudioPublicId` exists
3. Check Cloudinary URL - should NOT have `du_7` parameter

---

## 📊 Deployment Status

Track your progress:

| Function | Status | Notes |
|----------|--------|-------|
| `pexels-search` | ⏳ Pending | Fix CORS, first scene null |
| `cloudinary-process-video` | ⏳ Pending | Fix captions, audio |

After deploy, update to ✅ Done

---

## 📁 Files Reference

### Frontend Changes (Already Done):
- ✅ [src/services/cinematic/providers/PexelsFallbackProvider.ts](src/services/cinematic/providers/PexelsFallbackProvider.ts)
- ✅ [src/services/cinematic/cinematicService.ts](src/services/cinematic/cinematicService.ts)
- ✅ [src/services/cinematic/pages/CinematicResults.tsx](src/services/cinematic/pages/CinematicResults.tsx)
- ✅ [src/components/cinematic/SequentialVideoPlayer.tsx](src/components/cinematic/SequentialVideoPlayer.tsx)

### Backend Changes (Need Deploy):
- ⏳ [supabase/functions/pexels-search/index.ts](supabase/functions/pexels-search/index.ts)
- ⏳ [supabase/functions/cloudinary-process-video/index.ts](supabase/functions/cloudinary-process-video/index.ts)

---

## 📚 Documentation

Detailed docs for each fix:

1. **CORS Fix:**
   - [PEXELS_CORS_FIX.md](docs/Cinematic/fixes/PEXELS_CORS_FIX.md)
   - [DEPLOY_PEXELS_QUICK.md](DEPLOY_PEXELS_QUICK.md)

2. **Cloudinary Fixes:**
   - [CINEMATIC_CAPTION_MULTILINE_TRANSITION_FIX.md](docs/Cinematic/fixes/CINEMATIC_CAPTION_MULTILINE_TRANSITION_FIX.md)
   - [DEPLOY_CLOUDINARY_MANUAL.md](DEPLOY_CLOUDINARY_MANUAL.md)

3. **Other Fixes:**
   - [CINEMATIC_MIX_AUTOPLAY_FIX.md](docs/Cinematic/fixes/CINEMATIC_MIX_AUTOPLAY_FIX.md)
   - [CINEMATIC_AUTOPLAY_BADGE_FIX.md](docs/Cinematic/fixes/CINEMATIC_AUTOPLAY_BADGE_FIX.md)
   - [CINEMATIC_CAPTION_DURATION_FIX.md](docs/Cinematic/fixes/CINEMATIC_CAPTION_DURATION_FIX.md)

---

## 🎯 Expected Results

### Before All Fixes:
```
❌ CORS error blocks Pexels
❌ First scene: null
❌ Captions: Single long line
❌ Audio: Cut at 7 seconds
❌ Video: Doesn't autoplay
❌ Transitions: 1-second gaps
```

### After All Fixes:
```
✅ No CORS errors
✅ All 4 scenes generate with videos
✅ Captions: 2-3 readable lines
✅ Audio: Plays completely
✅ Video: Autoplays immediately
✅ Transitions: Seamless (no gaps)
✅ Professional, polished UX
```

---

## ⏱️ Time Estimate

- Deploy `pexels-search`: **5 minutes**
- Deploy `cloudinary-process-video`: **5 minutes**
- Testing: **5 minutes**
- **Total: ~15 minutes**

---

## 🆘 Need Help?

If you encounter issues:

1. Check Supabase Edge Function logs
2. Check browser console (F12)
3. Check Network tab for function calls
4. Verify environment variables are set
5. Try generating a NEW cinematic video (don't reuse old ones)

---

## ✅ Success Criteria

You'll know everything works when:

1. ✅ No CORS errors in console
2. ✅ All 4 scenes have videos
3. ✅ Captions display in 2-3 lines at bottom
4. ✅ Audio plays completely (no cuts)
5. ✅ Video autoplays immediately
6. ✅ Seamless playback from scene to scene

---

**Ready to Deploy?** Start with [DEPLOY_PEXELS_QUICK.md](DEPLOY_PEXELS_QUICK.md) 🚀
