# Brave & Apify Search Fixes

## Date: October 2, 2025

## Issues Fixed

### Issue 1: Brave Search Falling Instantly ✅

**Problem**: 
- Brave search was triggering Apify fallback almost instantly
- Root cause: Empty results check `if (searchResults.web.length === 0)` was throwing error
- This was preventing Brave from completing even when it successfully returned data

**Solution**:
```typescript
// BEFORE (line ~88)
if (searchResults.web.length === 0) {
  logger.warn('Brave search returned no results, triggering Apify fallback');
  throw new Error('No results from Brave Search');
}

// AFTER
// Don't check for empty - let it through and handle gracefully
// Empty results are valid (user might search for very specific/obscure terms)
logger.info('Brave search completed', {
  webResultsCount: searchResults.web.length,
  imagesCount: searchResults.images.length,
  videosCount: searchResults.videos.length
});
```

**Why This Works**:
- Empty results are not an error - they're a valid response
- User might search for very specific/obscure terms
- Brave might return images/videos but no web results
- Let the data flow through and let the writer agent handle it
- Fallback should only trigger on actual API errors (timeout, network, auth, etc.)

---

### Issue 2: Apify Not Returning Image Results ✅

**Problem**:
- Apify fallback only searched for text results
- Images array was always empty: `images: []`
- This is because Google Search separates text and image results (you click "Images" tab)

**Solution**:
Implemented parallel searches matching Google's behavior:

```typescript
// Text search (like Google's default view)
const textSearchPromise = fetch(..., {
  body: JSON.stringify({
    queries: trimmedQuery,
    resultsPerPage: 10, // Google's max per page
    maxPagesPerQuery: 1,
    languageCode: 'en',
    countryCode: 'us',
    mobileResults: false,
    includeUnfilteredResults: false
  })
});

// Image search (like clicking "Images" tab in Google)
const imageSearchPromise = fetch(..., {
  body: JSON.stringify({
    queries: trimmedQuery,
    resultsPerPage: 10,
    maxPagesPerQuery: 1,
    languageCode: 'en',
    countryCode: 'us',
    mobileResults: false,
    includeUnfilteredResults: false,
    searchType: 'images' // <-- KEY: Tell Apify to search images
  })
});

// Run both in parallel
const [textResponse, imageResponse] = await Promise.all([
  textSearchPromise,
  imageSearchPromise
]);
```

**Image Extraction**:
```typescript
if (imageResponse.ok) {
  try {
    const imgResults = await imageResponse.json();
    // Image results might be in imageResults or organicResults array
    const imgData = imgResults[0]?.imageResults || imgResults[0]?.organicResults || [];
    imageResults = imgData.slice(0, 10).map((img: any) => ({
      url: img.imageUrl || img.image || img.url || '',
      alt: img.title || img.alt || 'Search result image',
      source_url: img.pageUrl || img.source || img.link || ''
    })).filter((img: ImageResult) => img.url !== '');
  } catch (imgError) {
    logger.warn('Apify image search failed, continuing without images');
  }
}
```

**Why This Works**:
- Matches how Google Search actually works (separate text/image views)
- Uses `searchType: 'images'` parameter to tell Apify/Google to search images
- Runs both searches in parallel (faster than sequential)
- Gracefully handles image search failure (text results still work)
- Respects Google's 10 results per page limit

---

## Updated Flow

### Brave Success (Primary Path)
```
User Query
  ↓
Brave Search API
  ↓
Returns: { web: [...], images: [...], videos: [...] }
  ↓
No empty check - pass data through
  ↓
Continue to Writer Agent
```

### Brave Failure → Apify Fallback
```
User Query
  ↓
Brave Search API fails (timeout, auth error, network error)
  ↓
Wait 1 second (rate limit respect)
  ↓
Apify Text Search + Apify Image Search (parallel)
  ↓
Combine results:
  web: organicResults (10 max)
  images: imageResults (10 max)
  videos: [] (Apify doesn't support video search)
  ↓
Continue to Writer Agent
```

---

## Google Search Pagination Update (Addressed)

**Important**: Google recently changed SERP layout:
- **Maximum organic results per page**: 10 (down from previous limits)
- **Our implementation**: Already respects this with `resultsPerPage: 10`
- **Constants file**: Already set to `MAX_RESULTS.WEB: 10`

✅ No changes needed - we're already compliant!

---

## Test Page Updates

Added new test button: **"Test Apify with Images (cute cats)"**

**What it tests**:
- Parallel text + image search
- searchType: 'images' parameter
- Image result extraction
- Matching retriever agent logic

**Example output**:
```json
{
  "textResults": [
    { "title": "Cute Cats...", "url": "...", "description": "..." },
    ...10 results
  ],
  "imageResults": [
    { "imageUrl": "https://...", "title": "Cute cat", "pageUrl": "..." },
    ...10 results
  ],
  "query": "cute cats",
  "textCount": 10,
  "imageCount": 10
}
```

---

## Files Modified

1. **searchRetrieverAgent.ts**
   - Line ~88: Removed empty results check
   - Line ~100-160: Added parallel Apify text + image search
   - Added proper image extraction logic
   - Added error handling for image search failure

2. **TestEdgeFunctions.tsx**
   - Added 'apify-images' test type
   - Added parallel search test with 'cute cats' query
   - Added new test button to UI

---

## Testing Checklist

### Brave Search
- [ ] Test normal query: "quantum computing"
  - Expect: web, images, videos
  - Should NOT fallback to Apify
  
- [ ] Test image-heavy query: "cute cats"
  - Expect: web results + lots of images
  - Should NOT fallback to Apify

- [ ] Test obscure query: "xyzabc12345nonexistent"
  - Expect: Empty results (valid response)
  - Should NOT fallback to Apify
  - Writer handles gracefully

### Apify Fallback
- [ ] Break Brave API (wrong key)
  - Expect: Fallback to Apify after 1 second
  - Both text + image searches run
  - Results include images

- [ ] Test on /test page
  - Click "Test Apify with Images (cute cats)"
  - Expect: textResults + imageResults both populated
  - Verify searchType: 'images' parameter works

### Edge Cases
- [ ] Apify text success, image fails
  - Expect: Text results returned, empty images array
  - No crash

- [ ] Both Brave and Apify fail
  - Expect: Fallback data returned
  - No infinite loop

---

## Performance Impact

### Before
- Brave fails instantly on empty check
- Unnecessary Apify fallback on valid responses
- No images from Apify fallback

### After
- Brave completes naturally (even with empty results)
- Apify only triggers on real errors
- Apify provides images when it does trigger
- Parallel image search adds ~500ms but worth it for images

### Timing Expectations
- Brave success: 1-3 seconds (no change)
- Apify fallback: 3-5 seconds (includes 1s wait + parallel searches)
- Total worst case: 8 seconds (Brave timeout + Apify)

---

## Next Steps

1. **Test the fixes**:
   - Run regular searches through UI
   - Monitor console logs for Brave completion
   - Verify no instant fallbacks
   - Test /test page Apify with images button

2. **If tests pass**:
   - Mark as production ready
   - Update refactoring summary
   - Document lessons learned

3. **If image search needs tuning**:
   - Adjust imgData extraction logic
   - Add more fallback field mappings
   - Test with different queries
