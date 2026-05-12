# Deploy Cinematic Updates - Quick Guide

## Changes Summary

✅ **All tasks completed:**
1. Updated Veo model to `veo-3.1-lite-generate-001` for faster generation
2. Fixed TypeScript warning (removed unused `handleShare` function)
3. Confirmed text streaming is working (user can read while videos generate)
4. Added Sources tab with Tavily sources (like search results)

---

## Deployment Steps

### 1. Deploy Edge Function (Required)

The Veo model has been updated to the lite version. You need to deploy the edge function:

```bash
# From project root
supabase functions deploy veo-generate-video
```

**Note**: Your system has Supabase CLI compatibility issues. You may need to:
- Update macOS to a newer version, OR
- Use Supabase Dashboard to deploy manually:
  1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/functions
  2. Click on `veo-generate-video` function
  3. Click "Deploy" or update the code in the web editor

### 2. Build & Deploy Frontend

```bash
# Build the app
npm run build

# Deploy to Netlify (or your hosting)
# The build is in the `dist/` folder
```

---

## What Changed

### Edge Function
**File**: `supabase/functions/veo-generate-video/index.ts`
- Line 12: Changed model from `veo-3.1-generate-001` to `veo-3.1-lite-generate-001`

### Frontend
**File**: `src/services/cinematic/pages/CinematicResults.tsx`
- Removed unused `handleShare` function
- Added Sources tab (4th tab)
- Refactored header to match Studio results pattern
- Sources now in dedicated tab instead of inline

---

## Testing After Deployment

1. **Go to Cinematic page**: Navigate to `/cinematic-results?q=test+question`
2. **Watch text stream**: Text should appear within 2-3 seconds
3. **Check tabs**: Should see 4 tabs (Video, Narrative, Scenes, Sources)
4. **Click Sources tab**: Should see Tavily sources with rich previews
5. **Test lite model**: Videos should generate faster than before

---

## Expected Improvements

### Speed
- **Text streaming**: User reads immediately (2-3 seconds)
- **Lite model**: Faster video generation (exact time TBD, need to test)

### UX
- **Better organization**: 4 clear tabs
- **Rich sources**: Cards with favicons, titles, snippets, images
- **Cleaner narrative**: No inline source links cluttering text

---

## Rollback (If Needed)

If the lite model has quality issues:

```typescript
// supabase/functions/veo-generate-video/index.ts
const MODEL_ID = "veo-3.1-generate-001"; // Revert to original
```

Then redeploy the edge function.

---

## Documentation

- **Full Details**: [docs/Cinematic/CINEMATIC_IMPROVEMENTS_SUMMARY.md](docs/Cinematic/CINEMATIC_IMPROVEMENTS_SUMMARY.md)
- **Header Refactor**: [docs/Cinematic/CINEMATIC_HEADER_REFACTOR.md](docs/Cinematic/CINEMATIC_HEADER_REFACTOR.md)

---

## Build Status

✅ Build successful - ready to deploy!

```
✓ 2020 modules transformed.
✓ built in 16.21s
```
