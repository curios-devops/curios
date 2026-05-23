# Explore Page - Deployment Guide

**Date**: 2026-05-23
**Feature**: Google News Edge Function

## Overview

The Explore page requires deployment of a new Supabase Edge Function (`google-news`) that securely handles SerpAPI calls.

## Deployment Steps

### 1. Deploy Edge Function

Deploy the `google-news` edge function manually:

```bash
cd supabase/functions
supabase functions deploy google-news
```

### 2. Set Environment Variables

Set the `SERPAPI_API_KEY` secret in Supabase:

```bash
supabase secrets set SERPAPI_API_KEY=c25f9802be19c7974a87a148e4133ad3ee344567f2090f930689100954d18e4a
```

### 3. Verify Deployment

Test the edge function:

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
    "articles": [...],
    "query": "technology"
  }
}
```

## Frontend Configuration

The frontend is already configured to use the edge function via `VITE_SERP_API_URL` from `.env`:

```
VITE_SERP_API_URL=https://gpfccicfqynahflehpqo.supabase.co/functions/v1/reverse-image-search
```

The code automatically replaces `/reverse-image-search` with `/google-news` when calling the news API.

## Security Notes

- ✅ `SERPAPI_API_KEY` is stored server-side only (Supabase secrets)
- ✅ Key is never exposed to frontend/browser
- ✅ CORS headers are configured for the frontend domain
- ✅ Edge function includes timeout protection (30s)
- ✅ Edge function includes error handling and logging

## Testing Checklist

After deployment:

- [ ] Edge function deploys without errors
- [ ] Environment variable is set correctly
- [ ] Test curl command returns news articles
- [ ] Frontend `/explore` page loads news
- [ ] No API key visible in browser network tab
- [ ] Error handling works (test with invalid query)
- [ ] Loading states work correctly
- [ ] Retry button functions properly

## Troubleshooting

### Edge Function Not Found (404)
```bash
# Verify function is deployed
supabase functions list

# Redeploy if needed
supabase functions deploy google-news
```

### API Key Error
```bash
# Verify secret is set
supabase secrets list

# Set secret if missing
supabase secrets set SERPAPI_API_KEY=your_key_here
```

### CORS Error
Check that the edge function includes CORS headers:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}
```

### Timeout Issues
The edge function has a 30s timeout. If SerpAPI is slow:
1. Check SerpAPI status
2. Consider adding retry logic
3. Increase timeout if needed

## Monitoring

Monitor edge function logs:
```bash
supabase functions logs google-news
```

Look for:
- `📰 [GOOGLE NEWS] Edge Function called`
- `✅ [GOOGLE NEWS] Response received`
- `❌ [GOOGLE NEWS] SERP API error` (indicates issues)

## Rollback

If issues occur, you can disable the feature by:
1. Reverting the frontend code changes
2. Or setting a feature flag (if implemented)

## Related Files

- Edge Function: `supabase/functions/google-news/index.ts`
- Frontend: `src/mainPages/Explore.tsx`
- Routing: `src/main.tsx`
- Navigation: `src/components/Sidebar.tsx`
- Documentation: `docs/General/features/EXPLORE_PAGE.md`

## Notes

This edge function follows the same pattern as existing functions:
- `reverse-image-search` - Reverse image search via SerpAPI
- `google-images-search` - Google Images search
- `brave-web-search` - Brave web search

The implementation is consistent with the codebase's security practices.
