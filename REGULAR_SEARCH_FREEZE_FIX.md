# Regular Search Freeze Fix - October 31, 2025

## Problem Identified
After completing a regular search, the application would freeze after working for a bit. Investigation revealed that regular search was **NOT** incorrectly calling pro search features, but instead had **memory leaks from uncleaned timeouts**.

## Root Cause
In `src/services/search/regular/agents/searchRetrieverAgent.ts`, there were two instances of `Promise.race()` with `setTimeout` that were **never being cleared**:

1. **Line ~194** - Image search timeout (25 seconds)
2. **Line ~255** - Brave text search timeout (20 seconds)

### The Bug Pattern
```typescript
// ❌ BEFORE (Memory Leak)
const timeoutPromise = new Promise<never>((_, reject) =>
  setTimeout(() => {  // This setTimeout is NEVER cleared!
    reject(new Error('Timeout'));
  }, 25000)
);

const result = await Promise.race([
  actualSearch(),
  timeoutPromise
]);
// When actualSearch() wins the race, the setTimeout keeps running forever!
```

### Why This Causes Freezing
When `Promise.race()` completes with the winner, the **losing promise's setTimeout continues to run in the background**. Over multiple searches, these orphaned timeouts accumulate, causing:
- Memory leaks
- JavaScript event loop pollution
- Application freezing/unresponsiveness
- Browser performance degradation

## Fixes Applied

### 1. Fixed Image Search Timeout Leak
**File:** `src/services/search/regular/agents/searchRetrieverAgent.ts` (imageOnlySearch method)

```typescript
// ✅ AFTER (Fixed)
let imageSearchTimeoutId: ReturnType<typeof setTimeout> | null = null;
const timeoutPromise = new Promise<never>((_, reject) => {
  imageSearchTimeoutId = setTimeout(() => {
    logger.error('Image search timeout after 25 seconds');
    reject(new Error('Image search timeout'));
  }, 25000);
});

const reverseResults = await Promise.race([
  bingReverseImageSearchTool(firstImageUrl, query),
  timeoutPromise
]);

// Clear the timeout if the search completed before timeout
if (imageSearchTimeoutId) {
  clearTimeout(imageSearchTimeoutId);
  imageSearchTimeoutId = null;
}
```

### 2. Fixed Text Search Timeout Leak
**File:** `src/services/search/regular/agents/searchRetrieverAgent.ts` (textOnlySearch method)

```typescript
// ✅ AFTER (Fixed)
let braveSearchTimeoutId: ReturnType<typeof setTimeout> | null = null;
const timeoutPromise = new Promise<never>((_, reject) => {
  braveSearchTimeoutId = setTimeout(() => {
    logger.error('Brave search timeout after 20 seconds');
    reject(new Error('Brave search timeout'));
  }, 20000);
});

const braveResults = await Promise.race([
  braveSearchTool(query),
  timeoutPromise
]);

// Clear the timeout if Brave completed before timeout
if (braveSearchTimeoutId) {
  clearTimeout(braveSearchTimeoutId);
  braveSearchTimeoutId = null;
}
```

### 3. Code Cleanup
**File:** `src/services/search/regular/pages/SearchResults.tsx`

Removed unnecessary `isPro: false` parameter since `performRegularSearch` doesn't accept it:

```typescript
// ✅ BEFORE
const searchPromise = performSearch(query, {
  isPro: false,  // ❌ Unnecessary - performRegularSearch doesn't use this
  imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
  onStatusUpdate: (status: string) => { ... }
});

// ✅ AFTER
const searchPromise = performSearch(query, {
  imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
  onStatusUpdate: (status: string) => { ... }
});
```

## Verification: No Pro Search Contamination

Confirmed that regular search flow is **completely isolated** from pro search:

✅ **No imports from pro search:**
```typescript
// regularSearchService.ts only imports:
import { SearchRetrieverAgent } from './agents/searchRetrieverAgent.ts';
import { SearchWriterAgent } from './agents/searchWriterAgent.ts';
// NO imports from '../pro/' anywhere!
```

✅ **Correct routing:**
```typescript
// searchRegularIndex.ts exports:
export { performRegularSearch as performSearch } from './regularSearchService.ts';
// This ensures SearchResults.tsx always calls regular search
```

✅ **No PerspectiveAgent calls:**
- Grep search confirmed zero matches for `PerspectiveAgent` in regular search files
- Only mentions are in comments describing what's NOT used

✅ **No SwarmController calls:**
- Regular search uses direct agent calls
- No orchestration layer

## Testing Recommendations

1. **Test Normal Text Search:**
   - Enter query: "artificial intelligence"
   - Verify search completes and UI remains responsive
   - Click through multiple related questions
   - Confirm no freezing after 30+ seconds

2. **Test Image Search:**
   - Upload an image
   - Verify reverse image search completes
   - Check that UI remains responsive after results load

3. **Test Combined Text + Image:**
   - Upload image AND enter text query
   - Verify enriched search works
   - Confirm no freezing

4. **Memory Leak Test:**
   - Perform 5-10 consecutive searches
   - Monitor browser memory usage (DevTools > Memory)
   - Confirm memory doesn't continuously grow
   - Verify no orphaned timers (DevTools > Performance)

## Expected Behavior After Fix

✅ Regular search completes normally
✅ UI remains responsive after search
✅ No freezing after 20-30 seconds
✅ Memory usage stable across multiple searches
✅ No orphaned setTimeout calls
✅ Clean event loop

## Files Modified

1. `src/services/search/regular/agents/searchRetrieverAgent.ts` - Fixed timeout leaks
2. `src/services/search/regular/pages/SearchResults.tsx` - Removed unnecessary parameter

## Files Verified (No Changes Needed)

1. `src/services/search/regular/regularSearchService.ts` - Clean, no pro imports
2. `src/services/search/regular/searchRegularIndex.ts` - Correct exports
3. `src/services/search/regular/agents/searchWriterAgent.ts` - No timeout issues

---

## Summary

The freeze was caused by **memory leaks from uncleaned timeouts in Promise.race()**, not from any calls to pro search functionality. Regular search flow is completely isolated and correct. The fixes ensure all timeouts are properly cleared, preventing memory leaks and application freezing.
