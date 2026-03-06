# Writer Agent Timeout Fix

## Date: October 2, 2025

## Problem: Application Freezing on "Generating comprehensive answer"

### Symptoms
- ✅ Brave Search completes successfully (200)
- ✅ fetch-openai returns successfully (200)  
- ❌ Application freezes at "Generating comprehensive answer..."
- ❌ Error: "Failed to load data"
- ❌ No images, videos, sources, or news displayed

### Root Cause
The Writer Agent's `callOpenAI()` method had **NO TIMEOUT** on the fetch call to the Supabase Edge Function. If the OpenAI API call hangs or takes too long, the entire application freezes waiting for a response that never completes within a reasonable time.

---

## Solution: Added 30-Second Timeout with AbortController

### Code Changes in `searchWriterAgent.ts`

#### Before (No Timeout) ❌
```typescript
const response = await fetch(supabaseEdgeUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseAnonKey}`
  },
  body: JSON.stringify({
    prompt: JSON.stringify({
      messages,
      model,
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_output_tokens: 1200
    })
  })
});
```

#### After (30-Second Timeout) ✅
```typescript
// Create AbortController for timeout
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds

try {
  const response = await fetch(supabaseEdgeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`
    },
    body: JSON.stringify({
      prompt: JSON.stringify({
        messages,
        model,
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_output_tokens: 1200
      })
    }),
    signal: controller.signal  // ← Add abort signal
  });
  
  clearTimeout(timeoutId);  // ← Clear timeout on success
  
  // ... rest of response handling ...
  
} catch (error: unknown) {
  clearTimeout(timeoutId);  // ← Clear timeout on error
  
  // Handle timeout specifically
  if (error instanceof Error && error.name === 'AbortError') {
    logger.error('OpenAI call timeout after 30 seconds');
    throw new Error('OpenAI request timeout - please try again');
  }
  
  // Handle other errors
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error('OpenAI call failed', { error: errorMessage });
  throw error;
}
```

---

## Why 30 Seconds?

- **OpenAI GPT-4o** typically responds in 5-15 seconds for article generation
- **30 seconds** provides comfortable buffer for slower responses
- **Better UX**: User gets error message instead of infinite freeze
- **Matches industry standards**: Most API clients use 30-60 second timeouts

---

## Flow Changes

### Before Fix
```
User searches → Brave gets results → Writer calls OpenAI → [FREEZES FOREVER] 😱
```

### After Fix
```
User searches → Brave gets results → Writer calls OpenAI 
  ↓
  Success (< 30s): Return article ✅
  ↓
  Timeout (> 30s): Show error, return fallback ✅
```

---

## Additional Debug Logging Added

### In `searchService.ts`

Added comprehensive logging to track data flow:

```typescript
// 1. Before formatting
console.log('🔍 [DEBUG] Retriever data before formatting:', {
  hasSearchResponse: !!searchResponse,
  hasData: !!searchResponse.data,
  resultsCount: searchResponse.data?.results?.length || 0,
  imagesCount: searchResponse.data?.images?.length || 0,
  videosCount: searchResponse.data?.videos?.length || 0,
  firstImageUrl: searchResponse.data?.images?.[0]?.url || 'NO IMAGES',
  firstVideoTitle: searchResponse.data?.videos?.[0]?.title || 'NO VIDEOS'
});

// 2. After image validation
console.log('🔍 [DEBUG] After image validation:', {
  originalCount: searchResponse.data?.images?.length || 0,
  validatedCount: validatedImages.length,
  firstValidImage: validatedImages[0]?.url || 'NO VALID IMAGES'
});

// 3. Final response
console.log('🔍 [DEBUG] Final response being returned:', {
  hasAnswer: !!response.answer,
  answerLength: response.answer?.length || 0,
  sources: response.sources.length,
  images: response.images.length,
  videos: response.videos.length,
  citations: response.citations?.length || 0,
  firstSource: response.sources[0]?.title || 'NO SOURCES',
  firstImage: response.images[0]?.url || 'NO IMAGES',
  firstVideo: response.videos[0]?.title || 'NO VIDEOS',
  firstCitation: response.citations?.[0]?.title || 'NO CITATIONS'
});
```

---

## Testing Checklist

### Basic Flow Test ✅
- [ ] Search for "cats"
- [ ] Verify Brave Search completes (< 3 seconds)
- [ ] Verify Writer generates article (< 15 seconds)
- [ ] Verify no freezing
- [ ] Check console for debug logs

### Data Display Test 📊
- [ ] **Overview tab**: Shows article text ✅
- [ ] **Sources tab**: Shows web results with snippets
- [ ] **Images tab**: Shows image grid (not placeholders)
- [ ] **Videos tab**: Shows video cards
- [ ] **News tab**: Shows news articles
- [ ] **Citations**: Shows proper citations in overview

### Timeout Test ⏱️
- [ ] Simulate slow OpenAI (if possible)
- [ ] Verify timeout after 30 seconds
- [ ] Verify error message shown
- [ ] Verify fallback content displayed
- [ ] Verify app doesn't freeze

### Console Logs Test 🔍
Look for these logs in browser console:

```
✅ "Brave Search Tool completed"
✅ "WriterAgent: Calling OpenAI" 
✅ "Successfully received content from Supabase Edge Function"
✅ "🚨🚨🚨 FORMATTING RESPONSE NOW"
✅ "🔍 [DEBUG] Retriever data before formatting"
✅ "🔍 [DEBUG] After image validation"
✅ "🔍 [DEBUG] Final response being returned"
```

### Error Handling Test ❌
- [ ] Search with no results (e.g., "asdfghjklqwerty")
- [ ] Verify fallback content shown
- [ ] Verify no app crash
- [ ] Verify can search again

---

## Files Modified

1. **`src/services/search/regular/agents/searchWriterAgent.ts`**
   - Added: AbortController with 30-second timeout
   - Added: Specific timeout error handling
   - Added: clearTimeout in all code paths

2. **`src/services/search/searchService.ts`**
   - Added: 🚨 error log before formatting (for visibility)
   - Added: Comprehensive debug logging for data flow
   - Added: Image validation logging
   - Added: Final response logging

---

## Architecture Consistency

### Swarm Principles Maintained ✅
- **Lightweight**: Timeout adds minimal code (<20 lines)
- **Stateless**: No shared state, just request-scoped controller
- **Simple**: Clear error handling, no complex retry logic

### Pattern Consistency ✅
- **Matches Brave Search Tool**: Both use AbortController + timeout
- **Matches Test Page**: Same fetch pattern with timeout
- **Standard Practice**: Industry-standard timeout implementation

---

## Next Steps

1. **Test the fix**: Run search, verify no freezing
2. **Check console logs**: Verify debug logs appear
3. **Verify data display**: Check all tabs show correct content
4. **Monitor performance**: Ensure timeout isn't too aggressive

If issues persist:
- Check if images/videos are in retriever response
- Verify response mapping in searchService
- Check UI components receiving props correctly

---

## Success Criteria

✅ No application freezing  
✅ Timeout after 30 seconds (if OpenAI hangs)  
✅ Clear error messages to user  
✅ Fallback content on timeout  
✅ All data displayed in UI (overview, sources, images, videos, news)  
✅ Debug logs visible in console  

---

## Related Documents

- `docs/architecture/SWARM_REFACTORING_SUMMARY.md` - Overall swarm refactoring
- `docs/architecture/SEARCH_TOOLS_REFACTORING.md` - Tool-based architecture
- `docs/architecture/REGULAR_SEARCH_TEST_CHECKLIST.md` - Testing guide
