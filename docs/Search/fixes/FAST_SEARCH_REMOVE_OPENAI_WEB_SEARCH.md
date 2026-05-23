# FastSearch - Remove OpenAI Web Search Tool

**Date**: 2026-05-17
**Status**: Complete ✓

## Problem

FastSearch was still trying to use OpenAI's `web_search` tool before falling back to Tavily, causing warning messages in the console:

```
WARN: WebSearchProvider: OpenAI returned no results, falling back to Tavily
```

This was expensive and unnecessary since we had already decided to use Tavily as the primary search engine.

## Solution

**File**: [webSearchProvider.ts](../../../src/services/fast-search/providers/webSearchProvider.ts)

Removed all OpenAI web search attempts and made Tavily the primary (and only) search engine.

### Changes Made

#### Before
```typescript
// Priority 1: Try OpenAI web search tool
logger.debug('WebSearchProvider: Attempting OpenAI web search', { query });
const openAIResults = await searchWithOpenAI(query);

if (openAIResults.length > 0) {
  logger.info('WebSearchProvider: OpenAI search successful');
  return openAIResults;
}

logger.warn('WebSearchProvider: OpenAI returned no results, falling back to Tavily');

// Priority 2: Fallback to Tavily
const tavilyResults = await searchWithTavilyFallback(query);
return tavilyResults;
```

#### After
```typescript
// Use Tavily as primary search engine
try {
  logger.debug('WebSearchProvider: Executing Tavily search', { query });
  const tavilyResults = await searchWithTavily(query);

  logger.info('WebSearchProvider: Tavily search completed', {
    resultCount: tavilyResults.length
  });
  return tavilyResults;
} catch (error) {
  logger.error('WebSearchProvider: Tavily search failed');
  // TODO: Add Brave fallback here if needed
  return [];
}
```

### Removed Functions

1. **`searchWithOpenAI()`** - Always returned empty array
2. **`parseOpenAISearchResults()`** - No longer needed
3. **`searchWithTavilyFallback()`** - Renamed to `searchWithTavily()`

### Updated Comments

- Changed file header from "Handles web search through OpenAI or Tavily" to "Handles web search through Tavily (primary) with Brave fallback"
- Updated function documentation to reflect Tavily-first approach
- Removed references to OpenAI Responses API and web_search tool

## Benefits

1. **No More Warnings**: Console is clean, no more OpenAI fallback warnings
2. **Cost Savings**: Not attempting expensive OpenAI web search calls
3. **Faster**: Direct Tavily search without trying OpenAI first
4. **Cleaner Code**: Removed unused OpenAI parsing logic
5. **Simpler Logic**: Single search path instead of fallback chain

## Search Flow

### Before
```
Query → Try OpenAI web_search (always fails)
     → Warning logged
     → Fallback to Tavily
     → Return results
```

### After
```
Query → Tavily search
     → Return results
```

## Future Enhancement

The code includes a TODO comment for adding Brave search as a fallback if Tavily fails:

```typescript
} catch (error) {
  logger.error('WebSearchProvider: Tavily search failed');
  // TODO: Add Brave fallback here if needed
  return [];
}
```

This can be implemented later if needed for redundancy.

## Testing

After this change, FastSearch should:
- ✅ Execute searches using only Tavily
- ✅ No OpenAI warnings in console
- ✅ Return search results successfully
- ✅ Pass results to LLM for answer generation

---

**Status**: OpenAI web search completely removed ✓
