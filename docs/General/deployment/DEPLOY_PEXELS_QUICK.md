# Deploy Pexels Search Function - Quick Guide

## ⚡ Quick Deploy Steps

### Option 1: Supabase Dashboard (Easiest)

1. **Go to:** https://app.supabase.com
2. **Navigate to:** Your Project → Edge Functions
3. **Find:** `pexels-search` function
4. **Click:** Edit or Create New
5. **Copy-Paste:** The code below
6. **Click:** Deploy

---

## 📋 Code to Deploy

### File 1: index.ts

```typescript
// Pexels Search Edge Function
// Securely proxies Pexels API calls to prevent API key exposure
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

console.log("Pexels Search function up and running!")

// @ts-ignore: Deno runtime
Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, type = 'videos', perPage = 5, orientation = 'portrait' } = await req.json()

    console.log('🎬 Pexels Search called:', { query, type, perPage, orientation });

    if (!query) {
      console.error('❌ No query provided');
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // @ts-ignore: Deno environment variable
    const PEXELS_API_KEY = Deno.env.get('PEXELS_API_KEY')
    console.log('🔑 API Key check:', {
      hasKey: !!PEXELS_API_KEY,
      keyLength: PEXELS_API_KEY?.length || 0
    });

    if (!PEXELS_API_KEY) {
      console.error('❌ PEXELS_API_KEY environment variable not set');
      return new Response(
        JSON.stringify({ error: 'Pexels API key not configured. Please set PEXELS_API_KEY environment variable.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine API endpoint based on type
    const baseUrl = type === 'videos'
      ? 'https://api.pexels.com/videos/search'
      : 'https://api.pexels.com/v1/search';

    // Build query parameters
    const params = new URLSearchParams({
      query,
      per_page: perPage.toString(),
      orientation: orientation, // Both videos and photos support orientation
    });

    const pexelsUrl = `${baseUrl}?${params}`;
    console.log('📡 Calling Pexels API:', pexelsUrl);

    const pexelsResponse = await fetch(pexelsUrl, {
      method: 'GET',
      headers: {
        'Authorization': PEXELS_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!pexelsResponse.ok) {
      const errorText = await pexelsResponse.text();
      console.error('Pexels API error:', pexelsResponse.status, errorText);
      return new Response(
        JSON.stringify({
          error: `Pexels API error: ${pexelsResponse.status}`,
          details: errorText
        }),
        { status: pexelsResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const pexelsData = await pexelsResponse.json();

    console.log('✅ Pexels search successful:', {
      type,
      totalResults: type === 'videos' ? pexelsData.total_results : pexelsData.total_results,
      returned: type === 'videos' ? pexelsData.videos?.length : pexelsData.photos?.length
    });

    // Return the raw Pexels API response
    return new Response(
      JSON.stringify(pexelsData),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in pexels-search:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### File 2: deno.json (Optional - for linting)

```json
{
  "imports": {
    "@supabase/functions-js/edge-runtime.d.ts": "jsr:@supabase/functions-js@2/edge-runtime.d.ts"
  }
}
```

---

## 🔑 Environment Variable

**CRITICAL:** Make sure `PEXELS_API_KEY` is set!

### Check/Set in Supabase Dashboard:

1. **Go to:** Project Settings → Edge Functions
2. **Click:** Secrets
3. **Check:** `PEXELS_API_KEY` exists
4. **If not:** Add new secret:
   - Name: `PEXELS_API_KEY`
   - Value: Your Pexels API key from https://www.pexels.com/api/

---

## ✅ Verification

After deploying, test the function:

### Test in Supabase Dashboard

1. Go to Edge Functions → `pexels-search`
2. Click **Invoke**
3. Test body:
```json
{
  "query": "nature",
  "type": "videos",
  "perPage": 5,
  "orientation": "landscape"
}
```
4. Should return Pexels video data

### Test in App

1. Generate a new cinematic video
2. Open browser console (F12)
3. Should see: `✅ Pexels search successful`
4. Should NOT see CORS errors
5. First scene should have video (not `null`)

---

## 🐛 Troubleshooting

### Error: "Pexels API key not configured"
**Fix:** Set `PEXELS_API_KEY` in Supabase Dashboard → Edge Functions → Secrets

### Error: "CORS policy blocked"
**Fix:** Make sure you deployed THIS version (has proper CORS headers)

### Error: "No videos found"
**Fix:** Normal - some queries might not have videos. Try different query.

### First scene still null
**Fix:**
1. Clear browser cache
2. Hard refresh (Cmd+Shift+R)
3. Generate NEW cinematic video
4. Check Network tab - should see call to `pexels-search`

---

## 📊 What This Fixes

| Issue | Before | After |
|-------|--------|-------|
| CORS Error | ❌ Yes | ✅ No |
| First Scene | `null` | Video URL |
| API Key Security | ❌ Exposed in browser | ✅ Hidden in backend |
| Pexels Videos | ❌ Fail | ✅ Work |

---

## 🚀 Next Steps After Deploy

1. ✅ Deploy `pexels-search` (you're doing this now)
2. ⏳ Deploy `cloudinary-process-video` (for multi-line captions)
   - See: [DEPLOY_CLOUDINARY_MANUAL.md](DEPLOY_CLOUDINARY_MANUAL.md)
3. ⏳ Test full cinematic generation

---

## 📝 Related Files

- Frontend: [src/services/cinematic/providers/PexelsFallbackProvider.ts](src/services/cinematic/providers/PexelsFallbackProvider.ts)
- Backend: [supabase/functions/pexels-search/index.ts](supabase/functions/pexels-search/index.ts)
- Documentation: [docs/Cinematic/fixes/PEXELS_CORS_FIX.md](docs/Cinematic/fixes/PEXELS_CORS_FIX.md)
