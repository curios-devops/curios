# MAX_RESULTS Verification - All Capped at 10

This document verifies that all search results are properly capped at 10 for each category: web, images, videos, and news.

## Constants Configuration
**File:** `src/commonService/utils/constants.ts`
```typescript
export const MAX_RESULTS = {
  WEB: 10,     // Cap at 10 results
  IMAGES: 10,  // Cap at 10 results
  VIDEO: 10,   // Cap at 10 results
  NEWS: 10     // Cap at 10 results
};
```

## Multi-Layer Capping Strategy

### Layer 1: Edge Functions (Brave API Requests)
**Files:**
- `supabase/functions/brave-web-search/index.ts` - Requests `count=10` from Brave Web API
- `supabase/functions/brave-images-search/index.ts` - Requests `count=10` from Brave Images API
- `supabase/functions/reverse-image-search/index.ts` - Paginates up to TARGET_IMAGES=10
  - Smart pagination: Calculates `remainingSlots` to avoid exceeding 10
  - `.slice(0, remainingSlots)` before adding page results
  - Final safety cap: `.slice(0, 10)` on return

**Impact:** Reduces API costs and bandwidth by requesting only what we need. Stops pagination early to avoid unnecessary API calls.

### Layer 2: Search Tools (Data Transformation)
**File:** `src/commonService/searchTools/braveSearchTool.ts`
```typescript
const finalResult = {
  web: webResults.slice(0, 10),      // Cap at 10 web results
  images: imageResults,               // Already filtered to max 10
  news: newsResults.slice(0, 10),    // Cap at 10 news results
  videos: videoResults.slice(0, 10)  // Cap at 10 video results
};
```

**File:** `src/commonService/searchTools/apifySearchTool.ts`
- Web results: `organicResults.slice(0, 10)`
- Images: `imgData.slice(0, 10)`

**Impact:** Safety layer - ensures tools never return more than 10 results even if Edge Functions return more.

### Layer 3: Retriever Agent (Final Aggregation)
**File:** `src/services/search/regular/agents/searchRetrieverAgent.ts`
```typescript
// In execute() method:
const validResults = this.deduplicateResults(searchResults.web)
  .filter(result => result.url !== '#' && result.title && result.content)
  .slice(0, MAX_RESULTS.WEB); // Cap at 10 web results

const validImages = this.deduplicateImages(searchResults.images)
  .slice(0, MAX_RESULTS.IMAGES); // Cap at 10 images

const validVideos = searchResults.videos?.slice(0, MAX_RESULTS.VIDEO) || []; // Cap at 10 videos

// In textOnlySearch() method:
const cappedNews = braveResults.news.slice(0, MAX_RESULTS.NEWS);
```

**Impact:** Final safety layer after deduplication and validation. Handles combined searches where multiple tools contribute results.

## Why Multi-Layer Capping?

1. **Cost Optimization (Layer 1):** Request only what we need from external APIs
2. **Data Quality (Layer 2):** Transform and filter at tool level
3. **Consistency (Layer 3):** Guarantee final result counts after deduplication

## Testing

To verify all caps are working:
1. Run a regular search and check console logs:
   - Look for `[BRAVE TOOL] Final results:` - should show ≤10 for each category
   - Look for `[RETRIEVER] Returning final data:` - should show ≤10 for each category
2. Check Network tab in DevTools:
   - Brave API requests should have `count=10` parameter
   - SERP API should stop at TARGET_IMAGES=10

## Deployment Status
✅ **brave-images-search** - Deployed with count=10
✅ **brave-web-search** - Deployed with count=10  
✅ **reverse-image-search** - **FIXED & DEPLOYED** - Smart pagination with remainingSlots calculation + final safety cap
✅ **braveSearchTool.ts** - Updated with .slice(0, 10) caps
✅ **searchRetrieverAgent.ts** - Updated with MAX_RESULTS caps
✅ **apifySearchTool.ts** - Already has .slice(0, 10) caps

## Bug Fix: Reverse Image Search Over-Fetching (Oct 21, 2025)
**Problem:** Returning 14 images instead of 10 because pagination was adding entire page results without checking remaining slots.

**Solution:** 
```typescript
const remainingSlots = TARGET_IMAGES - allImageResults.length
const pageImageResults = (data.image_results || [])
  .filter(result => result.thumbnail)
  .slice(0, remainingSlots) // Only take what we need!
  .map(...)
```

**Result:** Now stops at exactly 10 images, avoiding unnecessary pagination and API calls.

Last Updated: October 21, 2025
