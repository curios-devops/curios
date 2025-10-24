# Simplified Image Search Workflow

**Date:** 2025-01-22  
**Status:** ✅ Implemented and Deployed

## Overview

This document describes the simplified search workflow that eliminates redundant API calls and clarifies the logic for handling image-based searches versus text-based searches.

## Problem Statement

Previously, the search workflow was overly complex:
- When an image was attached, the system would call BOTH Brave Search AND Reverse Image Search
- Image/video metadata was being built into complex prompts for the Writer Agent
- The logic had three separate scenarios (image-only, text-only, combined) with parallel execution
- This caused unnecessary API calls, increased costs, and complicated debugging

## Solution

### Simplified Search Logic

The workflow now follows a simple rule:

```
IF image attached:
  → Use ONLY reverse image search (SERP API)
  → Pass query text if provided
  → Skip Brave Search entirely
  
ELSE (no image):
  → Use Brave web search
  → Use Brave image search
  → Keep existing logic
```

### Key Changes

#### 1. SearchRetrieverAgent (`searchRetrieverAgent.ts`)

**Before:**
- Three separate methods: `imageOnlySearch()`, `textOnlySearch()`, `combinedSearch()`
- Complex parallel execution with `Promise.all()`
- Attempted to merge results from multiple sources

**After:**
```typescript
if (hasImages) {
  // Use ONLY reverse image search
  searchResults = await this.imageOnlySearch(imageUrls!, hasText ? trimmedQuery : undefined);
} else {
  // Regular text search with Brave
  searchResults = await this.textOnlySearch(trimmedQuery, onStatusUpdate);
}
```

- Removed `combinedSearch()` method entirely
- `imageOnlySearch()` now accepts optional `query` parameter
- Simple conditional logic - no parallel execution

#### 2. ReverseImageSearchTool (`reverseImageSearchTool.ts`)

**Before:**
```typescript
export async function reverseImageSearchTool(imageUrl: string)
```

**After:**
```typescript
export async function reverseImageSearchTool(imageUrl: string, query?: string)
```

- Accepts optional `query` parameter
- Passes query to Edge Function for combined image+text search

#### 3. Edge Function (`supabase/functions/reverse-image-search/index.ts`)

**Before:**
```typescript
interface ReverseImageSearchRequest {
  imageUrl: string
}
```

**After:**
```typescript
interface ReverseImageSearchRequest {
  imageUrl: string
  query?: string // Optional text query
}

// In SERP API call:
if (query) {
  serpApiUrl.searchParams.append('q', query)
}
```

- Accepts optional `query` parameter
- Adds `q` parameter to SERP API call when provided
- Allows users to search "red car" with an uploaded image

#### 4. SearchWriterAgent (`searchWriterAgent.ts`)

**Before:**
- Used `gpt-4o` for all searches
- Built complex `imageContext` with metadata of 5 images
- Injected image URLs, titles, sources into prompt
- Added video context as well

**After:**
```typescript
private readonly defaultModel: string = 'gpt-4o';
private readonly imageSearchModel: string = 'gpt-4o-mini'; // For reverse image

// Determine model
const isImageSearch = !query.trim() || query === 'Analyze this image';
const model = isImageSearch ? this.imageSearchModel : this.defaultModel;
```

- Uses **`gpt-4o-mini`** for image searches (cheaper, faster)
- Uses **`gpt-4o`** for regular text searches
- **Removed** all image/video context building
- Simple text-only prompt with source results

## Data Flow

### Image-Only Search

```
User uploads image (no query)
  ↓
SearchRetrieverAgent.execute(query: '', imageUrls: ['https://...'])
  ↓
imageOnlySearch(imageUrls, undefined)
  ↓
reverseImageSearchTool(imageUrl, undefined)
  ↓
Supabase Edge Function
  ↓
SERP API: google_reverse_image (no q parameter)
  ↓
Returns: { web: [], images: [] }
  ↓
SearchWriterAgent.execute(research, ...)
  ↓
OpenAI API with gpt-4o-mini
  ↓
Article generated
```

### Image + Query Search

```
User uploads image + types "red sports car"
  ↓
SearchRetrieverAgent.execute(query: 'red sports car', imageUrls: ['https://...'])
  ↓
imageOnlySearch(imageUrls, 'red sports car')
  ↓
reverseImageSearchTool(imageUrl, 'red sports car')
  ↓
Supabase Edge Function
  ↓
SERP API: google_reverse_image + q=red sports car
  ↓
Returns: { web: [], images: [] }
  ↓
SearchWriterAgent.execute(research, ...)
  ↓
OpenAI API with gpt-4o-mini
  ↓
Article generated
```

### Regular Text Search (No Image)

```
User types "best programming languages 2025"
  ↓
SearchRetrieverAgent.execute(query: 'best programming languages 2025', imageUrls: undefined)
  ↓
textOnlySearch('best programming languages 2025', ...)
  ↓
braveSearchTool(query)
  ↓
Brave Search API (web + images + videos + news)
  ↓
Returns: { web: [], images: [], videos: [] }
  ↓
SearchWriterAgent.execute(research, ...)
  ↓
OpenAI API with gpt-4o (full model)
  ↓
Article generated
```

## Benefits

### 1. **Cost Reduction**
- No redundant Brave API calls when image is attached
- Uses cheaper `gpt-4o-mini` model for image searches
- Eliminates parallel execution overhead

### 2. **Simplified Logic**
- Single conditional: `if (hasImages) → reverse search, else → brave search`
- No complex merge logic
- Easier to debug and maintain

### 3. **Better Performance**
- Fewer API calls = faster response time
- `gpt-4o-mini` is faster than `gpt-4o`
- No waiting for parallel Promise.all() results

### 4. **Cleaner Context**
- Writer agent receives simple text context from reverse search results
- No complex image metadata building
- More focused prompts for better article quality

### 5. **Query Support**
- Users can now refine image searches with text queries
- Example: Upload car image + type "vintage models" → searches for vintage versions
- Maintains reverse search quality with text refinement

## Testing Checklist

- [x] Deploy Edge Function with query parameter support
- [ ] Test image-only search (no query)
- [ ] Test image + query search
- [ ] Test regular text search (no image)
- [ ] Verify gpt-4o-mini is used for image searches
- [ ] Verify gpt-4o is used for text searches
- [ ] Verify no Brave API calls when image attached
- [ ] Check console logs for correct flow
- [ ] Verify article quality remains high

## Files Modified

1. **searchRetrieverAgent.ts**
   - Removed `combinedSearch()` method
   - Updated `imageOnlySearch()` to accept optional query
   - Simplified conditional logic

2. **reverseImageSearchTool.ts**
   - Added optional `query?: string` parameter
   - Passes query to Edge Function

3. **searchWriterAgent.ts**
   - Added `imageSearchModel: 'gpt-4o-mini'`
   - Removed image/video context building
   - Model selection based on search type

4. **supabase/functions/reverse-image-search/index.ts**
   - Added `query?: string` to request interface
   - Passes `q` parameter to SERP API when provided

## Related Documentation

- [SERP API Documentation](https://serpapi.com/reverse-image)
- [Brave Search API Documentation](https://brave.com/search/api/)
- [OpenAI Model Pricing](https://openai.com/pricing)

## Next Steps

1. Test the complete flow on `/serp-test` page
2. Monitor production usage and costs
3. Gather user feedback on article quality
4. Consider adding model selection UI for advanced users

---

**Last Updated:** 2025-01-22  
**Author:** AI Assistant  
**Reviewed By:** Pending
