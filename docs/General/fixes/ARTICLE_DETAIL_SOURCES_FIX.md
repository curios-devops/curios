# Article Detail - Quick Links Sources Fix

## Problem
Quick Links cards weren't appearing on the Article Detail page even though Tavily search was working and returning results.

**Status**: ✅ Fixed
**Date**: 2026-05-26

## Root Cause
Sources were being returned at the END of the streaming process instead of being available BEFORE streaming starts. This caused the Quick Links section to not render until streaming completed.

## Solution: Copy Fast-Search Callback Pattern

### The Fast-Search Pattern
Fast-search uses a **callback pattern** where sources are sent to the UI immediately via `onSourcesFound()` callback BEFORE the LLM streaming starts.

**File**: `src/services/fast-search/controller.ts:246-252`
```typescript
// Notify that sources have been found (BEFORE streaming)
if (onSourcesFound && webResults.length > 0) {
  onSourcesFound(webResults.map(r => ({
    title: r.title,
    url: r.url,
    snippet: r.snippet
  })));
}
```

### Our Implementation
We copied this exact pattern to `articleService.ts`:

**File**: `src/services/explore/articleService.ts:57-60`
```typescript
// Notify that sources are ready (BEFORE streaming starts - like fast-search)
if (onSourcesFound && sources.length > 0) {
  logger.info('[ARTICLE SERVICE] Calling onSourcesFound callback', { count: sources.length });
  onSourcesFound(sources);
}
```

### Component Update
Updated `ArticleDetail.tsx` to use the callback:

**File**: `src/mainPages/ArticleDetail.tsx:125-131`
```typescript
const returnedSources = await generateArticleContentStreaming(
  article.title,
  article.snippet,
  article.link,
  (chunk: string) => {
    // Streaming callback
    content += chunk;
    if (content.length % 150 < chunk.length) {
      setStreamingContent(content);
    }
  },
  (sources: ArticleSource[]) => {
    // Sources callback - fired BEFORE streaming starts
    if (!isMounted) return;
    console.log('=== SOURCES CALLBACK FIRED ===', sources);
    setSources(sources); // Immediate UI update
  }
);
```

## Key Changes

### 1. Added callback parameter to service
```typescript
export async function generateArticleContentStreaming(
  title: string,
  snippet: string,
  originalUrl: string,
  onChunk: (chunk: string) => void,
  onSourcesFound?: (sources: ArticleSource[]) => void // NEW callback
): Promise<ArticleSource[]>
```

### 2. Call callback BEFORE streaming
```typescript
// Step 1: Get Tavily results
const { results } = await searchWithTavily(title);

// Step 2: Build sources
const sources: ArticleSource[] = results.map(...);

// Step 3: Notify UI immediately (BEFORE OpenAI streaming)
if (onSourcesFound && sources.length > 0) {
  onSourcesFound(sources);
}

// Step 4: Start OpenAI streaming
const response = await fetch(openAIUrl, ...);
```

### 3. Update component to use callback
```typescript
// Component uses callback to set sources immediately
(sources: ArticleSource[]) => {
  if (!isMounted) return;
  setSources(sources); // Quick Links appear now!
}
```

## Benefits

✅ **Immediate UI Update**: Quick Links appear as soon as Tavily returns (before streaming)
✅ **No Complex State**: Simple callback pattern, no state management issues
✅ **Proven Pattern**: Copied from working fast-search implementation
✅ **Separation of Concerns**: Sources and streaming content are independent

## Timeline

### Before (Broken):
```
Page loads
  ↓
Fetch Tavily results (invisible)
  ↓
Stream OpenAI content (visible)
  ↓
Return sources at end
  ↓
Quick Links appear (too late!)
```

### After (Fixed):
```
Page loads
  ↓
Fetch Tavily results
  ↓
Quick Links appear immediately! ✅
  ↓
Stream OpenAI content (in parallel)
  ↓
Article complete
```

## Testing

### How to Verify Fix Works:

1. **Navigate to article**:
   ```
   http://localhost:5173/explore/Why%20Marvell%20Technology%20Stock%20Just%20Popped
   ```

2. **Check console**:
   ```
   === ARTICLE GENERATION START ===
   [ARTICLE SERVICE] Step 1: Fetching Tavily context
   [ARTICLE SERVICE] Step 2: Tavily complete (resultCount: 10)
   [ARTICLE SERVICE] Calling onSourcesFound callback  <-- NEW
   === SOURCES CALLBACK FIRED === [...]               <-- NEW
   Sources count: 10                                   <-- NEW
   [ARTICLE SERVICE] Step 3: Calling OpenAI with context
   [ARTICLE SERVICE] Step 4: Streaming complete
   === GENERATION COMPLETE ===
   ```

3. **Visual check**:
   - Quick Links cards appear BEFORE streaming starts ✅
   - 4 cards in a grid layout ✅
   - Each card has favicon, domain, and title ✅

### Expected Behavior:
- Quick Links render immediately (< 1 second after page load)
- Streaming content appears shortly after
- No flash of missing content
- No state errors in console

## Code References

**Files modified**:
1. [articleService.ts](../../src/services/explore/articleService.ts#L33-L60) - Added callback parameter and call
2. [ArticleDetail.tsx](../../src/mainPages/ArticleDetail.tsx#L105-L132) - Use callback to set sources

**Pattern source**:
- [fast-search/controller.ts](../../src/services/fast-search/controller.ts#L215-L252) - Original pattern

## Related Documentation
- [Article Detail Workflow](../architecture/EXPLORE_ARTICLE_DETAIL_WORKFLOW.md) - Full architecture
- [Sources Debug Guide](./ARTICLE_DETAIL_SOURCES_DEBUG.md) - Debugging steps
- [Fast-Search Architecture](../../Search/architecture/FAST_SEARCH_REFACTOR_COMPLETE.md) - Pattern source
