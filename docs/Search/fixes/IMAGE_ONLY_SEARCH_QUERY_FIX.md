# Image Search Query and Model Selection Fix

**Date:** 2025-10-22  
**Status:** ✅ Fixed

## Problem

Two related issues were identified:

### Issue 1: Artificial Query String
When performing an image-only search (no text query), the system was incorrectly setting the query to `"Analyze this image"` instead of passing an empty string.

### Issue 2: Incorrect Model Selection
Model selection was based on query string presence, not on whether reverse image search was used. This meant:
- Image + query → Used gpt-4o (full model) ❌
- Should use gpt-4o-mini for ALL reverse image searches ✅

### Log Evidence

```
logger.ts:67 [2025-10-21T22:20:26.228Z] INFO: WriterAgent: Processing research data 
{"query":"Analyze this image","resultsCount":9,"imagesCount":10,"videosCount":0}
```

## Root Causes

### 1. searchService.ts (Line 40)

```typescript
// ❌ BEFORE (incorrect)
const effectiveQuery = hasQuery ? query : 'Analyze this image';
```

### 2. searchWriterAgent.ts (Line 210)

```typescript
// ❌ BEFORE (incorrect - checks query, not images)
const isImageSearch = !query.trim() || query === 'Analyze this image';
const model = isImageSearch ? this.imageSearchModel : this.defaultModel;
```

## Solution

### 1. Fixed searchService.ts

```typescript
// ✅ AFTER (correct)
const effectiveQuery = hasQuery ? query : '';
```

- Image-only: empty string `""`
- Image + query: actual user query
- Text-only: actual user query

### 2. Fixed searchWriterAgent.ts

```typescript
// ✅ AFTER (correct - checks images presence)
const isReverseImageSearch = images.length > 0;
const model = isReverseImageSearch ? this.imageSearchModel : this.defaultModel;
```

Now model selection is based on whether images are present (indicating reverse image search was used), not on query presence.

### 3. Enhanced Prompt Context

```typescript
const queryContext = isReverseImageSearch
  ? (query 
      ? `Image + Text Search: User uploaded image and query "${query}"...`
      : `Image-Only Search: User uploaded image without text...`)
  : `Query: "${query}"`;
```

Provides better context to OpenAI about the search type.

## Model Selection Logic

### Rule: Use `gpt-4o-mini` for ANY reverse image search

| Scenario | Has Images? | Has Query? | Search Used | Model Used |
|----------|-------------|------------|-------------|------------|
| Image only | ✅ | ❌ | Reverse Image | gpt-4o-mini ✅ |
| Image + query | ✅ | ✅ | Reverse Image | gpt-4o-mini ✅ |
| Text only | ❌ | ✅ | Brave Search | gpt-4o ✅ |

**Rationale:** Reverse image search provides sufficient context, so the cheaper/faster model is appropriate.

## Data Flow After Fix

### Image-Only Search
```
User uploads image (no text)
  ↓
searchService: effectiveQuery = ''
  ↓
retrieverAgent.execute(query: '', imageUrls: [...])
  ↓
imageOnlySearch() → reverseImageSearchTool(imageUrl, undefined)
  ↓
Returns: { query: '', results: [...], images: [...] }
  ↓
writerAgent receives: { query: '', images: [...] }
  ↓
isReverseImageSearch = images.length > 0 → TRUE ✅
  ↓
Uses gpt-4o-mini model ✅
```

### Image + Query Search
```
User uploads image + types "red car"
  ↓
searchService: effectiveQuery = 'red car'
  ↓
retrieverAgent.execute(query: 'red car', imageUrls: [...])
  ↓
imageOnlySearch() → reverseImageSearchTool(imageUrl, 'red car')
  ↓
SERP API: image_url + q='red car'
  ↓
Returns: { query: 'red car', results: [...], images: [...] }
  ↓
writerAgent receives: { query: 'red car', images: [...] }
  ↓
isReverseImageSearch = images.length > 0 → TRUE ✅
  ↓
Uses gpt-4o-mini model ✅
```

### Regular Text Search
```
User types "best laptops 2025"
  ↓
searchService: effectiveQuery = 'best laptops 2025'
  ↓
retrieverAgent.execute(query: 'best laptops 2025', imageUrls: undefined)
  ↓
textOnlySearch() → braveSearchTool()
  ↓
Returns: { query: 'best laptops 2025', results: [...], images: [] }
  ↓
writerAgent receives: { query: 'best laptops 2025', images: [] }
  ↓
isReverseImageSearch = images.length > 0 → FALSE ✅
  ↓
Uses gpt-4o model ✅
```

## Expected Log Output After Fix

### Image-Only Search
```
INFO: WriterAgent: Processing research data 
{"query":"","resultsCount":9,"imagesCount":10,"videosCount":0}

INFO: WriterAgent: Using model 
{"model":"gpt-4o-mini","reason":"reverse image search"}
```

### Image + Query
```
INFO: WriterAgent: Processing research data 
{"query":"red car","resultsCount":9,"imagesCount":10,"videosCount":0}

INFO: WriterAgent: Using model 
{"model":"gpt-4o-mini","reason":"reverse image search"}
```

### Text Only
```
INFO: WriterAgent: Processing research data 
{"query":"best laptops 2025","resultsCount":15,"imagesCount":0,"videosCount":5}

INFO: WriterAgent: Using model 
{"model":"gpt-4o","reason":"regular search"}
```

## Files Modified

1. **searchService.ts**
   - Changed: `effectiveQuery = hasQuery ? query : ''`
   - Removed artificial "Analyze this image" default

2. **searchWriterAgent.ts**
   - Changed: `isReverseImageSearch = images.length > 0`
   - Was checking query string, now checks images presence
   - Enhanced queryContext with three scenarios (image-only, image+query, text-only)
   - Updated all references from `isImageSearch` to `isReverseImageSearch`

## Benefits

1. **Correct Model Selection**: Always uses gpt-4o-mini for reverse image searches
2. **Cost Savings**: Uses cheaper model when appropriate
3. **Cleaner Logs**: Empty string for image-only instead of artificial query
4. **Better Prompts**: Context clearly indicates search type to OpenAI
5. **Consistent Logic**: Model selection based on search type, not query presence

## Testing Checklist

- [ ] Image-only search → query="", uses gpt-4o-mini
- [ ] Image + query → query="user text", uses gpt-4o-mini
- [ ] Text-only search → query="user text", uses gpt-4o
- [ ] Verify logs show correct query values
- [ ] Verify correct model selection in all scenarios
- [ ] Check article quality remains high

---

**Last Updated:** 2025-10-22  
**Status:** Ready for testing
