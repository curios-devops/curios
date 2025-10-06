# Brave Search Cleanup Plan

## Current Status

### Files Found:
1. ✅ **`src/commonService/searchTools/braveSearchTool.ts`** - ACTIVE (used by retriever)
2. ❌ **`src/commonService/searchTools/brave.ts`** - OLD (only in backup files)
3. ❌ **`src/common/tools/brave.ts`** - ORPHANED (not used anywhere)

### Currently Used:
```typescript
// In searchRetrieverAgent.ts:
import { braveSearchTool } from '../../../../commonService/searchTools/braveSearchTool.ts';
```

---

## Action Plan

### Phase 1: Delete Unused Files ✅
1. Delete `src/common/tools/brave.ts` (349 lines - not used)
2. Delete `src/commonService/searchTools/brave.ts` (235 lines - only in backups)
3. Keep `src/commonService/searchTools/braveSearchTool.ts` (147 lines - ACTIVE)

**Result**: ONE canonical Brave search file

### Phase 2: Fix braveSearchTool.ts Response Structure 🔧

**Current Issue**: Handling two formats but not validating results properly

**Console shows**:
```
🔍 [BRAVE TOOL] Extracted data: 
  webResultsLength: 20  ✅
  imageResultsLength: 0  ❌
  newsResultsLength: 10  ✅
  videoResultsLength: 6  ✅
```

**WHY no images?**

Need to check if:
1. Brave edge function returns images in response
2. Images are in `deep_results` field (not `results.images`)
3. Need separate images API call

### Phase 3: Extract Images from deep_results 🖼️

According to Brave API docs, images are in `deep_results`:

```typescript
interface WebSearchResult {
  title: string;
  url: string;
  description: string;
  deep_results?: {
    news?: NewsResult[];
    videos?: VideoResult[];
    images?: Image[];  // ← HERE!
  }
}
```

**Solution**: Extract images from `web.results[].deep_results.images[]`

### Phase 4: Add Comprehensive Logging 🔍

Add logs to show:
1. **Full Brave response** (first 2000 chars)
2. **deep_results structure** (if exists)
3. **Extracted images** (count + first URL)
4. **Final formatted results** (all counts)

---

## Implementation Steps

### Step 1: Add deep_results Image Extraction

```typescript
// After getting webResults from Brave
const webResults = data.web?.results || [];

// Extract images from deep_results
const deepImages: ImageResult[] = [];
webResults.forEach((result: any) => {
  if (result.deep_results?.images) {
    result.deep_results.images.forEach((img: any) => {
      if (img.properties?.url || img.thumbnail?.src) {
        deepImages.push({
          url: img.properties?.url || img.thumbnail?.src || '',
          alt: img.title || 'Search result image',
          source_url: result.url
        });
      }
    });
  }
});

console.log('🔍 [BRAVE TOOL] Extracted deep_results images:', {
  count: deepImages.length,
  firstUrl: deepImages[0]?.url || 'NONE'
});

// Combine with regular image results
const imageResults = [
  ...deepImages,
  ...(data.images?.results || []).map(...)
];
```

### Step 2: Add Response Validation

```typescript
// After response
const responseData = await response.json();

console.log('🔍 [BRAVE TOOL] FULL RESPONSE (first 2000 chars):', 
  JSON.stringify(responseData).substring(0, 2000)
);
```

### Step 3: Validate Writer Format

Writer expects:
```typescript
{
  query: string;
  perspectives: [];
  results: SearchResult[];  // ← Array of {title, url, content}
}
```

Make sure retriever returns this EXACT format.

---

## Testing Checklist

### Test 1: Brave Response Structure
- [ ] Run search for "cats"
- [ ] Check console for "FULL RESPONSE"
- [ ] Verify structure: `data.results` OR `data.data`
- [ ] Check if `web.results[0].deep_results.images` exists

### Test 2: Image Extraction
- [ ] Check "Extracted deep_results images" count
- [ ] Should be > 0 if deep_results has images
- [ ] Verify first URL is valid (starts with http)

### Test 3: Writer Receives Correct Format
- [ ] Check "Preparing research data for SearchWriterAgent"
- [ ] Verify `resultsCount > 0`
- [ ] Verify `results[0].title` exists
- [ ] Verify `results[0].content` exists

### Test 4: UI Updates
- [ ] Search completes
- [ ] See 🚨 FORMATTING RESPONSE
- [ ] See final response logs
- [ ] UI shows results

---

## Expected Console Flow

```
1. 🔍 [BRAVE TOOL] FULL RESPONSE (first 2000 chars): {...}
2. 🔍 [BRAVE TOOL] Full response: {success: true, hasResults: ...}
3. 🔍 [BRAVE TOOL] Using structure 1 or 2
4. 🔍 [BRAVE TOOL] Extracted data: {webResultsLength: 20, ...}
5. 🔍 [BRAVE TOOL] Extracted deep_results images: {count: 15}
6. 🔍 [BRAVE TOOL] Returning formatted results: {webCount: 20, imageCount: 15}
7. 🔍 [RETRIEVER] Brave tool returned: {webCount: 20, imageCount: 15}
8. 🔍 [RETRIEVER] Returning final data: {resultsCount: 10, imagesCount: 15}
9. 🔍 [DEBUG] Preparing research data: {resultsCount: 10}
10. 🔍 [WRITER] Successfully generated article
11. 🚨🚨🚨 FORMATTING RESPONSE NOW
12. 🔍 [DEBUG] Final response: {sources: 10, images: 15}
```

---

## Success Criteria

✅ ONE Brave file (braveSearchTool.ts)  
✅ Images extracted (count > 0)  
✅ Writer receives correct format  
✅ 🚨 log appears (code reaches formatting)  
✅ UI updates with results  

---

## Files to Delete

```bash
rm src/common/tools/brave.ts
rm src/commonService/searchTools/brave.ts
```

**Note**: Keep backup files for now (searchRetrieverAgent.backup.ts) in case we need to reference old logic.
