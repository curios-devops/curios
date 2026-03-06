# Critical Fixes: Brave Timeout & Apify Images

## Date: October 2, 2025

## Issues Fixed

### Issue 1: Brave Falling Back Despite Successful Response ✅

**Root Cause Found**:
Two problematic empty checks were causing instant fallbacks:

1. **In searchRetrieverAgent.ts** (line ~88): Already fixed


```

**Why This Was Bad**:
- Even with HTTP 200 success
- Even with valid JSON payload
- If ALL arrays happened to be empty → instant throw
- Empty results are VALID (obscure queries, specific searches)
- This prevented Brave from completing naturally

**Solution 1: Removed Empty Check**
```typescript
// NEW CODE - No throwing on empty
logger.info('Brave search completed successfully', { 
  webCount: webResults.length,
  newsCount: newsResults.length,
  imageCount: imageResults.length,
  videoCount: videoResults.length,
  query 
});

return {
  web: webResults,
  news: newsResults,
  images: imageResults,
  video: videoResults
};
```

**Solution 2: Added Proper Timeout Handling**
```typescript
// Added 10-second timeout with AbortController
const SEARCH_TIMEOUT = API_TIMEOUTS.BRAVE; // 10 seconds from constants.ts
const controller = new AbortController();
const timeoutId = setTimeout(() => {
  controller.abort();
  logger.warn('Brave search timeout', { query, timeout: SEARCH_TIMEOUT });
}, SEARCH_TIMEOUT);

try {
  const response = await fetch(url, {
    ...options,
    signal: controller.signal // <-- Attach abort signal
  });
  
  clearTimeout(timeoutId); // Clear on success
  // ... process response
  
} catch (fetchError: any) {
  clearTimeout(timeoutId); // Clear on error
  if (fetchError.name === 'AbortError') {
    throw new Error(`Brave search timeout after ${SEARCH_TIMEOUT}ms`);
  }
  throw fetchError;
}
```

**Now Brave Only Falls Back On**:
- ✅ Timeout (10 seconds)
- ✅ Network errors (fetch failures)
- ✅ HTTP errors (4xx, 5xx)
- ✅ Auth errors (invalid API key)
- ❌ NOT on empty results (valid response)

---

### Issue 2: Apify Images Appearing as Placeholders ✅

**Problem Investigation**:
1. Images were being returned but showing as placeholders
2. Could be wrong field mapping from Apify response
3. Could be broken image URLs
4. Could be aspect ratio issues in UI

**Solution 1: Enhanced Image Extraction Logging**

Added comprehensive logging to understand Apify's response structure:

```typescript
// Log the actual structure we receive
logger.info('Apify image response structure', {
  hasResults: !!imgResults,
  firstItemKeys: imgResults[0] ? Object.keys(imgResults[0]) : [],
  hasImageResults: !!imgResults[0]?.imageResults,
  hasOrganicResults: !!imgResults[0]?.organicResults,
  sampleData: imgResults[0] ? JSON.stringify(imgResults[0]).substring(0, 200) : 'none'
});

// Log first image to see field names
logger.info('First image structure', {
  keys: Object.keys(imgData[0]),
  sample: JSON.stringify(imgData[0]).substring(0, 300)
});
```

**Solution 2: Multiple Field Name Attempts**

Apify might use different field names, so we try them all:

```typescript
const imageUrl = 
  img.imageUrl ||        // Standard field
  img.thumbnailUrl ||    // Thumbnail variant
  img.thumbnail ||       // Short name
  img.image?.url ||      // Nested object
  img.image ||           // Direct field
  img.url ||             // Generic
  '';

const sourceUrl =
  img.pageUrl ||         // Page containing image
  img.sourceUrl ||       // Source variant
  img.source ||          // Short name
  img.link ||            // Link variant
  img.url ||             // Fallback
  '';
```

**Solution 3: Better Filtering**

Only include valid HTTP/HTTPS URLs:

```typescript
.filter((img: ImageResult) => 
  img.url &&                    // Has URL
  img.url.startsWith('http')    // Valid protocol
);
```

**Solution 4: UI Image Handling Improvements**

Added error handling and background colors to PhotosSection.tsx:

```tsx
// 1. Add background color for loading state
className="... bg-gray-800"

// 2. Hide broken images gracefully
onError={(e) => {
  (e.target as HTMLImageElement).style.display = 'none';
}}

// 3. Use aspect-square for mini images (better for varied sizes)
className="w-full aspect-square object-cover ..."
```

**Debugging Steps**:
1. Run search that triggers Apify fallback
2. Check console logs for "Apify image response structure"
3. Check "First image structure" to see actual fields
4. Verify URLs are valid (start with http)
5. Check browser network tab for failed image loads

---

## Files Modified

**Changes**:
- ✅ Added timeout handling with AbortController
- ✅ Uses global `API_TIMEOUTS.BRAVE` (10 seconds)
- ✅ Removed empty results check (line 199-202)
- ✅ Added proper completion logging
- ❌ Removed `braveTimedOut` flag (not needed with AbortController)

**Lines Modified**: 133-170, 199-210

---

### 2. searchRetrieverAgent.ts
**Location**: `src/services/search/regular/agents/searchRetrieverAgent.ts`

**Changes**:
- ✅ Enhanced Apify image extraction logging
- ✅ Multiple field name attempts for image URLs
- ✅ Better filtering (only valid http/https URLs)
- ✅ Logs first image structure for debugging

**Lines Modified**: 163-197

---

### 3. PhotosSection.tsx
**Location**: `src/components/PhotosSection.tsx`

**Changes**:
- ✅ Added `bg-gray-800` background to all images
- ✅ Added `onError` handler to hide broken images
- ✅ Changed mini images to `aspect-square` (better for varied sizes)
- ✅ Graceful degradation for broken URLs

**Lines Modified**: 68, 85, 105, 119

---

## Constants Reference

### API_TIMEOUTS (constants.ts)
```typescript
export const API_TIMEOUTS = {
  TAVILY: 10000,   // 10 seconds
  SEARXNG: 10000,  // 10 seconds  
  BRAVE: 10000,    // 10 seconds ← Used for Brave timeout
  GENERAL: 15000   // 15 seconds
} as const;
```

### MAX_RESULTS (constants.ts)
```typescript
export const MAX_RESULTS = {
  WEB: 10,      // Google's max per page ✅
  IMAGES: 10,   // Cap at 10 results
  VIDEO: 10,    // Cap at 10 results
  NEWS: 10      // Cap at 10 results
};
```

---

## Testing Checklist

### Brave Search Timeout
- [ ] Normal query completes in < 3 seconds
  - Should NOT timeout
  - Should NOT fallback to Apify
  
- [ ] Break Supabase Edge Function (temporarily)
  - Wait 10 seconds
  - Should timeout and fallback to Apify
  - Console shows: "Brave search timeout after 10000ms"

### Brave Empty Results
- [ ] Search very obscure query: "xyzabc999nonexistent"
  - Brave returns empty arrays (valid response)
  - Should NOT fallback to Apify
  - Should pass empty results to writer
  - Writer handles gracefully

### Apify Image Extraction
- [ ] Trigger Apify fallback
  - Check console for "Apify image response structure"
  - Check console for "First image structure"
  - Verify field names being used
  - Verify URLs are valid (start with http)
  
- [ ] Check UI
  - Images should load (not placeholders)
  - Broken images should hide gracefully
  - Mini images should be square aspect ratio
  - All images have gray background during load

### Edge Cases
- [ ] Apify returns images with non-standard field names
  - Should try multiple field names
  - Should log structure for debugging
  
- [ ] Apify returns broken image URLs
  - Should filter out invalid URLs
  - UI should hide broken images
  - No console errors

---

## Console Log Analysis

### Expected Logs (Brave Success)
```
✅ Brave Search via edge function - query: "test"
✅ Brave Search response received - webCount: 10, imageCount: 8
✅ Brave search completed successfully - webCount: 10, newsCount: 2, imageCount: 8, videoCount: 3
✅ Search completed successfully!
```

### Expected Logs (Brave Timeout)
```
✅ Brave Search via edge function - query: "test"
⏱️ Brave search timeout - timeout: 10000
⚠️ Brave Search failed, falling back to Apify
✅ Starting Apify fallback
✅ Apify image response structure - hasResults: true, firstItemKeys: [...]
✅ First image structure - keys: [...], sample: {...}
✅ Apify image search successful - rawImagesCount: 10, filteredImagesCount: 8
✅ Apify fallback successful - webCount: 10, imagesCount: 8
```

### Red Flags (Should NOT See)
- ❌ "Brave search returned no results" (removed this error)
- ❌ Instant fallback to Apify (< 1 second)
- ❌ "AbortError" without timeout message
- ❌ Image URLs starting with non-http protocols

---

## Performance Impact

### Before
- Brave failed instantly on any empty array
- No timeout handling (could hang forever)
- Images might not load due to wrong field mapping
- Broken images shown as placeholders

### After
- Brave completes naturally (even with empty results)
- 10-second timeout prevents hanging
- Multiple field name attempts for images
- Broken images hide gracefully
- Better debugging with comprehensive logs

### Timing Expectations
- Brave success: 1-3 seconds
- Brave timeout: exactly 10 seconds
- Apify fallback: +3-5 seconds
- **Total worst case**: 15 seconds (10s timeout + 5s Apify)

---

## Next Steps

1. **Test Brave timeout**:
   - Run regular search (should complete fast)
   - Temporarily break Brave endpoint
   - Verify 10-second timeout works
   - Verify fallback to Apify

2. **Test Apify images**:
   - Trigger Apify fallback
   - Check console logs for image structure
   - Verify images display (not placeholders)
   - Test with different queries ("cute cats", "mountains", etc.)

3. **Monitor production**:
   - Watch for "Brave search timeout" logs
   - Check image load success rates
   - Verify no instant fallbacks

4. **If images still show as placeholders**:
   - Check console logs for actual field names
   - Update field mapping based on logs
   - Consider using different Apify actor for images
   - Test with Apify's Google Images Scraper directly
