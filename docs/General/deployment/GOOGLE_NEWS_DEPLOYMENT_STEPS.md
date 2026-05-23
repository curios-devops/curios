# Google News Edge Function Deployment - Step by Step

**Issue**: Explore page stuck on "Loading news..." in production

**Cause**: The `google-news` edge function exists in code but is NOT deployed to Supabase production

---

## ✅ What You've Done Already

1. ✅ Added `VITE_GOOGLE_NEWS_API_URL` to Netlify environment variables
2. ✅ Code is deployed to production

## ❌ What's Still Missing

The Supabase Edge Function is NOT deployed to production.

---

## 🚀 Deployment Steps (Do These Now)

### Step 1: Deploy the Edge Function to Supabase

```bash
# Navigate to your project
cd /Users/marcelo/Documents/Curios

# Deploy the google-news edge function
supabase functions deploy google-news --project-ref gpfccicfqynahflehpqo
```

Expected output:
```
Deploying function google-news...
Function deployed successfully!
```

### Step 2: Verify the Secret is Set in Supabase

The edge function needs `SERPAPI_API_KEY` to be set in Supabase secrets:

```bash
# Check if secret exists
supabase secrets list --project-ref gpfccicfqynahflehpqo
```

If `SERPAPI_API_KEY` is not listed, set it:

```bash
supabase secrets set SERPAPI_API_KEY=... --project-ref gpfccicfqynahflehpqo
```

### Step 3: Test the Edge Function

```bash
curl -X POST https://gpfccicfqynahflehpqo.supabase.co/functions/v1/google-news \
  -H "Content-Type: application/json" \
  -d '{"query": "technology"}'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "articles": [...]
  }
}
```

If you get a 404 → Edge function not deployed (go back to Step 1)
If you get a 500 with "SERPAPI_API_KEY is not configured" → Secret not set (go back to Step 2)

### Step 4: Verify in Production

1. Open https://curiosai.com/explore in your browser
2. Open browser console (F12)
3. Refresh the page
4. Check console logs:
   - Should see: `[EXPLORE] Fetching news from: https://...`
   - Should see: `[EXPLORE] Response status: 200`
   - Should see: `[EXPLORE] Result: {...}`
   - News should appear within 2-3 seconds

---

## 🔍 Why This Happened

**Local Dev Works** ✅
- Supabase CLI runs edge functions locally
- No deployment needed for dev

**Production Fails** ❌
- Edge functions must be manually deployed to Supabase
- Netlify env vars alone are not enough
- The edge function code exists but isn't running in Supabase cloud

---

## 📝 Summary

**Two separate deployments needed:**

1. **Frontend to Netlify** ✅ (You did this)
   - Added `VITE_GOOGLE_NEWS_API_URL`
   - Deployed React app

2. **Edge Function to Supabase** ❌ (Still needed)
   - Deploy `google-news` function
   - Verify `SERPAPI_API_KEY` secret

---

## 🐛 Troubleshooting

### Still seeing "Loading news..." after 15 seconds?

Check browser console for error message:
- "Edge function not found" → Run Step 1 again
- "Request timeout" → Function deployed but not responding (check Supabase logs)
- "SERPAPI_API_KEY is not configured" → Run Step 2

### Check Supabase Function Logs

```bash
supabase functions logs google-news --project-ref gpfccicfqynahflehpqo
```

Look for:
- `📰 [GOOGLE NEWS] Edge Function called`
- `✅ [GOOGLE NEWS] Response received`
- `❌ [GOOGLE NEWS] SERP API error`

---

## 📚 Related Files

- Edge Function: `supabase/functions/google-news/index.ts`
- Frontend: `src/mainPages/Explore.tsx`
- Full Deployment Doc: `docs/General/deployment/EXPLORE_PAGE_DEPLOYMENT.md`
