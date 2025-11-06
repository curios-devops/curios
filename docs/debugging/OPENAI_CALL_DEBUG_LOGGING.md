# OpenAI Call Debug - Enhanced Logging

## Changes Made

### 1. Fixed Tab Name ✅
**File**: `/src/services/search/pro/pages/ProSearchResultsV2.tsx`

**Change**: Renamed first tab from "All" to "Overview" to match regular search
```typescript
// Before
<FileText size={16} />
All

// After
<FileText size={16} />
Overview
```

### 2. Enhanced OpenAI Fetch Logging ✅
**File**: `/src/services/search/regular/agents/searchWriterAgent.ts`

**Added Detailed Logging**:

#### Before Fetch
```typescript
console.log('🔍 [WRITER] Initiating fetch to Supabase Edge Function...', {
  url: supabaseEdgeUrl,
  hasAuth: !!supabaseAnonKey,
  timeout: '30s'
});
```

#### After Fetch
```typescript
console.log('🔍 [WRITER] Fetch completed, response received:', {
  ok: response.ok,
  status: response.status,
  statusText: response.statusText
});
```

#### After JSON Parse
```typescript
console.log('🔍 [WRITER] Response parsed successfully:', {
  hasText: !!data.text,
  textLength: data.text?.length || 0
});
```

#### Enhanced Error Messages
```typescript
// Timeout
console.error('❌ [WRITER] Fetch timeout - aborting request');

// Network Error
console.error('❌ [WRITER] Network error:', error.message);

// API Error
console.error('❌ [WRITER] OpenAI API error:', {
  status: response.status,
  errorPreview: errorText.substring(0, 200)
});

// Generic Error
console.error('❌ [WRITER] OpenAI call failed:', errorMessage);
```

## What to Look For in Console

### Successful Flow
```
🔍 [WRITER] Sending to OpenAI: {...}
🔍 [WRITER] Initiating fetch to Supabase Edge Function...
🔍 [WRITER] Fetch completed, response received: {ok: true, status: 200}
🔍 [WRITER] Response parsed successfully: {hasText: true, textLength: 1234}
🔍 [WRITER] OpenAI returned: {textType: 'string', ...}
```

### Timeout Scenario (30s)
```
🔍 [WRITER] Sending to OpenAI: {...}
🔍 [WRITER] Initiating fetch to Supabase Edge Function...
(30 seconds pass...)
❌ [WRITER] Fetch timeout - aborting request
❌ [WRITER] Request aborted due to timeout
```

### Network Error
```
🔍 [WRITER] Sending to OpenAI: {...}
🔍 [WRITER] Initiating fetch to Supabase Edge Function...
❌ [WRITER] Network error: Failed to fetch
```

### API Error (e.g., 401, 500)
```
🔍 [WRITER] Sending to OpenAI: {...}
🔍 [WRITER] Initiating fetch to Supabase Edge Function...
🔍 [WRITER] Fetch completed, response received: {ok: false, status: 500}
❌ [WRITER] OpenAI API error: {status: 500, errorPreview: '...'}
```

## Debugging Steps

### If Request Hangs
1. Check console for: `🔍 [WRITER] Initiating fetch...`
2. If you see it but no follow-up:
   - Network tab in DevTools - check if request is pending
   - Check if Supabase Edge Function URL is correct
   - Verify VITE_OPENAI_API_URL environment variable

### If Timeout Occurs
1. Look for: `❌ [WRITER] Fetch timeout - aborting request`
2. Possible causes:
   - Supabase edge function is slow/unresponsive
   - OpenAI API is slow
   - Network latency
3. Solutions:
   - Increase timeout from 30s to 45s
   - Check Supabase function logs
   - Test edge function directly

### If Network Error
1. Look for: `❌ [WRITER] Network error:`
2. Possible causes:
   - CORS issue
   - Invalid Supabase URL
   - Firewall/proxy blocking
3. Solutions:
   - Check VITE_OPENAI_API_URL in .env
   - Verify Supabase project is active
   - Check browser console for CORS errors

### If API Error
1. Look for: `❌ [WRITER] OpenAI API error:`
2. Check the status code:
   - 401: Invalid/missing auth
   - 429: Rate limit exceeded
   - 500: OpenAI service error
3. Solutions:
   - Check OPENAI_API_KEY in Supabase secrets
   - Verify API key has credits
   - Check OpenAI status page

## Model Clarification

**Current Model**: `gpt-4o` (Correct)
- For text searches: `gpt-4o`
- For image searches: `gpt-4o-mini`

This is the **intended** model. `gpt-4o` is:
- OpenAI's latest optimized model
- Faster than gpt-4
- More cost-effective
- Better at following JSON format

**Model Selection Logic** (Line 254):
```typescript
const model = isReverseImageSearch ? this.imageSearchModel : this.defaultModel;
// isReverseImageSearch = false → uses gpt-4o
// isReverseImageSearch = true → uses gpt-4o-mini
```

## Environment Variables Check

Make sure these are set:

### In `.env`
```bash
VITE_OPENAI_API_URL=https://your-project.supabase.co/functions/v1/fetch-openai
VITE_SUPABASE_ANON_KEY=eyJ...
```

### In Supabase Secrets (Edge Function)
```bash
OPENAI_API_KEY=sk-...
```

## Testing Plan

### Test 1: Simple Query
```
Query: "test"
Expected: Should complete in < 15 seconds
Watch for: All 🔍 [WRITER] logs in sequence
```

### Test 2: Complex Query
```
Query: "explain quantum computing in detail"
Expected: May take 20-30 seconds
Watch for: Timeout handling if > 30s
```

### Test 3: Check Environment
```javascript
// Run in browser console
console.log('VITE_OPENAI_API_URL:', import.meta.env.VITE_OPENAI_API_URL);
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Missing');
```

## Next Steps

1. **Test the search now** with the enhanced logging
2. **Check console** for the new debug messages
3. **Share the full console output** if issue persists
4. **Check Network tab** - look for the fetch-openai request

The enhanced logging will help us pinpoint exactly where the request is failing or hanging.

## Summary of Changes

- ✅ Tab renamed to "Overview"
- ✅ Added pre-fetch logging
- ✅ Added post-fetch logging
- ✅ Added response parse logging
- ✅ Enhanced error messages
- ✅ Added network error detection
- ✅ Added timeout error detection
- ✅ Clarified model usage (gpt-4o is correct)

Now when you run a search, you'll see exactly what's happening at each step of the OpenAI call!
