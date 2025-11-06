# Deploy Reverse Image Search Edge Function

## 📋 Prerequisites

- Supabase CLI installed
- Logged in to Supabase (`supabase login`)
- SERP API key (from https://serpapi.com)

---

## 🚀 Deployment Steps

### 1. Add SERP API Key as Supabase Secret

The Edge Function needs the SERP API key to work. Add it as a secret:

```bash
# Add the secret to Supabase
supabase secrets set SERPAPI_API_KEY=c25f9802be19c7974a87a148e4133ad3ee344567f2090f930689100954d18e4a
```

**Verify the secret was added:**
```bash
supabase secrets list
```

You should see:
```
NAME                VALUE (PREVIEW)
SERPAPI_API_KEY     c25f98...
```

---

### 2. Deploy the Edge Function

```bash
# Deploy the reverse-image-search function
supabase functions deploy reverse-image-search
```

**Expected output:**
```
Deploying Function reverse-image-search (project ref: gpfccicfqynahflehpqo)
Packaged Function reverse-image-search (39.4 kB)
Deployed Function reverse-image-search in 2.3s
Function URL: https://gpfccicfqynahflehpqo.supabase.co/functions/v1/reverse-image-search
```

---

### 3. Test the Edge Function

```bash
# Test with curl
curl -X POST https://gpfccicfqynahflehpqo.supabase.co/functions/v1/reverse-image-search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg/1200px-Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "web": [
      {
        "title": "Eiffel Tower - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Eiffel_Tower",
        "content": "The Eiffel Tower is a wrought-iron lattice tower..."
      }
    ],
    "images": [...],
    "relatedSearches": [...]
  }
}
```

---

## 🔍 Troubleshooting

### Error: "SERPAPI_API_KEY is not set"

**Cause**: Secret not set or not deployed with function

**Fix**:
```bash
# Set the secret again
supabase secrets set SERPAPI_API_KEY=your_key_here

# Redeploy function to pick up the secret
supabase functions deploy reverse-image-search
```

---

### Error: "401 Unauthorized" from SERP API

**Cause**: Invalid API key

**Fix**:
1. Go to https://serpapi.com/manage-api-key
2. Copy your API key
3. Update the secret:
```bash
supabase secrets set SERPAPI_API_KEY=your_new_key
supabase functions deploy reverse-image-search
```

---

### Error: "CORS policy" in browser console

**Cause**: Missing CORS headers (should be fixed in the Edge Function)

**Fix**: The Edge Function already includes CORS headers:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

If still seeing CORS errors, check browser console for the actual error message.

---

## 📝 Environment Variables

### Local Development (.env)
```bash
# SERP API (used by Edge Function)
SERPAPI_API_KEY=c25f9802be19c7974a87a148e4133ad3ee344567f2090f930689100954d18e4a

# Supabase (client-side)
VITE_SUPABASE_URL=https://gpfccicfqynahflehpqo.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Supabase Secrets (server-side)
```bash
# Set via CLI (server-side only, not exposed to client)
supabase secrets set SERPAPI_API_KEY=c25f9802be19c7974a87a148e4133ad3ee344567f2090f930689100954d18e4a
```

---

## ✅ Verification Checklist

- [ ] SERP API key added as Supabase secret
- [ ] Secret visible in `supabase secrets list`
- [ ] Edge Function deployed successfully
- [ ] Function URL returned: `https://.../functions/v1/reverse-image-search`
- [ ] Test curl request returns valid JSON
- [ ] Browser test: Upload image → Search → No CORS errors
- [ ] Console shows: `🔍 [REVERSE IMAGE TOOL] Response received: 200 OK`

---

## 🎯 Next Steps

After successful deployment:

1. **Test in app**: Upload an image without text → Click Search
2. **Check console**: Should see SERP API call to Edge Function (not serpapi.com directly)
3. **Verify results**: Should show OpenAI-generated analysis with sources
4. **Test combined**: Upload image + enter text → Should merge results

---

**Created**: 2025-10-20  
**Function**: `reverse-image-search`  
**Pattern**: Same as `brave-search` (client → Edge Function → SERP API)
