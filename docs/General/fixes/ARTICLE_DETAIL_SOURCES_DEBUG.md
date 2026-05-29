# Article Detail - Quick Links Sources Debugging

## Issue
Quick Links cards don't appear on the Article Detail page even though the article content streams correctly.

**Status**: 🔍 Under investigation
**Date**: 2026-05-26

## Expected Behavior
After the article title and metadata, there should be 4 Quick Links cards showing Tavily search results:
```
┌────┐ ┌────┐ ┌────┐ ┌────┐
│Src1│ │Src2│ │Src3│ │Src4│
└────┘ └────┘ └────┘ └────┘
```

## Current Behavior
- Article content streams correctly ✅
- Quick Links section doesn't appear ❌

## Debug Steps

### 1. Check Console Logs
When the page loads, you should see:
```
=== ARTICLE GENERATION START ===
Title: {article title}
[ARTICLE SERVICE] Step 1: Fetching Tavily context
[ARTICLE SERVICE] Step 2: Tavily complete (resultCount: X)
[ARTICLE SERVICE] Step 3: Calling OpenAI with context
[ARTICLE SERVICE] Step 4: Streaming complete
=== SOURCES RECEIVED === [array of sources]
Sources count: X
=== GENERATION COMPLETE ===
```

**If you DON'T see "SOURCES RECEIVED":**
- The `generateArticleContentStreaming()` function is not returning sources
- Check for errors before the return statement

### 2. Check Network Tab
Look for these requests:
1. **Tavily API**: `POST https://api.tavily.com/search`
   - Should return 200 with results array
   - Check if rate limited (429)
2. **OpenAI Edge Function**: `POST {VITE_OPENAI_API_URL}`
   - Should return 200 with streaming response

### 3. Check React DevTools
1. Open React DevTools
2. Find `ArticleDetail` component
3. Check state:
   - `sources` should be an array with length > 0
   - Each source should have: `title`, `url`, `snippet`, `domain`

### 4. Check articleService.ts Return Value
In `src/services/explore/articleService.ts`, line ~140:
```typescript
return sources; // This should return ArticleSource[]
```

Add logging before return:
```typescript
console.log('[DEBUG] About to return sources:', sources);
return sources;
```

### 5. Check Component State Update
In `src/mainPages/ArticleDetail.tsx`, line ~134:
```typescript
setSources(sources);
```

Add logging:
```typescript
console.log('[DEBUG] Setting sources state:', sources);
setSources(sources);
console.log('[DEBUG] Sources state should update now');
```

## Common Issues & Fixes

### Issue 1: Tavily Rate Limit
**Symptoms**:
- Console shows "Rate limit exceeded"
- Network tab shows 429 response

**Fix**:
- Wait a few minutes
- Check Tavily dashboard for usage limits
- Consider caching Tavily results

### Issue 2: Sources Not Mapped Correctly
**Symptoms**:
- Console shows sources but they're empty or malformed
- Sources array exists but missing required fields

**Fix**:
Check mapping in `articleService.ts`:
```typescript
const sources: ArticleSource[] = results.map(result => ({
  title: result.title,        // Must exist
  url: result.url,            // Must exist
  snippet: result.content,    // Must exist
  domain: extractDomain(result.url) // Must not be empty
}));
```

### Issue 3: Component Re-renders Clearing State
**Symptoms**:
- Sources appear briefly then disappear
- Console shows sources set but UI doesn't update

**Fix**:
Check useEffect dependencies:
```typescript
}, [article?.title]); // Should only depend on article title
```

Make sure there's no other useEffect clearing sources.

### Issue 4: Conditional Rendering Issue
**Symptoms**:
- Sources state is populated in DevTools
- UI doesn't show Quick Links

**Fix**:
Check rendering condition in `ArticleDetail.tsx`:
```typescript
{sources.length > 0 && (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
    {sources.slice(0, 4).map((source, index) => (
      // Card rendering
    ))}
  </div>
)}
```

Temporarily remove condition to see if cards appear:
```typescript
{/* Always show for debugging */}
<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
  {sources.slice(0, 4).map((source, index) => (
    // Card rendering
  ))}
</div>
<div>Sources length: {sources.length}</div>
```

## Verification Checklist

- [ ] Console shows "SOURCES RECEIVED" with array
- [ ] Console shows "Sources count: X" where X > 0
- [ ] Network tab shows Tavily 200 response
- [ ] Network tab shows OpenAI streaming response
- [ ] React DevTools shows `sources` state populated
- [ ] No errors in console
- [ ] No 429 rate limit errors
- [ ] `generateArticleContentStreaming` returns sources
- [ ] `setSources()` is called after streaming
- [ ] Component doesn't unmount during streaming

## Code References

**Files to check**:
1. [articleService.ts:40-146](../../src/services/explore/articleService.ts#L40-L146) - Service that fetches Tavily and streams OpenAI
2. [ArticleDetail.tsx:86-151](../../src/mainPages/ArticleDetail.tsx#L86-L151) - useEffect that calls service
3. [ArticleDetail.tsx:290-353](../../src/mainPages/ArticleDetail.tsx#L290-L353) - Quick Links rendering

## Related Documentation
- [Article Detail Workflow](../architecture/EXPLORE_ARTICLE_DETAIL_WORKFLOW.md)
- [Tavily Integration Guide](../../guides/TAVILY_GUIDE.md)
