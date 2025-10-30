# Pro Search Freeze Debug Analysis

## Issue Description
App freezes when calling OpenAI and Brave Search in Pro Search workflow.

## Investigation Findings

### 1. OpenAI Call - No Critical Issues Found
**File**: `/src/services/search/regular/agents/searchWriterAgent.ts`

**Current Implementation**:
- ✅ Has 30-second timeout on fetch call
- ✅ Has 45-second timeout wrapper in SwarmController
- ✅ Has fallback response on error
- ✅ Uses abort controller for request cancellation
- ✅ Handles timeout errors explicitly

**Potential Issues**:
```typescript
// Line 62-79: Timeout is properly implemented
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

try {
  const response = await fetch(supabaseEdgeUrl, {
    // ... 
    signal: controller.signal
  });
  clearTimeout(timeoutId);
  // ... rest of logic
} catch (error: unknown) {
  clearTimeout(timeoutId);
  
  if (error instanceof Error && error.name === 'AbortError') {
    logger.error('OpenAI call timeout after 30 seconds');
    throw new Error('OpenAI request timeout - please try again');
  }
  // ...
}
```

**Status**: ✅ OpenAI call implementation is correct with proper timeout handling

### 2. Brave Search - Potential Freeze Issue
**File**: `/src/services/search/regular/agents/searchRetrieverAgent.ts`

**Current Implementation**:
- Line 98-101: No explicit timeout on `braveSearchTool()` call
- Line 71-89: Multiple search strategies but all depend on Brave

**Problem Areas**:
```typescript
// Line 98 - NO TIMEOUT!
onStatusUpdate?.('Searching with Brave Search...');
searchResults = await this.textOnlySearch(trimmedQuery, onStatusUpdate);

// Inside textOnlySearch (need to check):
const braveResults = await braveSearchTool(trimmedQuery); // ← POTENTIAL HANG
```

**Likely Cause of Freeze**:
1. `braveSearchTool()` may not have internal timeout
2. If Brave API is slow/unresponsive, it will hang indefinitely
3. No Promise.race() or timeout wrapper around Brave calls

### 3. Comparison with Backup File
**File**: `/src/services/search/regular/agents/searchRetrieverAgent.backup.ts`

The backup file shows the same issue:
```typescript
// Line 67 - Also NO TIMEOUT in backup
const braveResults: BraveSearchResults = await braveSearchTool(trimmedQuery);
```

## Root Cause Analysis

### Primary Issue: Brave Search Tool Lacks Timeout
The freeze likely occurs when:
1. User initiates Pro Search
2. SwarmController calls RetrieverAgent
3. RetrieverAgent calls `braveSearchTool()`
4. Brave API is slow/unresponsive
5. **No timeout means infinite wait** → UI freezes

### Secondary Issue: No Fallback for Brave Timeout
Unlike OpenAI which has:
- 30s fetch timeout
- 45s outer timeout
- Fallback response

Brave search has:
- ❌ No timeout wrapper
- ❌ No immediate fallback
- ❌ No retry logic

## Proposed Fixes

### Fix 1: Add Timeout Wrapper to Brave Search Calls (Immediate)

**Location**: `searchRetrieverAgent.ts` - textOnlySearch method

```typescript
// Add timeout wrapper for Brave search
async textOnlySearch(
  query: string,
  onStatusUpdate?: (status: string) => void
): Promise<{ web: SearchResult[]; images: ImageResult[]; videos: VideoResult[] }> {
  try {
    onStatusUpdate?.('Searching with Brave Search...');
    
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => {
        logger.error('Brave search timeout after 20 seconds');
        reject(new Error('Brave search timeout'));
      }, 20000) // 20 seconds - shorter than OpenAI
    );
    
    // Race between Brave call and timeout
    const braveResults = await Promise.race([
      braveSearchTool(query),
      timeoutPromise
    ]);
    
    return {
      web: [...braveResults.web, ...(braveResults.news || [])],
      images: braveResults.images || [],
      videos: braveResults.videos || []
    };
    
  } catch (error) {
    logger.error('Brave search failed, using fallback', { error });
    
    // Fallback to Apify
    onStatusUpdate?.('Trying alternative search...');
    return this.fallbackToApify(query);
  }
}
```

### Fix 2: Add Timeout to Image Search Calls

**Location**: `searchRetrieverAgent.ts` - imageOnlySearch method

```typescript
async imageOnlySearch(
  imageUrls: string[],
  query?: string
): Promise<{ web: SearchResult[]; images: ImageResult[]; videos: VideoResult[] }> {
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Image search timeout')), 25000)
    );
    
    const reverseResults = await Promise.race([
      bingReverseImageSearchTool(imageUrls[0], query),
      timeoutPromise
    ]);
    
    // ... rest of logic
  } catch (error) {
    logger.error('Image search failed', { error });
    // Return empty results instead of crashing
    return { web: [], images: [], videos: [] };
  }
}
```

### Fix 3: Add Global Search Timeout in SwarmController

**Location**: `swarmController.ts` - processQuery method

```typescript
// Already has WriterAgent timeout (45s), add RetrieverAgent timeout
const retrieverPromise = this.executeWithHealthCheck(
  () => this.retrieverAgent.execute(query, onStatusUpdate, [], isPro),
  'RetrieverAgent'
);

const retrieverTimeout = new Promise<never>((_, reject) =>
  setTimeout(() => {
    logger.error('RetrieverAgent timeout after 30 seconds');
    reject(new Error('Search timeout - please try again'));
  }, 30000)
);

const searchResponse = await Promise.race([
  retrieverPromise,
  retrieverTimeout
]) as AgentResponse<...>;
```

### Fix 4: Add Loading State Management

**Location**: `ProSearchResultsV2.tsx`

```typescript
// Add explicit timeout for entire search process
useEffect(() => {
  if (!query.trim()) return;
  
  const searchTimeout = setTimeout(() => {
    if (searchState.isLoading) {
      logger.error('Search UI timeout after 60 seconds');
      updateSearchState({
        isLoading: false,
        error: 'Search took too long - please try again with a simpler query',
        data: null
      });
    }
  }, 60000); // 60 seconds max for entire search
  
  executeSearch();
  
  return () => clearTimeout(searchTimeout);
}, [query]);
```

## Implementation Priority

### Phase 1: Critical (Implement Immediately)
1. ✅ Add timeout wrapper to `textOnlySearch()` Brave calls
2. ✅ Add timeout wrapper to `imageOnlySearch()` calls
3. ✅ Add fallback to Apify when Brave times out

### Phase 2: Safety (Implement Next)
4. ✅ Add global RetrieverAgent timeout in SwarmController
5. ✅ Add UI-level timeout in ProSearchResultsV2

### Phase 3: Monitoring (For Future)
6. Add metrics for Brave API response times
7. Add automatic fallback switching based on performance
8. Add user notification when using fallback search

## Testing Plan

### Test Case 1: Normal Flow
- Query: "artificial intelligence"
- Expected: Results in < 10 seconds
- Status updates should show progress

### Test Case 2: Brave Timeout
- Simulate slow Brave API (network throttling)
- Expected: Fallback to Apify after 20s
- UI should not freeze

### Test Case 3: Complete Failure
- Disable both Brave and Apify
- Expected: Error message after 30s
- UI returns to ready state

### Test Case 4: Image Search Timeout
- Upload image + query
- Simulate slow Bing reverse search
- Expected: Timeout after 25s, show error

## Next Steps

1. Implement Fix 1 (Brave timeout wrapper) - **HIGHEST PRIORITY**
2. Test with slow network conditions
3. Verify UI doesn't freeze
4. Implement remaining fixes
5. Add error telemetry

## Files to Modify

1. **`/src/services/search/regular/agents/searchRetrieverAgent.ts`**
   - Add timeout wrappers to all search calls
   - Add fallback logic

2. **`/src/services/search/pro/agents/swarmController.ts`**
   - Add RetrieverAgent timeout wrapper

3. **`/src/services/search/pro/pages/ProSearchResultsV2.tsx`**
   - Add UI-level timeout
   - Improve error handling

## Summary

**Root Cause**: Brave Search calls lack timeout wrappers, causing indefinite hangs.

**Solution**: Add Promise.race() timeout wrappers to all search tool calls.

**Impact**: Prevents UI freeze, provides better user experience, enables graceful fallback.

**Effort**: Low - all fixes are surgical changes to existing code.

**Risk**: Low - adds safety without changing core logic.
