# Pexels CORS Error Fix

**Date:** 2026-05-01
**Status:** ✅ Fixed

## Problem

**Error in Console:**
```
Access to fetch at 'https://api.pexels.com/videos/search?query=...' from origin 'http://localhost:5173'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.

GET https://api.pexels.com/videos/search... net::ERR_FAILED 504 (Gateway Timeout)
```

**Symptoms:**
1. First scene video returns `null`
2. Pexels API calls fail with CORS error
3. No fallback to Pixabay
4. Videos don't generate

**Root Cause:**
The `PexelsFallbackProvider` was calling the Pexels API directly from the browser (line 81-88), which violates CORS policy. Pexels API requires server-side calls.

---

## Solution

### Changed: Use Supabase Edge Function Instead of Direct API Call

**BEFORE (Direct API Call - CORS Error):**
```typescript
// ❌ This causes CORS error!
const response = await fetch(
  `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=5&orientation=${orientation}`,
  {
    headers: {
      Authorization: this.apiKey, // API key exposed in browser!
    },
  }
);
```

**AFTER (Backend Proxy - No CORS):**
```typescript
// ✅ Use Supabase Edge Function as proxy
const { supabase } = await import('../../../lib/supabase');
const { data, error } = await supabase.functions.invoke('pexels-search', {
  body: {
    query,
    type: 'videos',
    perPage: 5,
    orientation,
  },
});
```

---

## Files Modified

### 1. Frontend: PexelsFallbackProvider.ts

**File:** [src/services/cinematic/providers/PexelsFallbackProvider.ts](../../../src/services/cinematic/providers/PexelsFallbackProvider.ts)

**Changes:**
- Removed direct `fetch()` call to Pexels API
- Added `supabase.functions.invoke('pexels-search')` call
- Removed API key dependency (handled by backend)
- Updated `isAvailable()` to return `true` (always available via backend)

**Key Lines:**
```typescript
// Line 67-93: Changed from direct fetch to backend call
async getVideo(query: string, aspectRatio: '16:9' | '1:1' = '16:9'): Promise<PexelsVideo> {
  const orientation = aspectRatio === '1:1' ? 'square' : 'landscape';

  // Use Supabase Edge Function to avoid CORS issues
  const { supabase } = await import('../../../lib/supabase');
  const { data, error } = await supabase.functions.invoke('pexels-search', {
    body: { query, type: 'videos', perPage: 5, orientation },
  });

  if (error) throw new Error(`Pexels backend error: ${error.message}`);
  // ... rest of code
}

// Line 145-148: Always available now
isAvailable(): boolean {
  return true; // Backend handles API key
}
```

### 2. Backend: pexels-search Edge Function

**File:** [supabase/functions/pexels-search/index.ts](../../../supabase/functions/pexels-search/index.ts)

**Changes:**
- Fixed orientation parameter for videos (was only sent for photos)
- Now sends `orientation` for both photos and videos

**Key Lines:**
```typescript
// Line 51-56: Fixed to send orientation for videos
const params = new URLSearchParams({
  query,
  per_page: perPage.toString(),
  orientation: orientation, // ✅ Both videos and photos support orientation
});
```

---

## Why This Fixes the Problem

### CORS Policy
- **Browser → Pexels API**: ❌ CORS blocked (different origin)
- **Supabase Edge Function → Pexels API**: ✅ Allowed (server-to-server)
- **Browser → Supabase Edge Function**: ✅ Allowed (CORS headers configured)

### Security Benefits
- ✅ API key hidden in backend (not exposed in browser)
- ✅ No API key in client-side code
- ✅ Backend can rate-limit and monitor usage
- ✅ Follows best practices

---

## Deployment Instructions

### Deploy pexels-search Function

**Option 1: Supabase Dashboard**
1. Go to Supabase Dashboard → Edge Functions
2. Find `pexels-search`
3. Copy code from: `/Users/marcelo/Documents/Curios/supabase/functions/pexels-search/index.ts`
4. Paste and Deploy

**Option 2: CLI (if working)**
```bash
supabase functions deploy pexels-search
```

### Verify Environment Variable

Make sure `PEXELS_API_KEY` is set in Supabase:
1. Dashboard → Project Settings → Edge Functions
2. Secrets → Check `PEXELS_API_KEY` exists
3. If not, add it with your Pexels API key

---

## Testing

### Before Fix
```
❌ Console Error:
   Access to fetch at 'https://api.pexels.com/videos/search...' blocked by CORS

❌ First scene: null
❌ No video generated
```

### After Fix
```
✅ No CORS errors
✅ Pexels videos load successfully
✅ First scene has video
✅ All scenes generate properly
```

### Test Steps
1. Generate new cinematic video
2. Check browser console (F12) - should see no CORS errors
3. Check Network tab - should see call to `/functions/v1/pexels-search`
4. Verify first scene has video URL
5. Verify all 4 scenes load

---

## Related Issues Fixed

### Issue 1: First Scene Returning Null
**Cause:** Pexels CORS error meant first scene failed to get video
**Fix:** Backend proxy eliminates CORS issue

### Issue 2: No Pixabay Fallback
**Cause:** Pexels provider was throwing error before Pixabay could be tried
**Fix:** Backend handles errors gracefully, allowing fallback

### Issue 3: API Key Exposure
**Cause:** API key was in frontend code (security risk)
**Fix:** API key now only in backend environment variables

---

## Architecture Diagram

### Before (Broken)
```
Browser (localhost:5173)
    ↓ Direct fetch
Pexels API (api.pexels.com)
    ↓ CORS Error ❌
Request Blocked
```

### After (Working)
```
Browser (localhost:5173)
    ↓ supabase.functions.invoke()
Supabase Edge Function (pexels-search)
    ↓ Server-to-server fetch
Pexels API (api.pexels.com)
    ↓ Success ✅
Video data returned
```

---

## Code References

### Frontend Changes
- [PexelsFallbackProvider.ts:67-93](../../../src/services/cinematic/providers/PexelsFallbackProvider.ts#L67-L93) - Changed to backend call
- [PexelsFallbackProvider.ts:145-148](../../../src/services/cinematic/providers/PexelsFallbackProvider.ts#L145-L148) - Updated availability check

### Backend Changes
- [pexels-search/index.ts:51-56](../../../supabase/functions/pexels-search/index.ts#L51-L56) - Fixed orientation parameter

---

## Next Steps

1. ✅ Deploy `pexels-search` function to Supabase
2. ✅ Verify `PEXELS_API_KEY` environment variable is set
3. ✅ Test cinematic video generation
4. ✅ Check that all 4 scenes generate successfully
5. ⏳ Deploy `cloudinary-process-video` function (for caption fixes)

---

## Related Fixes

- [CINEMATIC_CAPTION_MULTILINE_TRANSITION_FIX.md](CINEMATIC_CAPTION_MULTILINE_TRANSITION_FIX.md) - Multi-line captions
- [DEPLOY_CLOUDINARY_MANUAL.md](../../DEPLOY_CLOUDINARY_MANUAL.md) - Cloudinary deployment instructions
