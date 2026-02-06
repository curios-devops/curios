# Debug Logging Added - Brave Empty Results Investigation

## Date: October 2, 2025

## Issue: Empty Search Results

### Symptoms
- Brave Search returns 200 success
- fetch-openai returns 200 success  
- Application doesn't freeze (timeout fix working ✅)
- BUT: No images, videos, sources, or news displayed
- Suspicion: Brave tool returning empty arrays

---

## Debug Logging Added

### 1. Brave Search Tool (`braveSearchTool.ts`)

#### After receiving response:
```typescript
console.log('🔍 [BRAVE TOOL] Raw response structure:', {
  hasResults: !!data.results,
  hasWeb: !!data.results?.web,
  hasImages: !!data.results?.images,
  hasNews: !!data.results?.news,
  hasVideos: !!data.results?.videos,
  webResultsLength: data.results?.web?.results?.length || 0,
  imageResultsLength: data.results?.images?.results?.length || 0,
  firstWebTitle: data.results?.web?.results?.[0]?.title || 'NO WEB RESULTS',
  firstImageUrl: data.results?.images?.results?.[0]?.properties?.url || 'NO IMAGE URL'
});
```

#### Before returning:
```typescript
console.log('🔍 [BRAVE TOOL] Returning formatted results:', {
  webCount: webResults.length,
  imageCount: imageResults.length,
  newsCount: newsResults.length,
  videoCount: videoResults.length,
  firstWebResult: webResults[0] || 'NO WEB',
  firstImage: imageResults[0] || 'NO IMAGES'
});
```

### 2. Retriever Agent (`searchRetrieverAgent.ts`)

#### After calling Brave tool:
```typescript
console.log('🔍 [RETRIEVER] Brave tool returned:', {
  webCount: braveResults.web?.length || 0,
  imageCount: braveResults.images?.length || 0,
  newsCount: braveResults.news?.length || 0,
  videoCount: braveResults.videos?.length || 0,
  firstWeb: braveResults.web?.[0]?.title || 'NO WEB',
  firstImage: braveResults.images?.[0]?.url || 'NO IMAGES'
});
```

#### After combining web + news:
```typescript
console.log('🔍 [RETRIEVER] Combined search results:', {
  webCount: searchResults.web.length,
  imageCount: searchResults.images.length,
  videoCount: searchResults.videos.length
});
```

#### Before returning:
```typescript
console.log('🔍 [RETRIEVER] Returning final data:', {
  resultsCount: validResults.length,
  imagesCount: validImages.length,
  videosCount: validVideos.length,
  firstResult: validResults[0]?.title || 'NO RESULTS',
  firstImage: validImages[0]?.url || 'NO IMAGES',
  firstVideo: validVideos[0]?.title || 'NO VIDEOS'
});
```

---

## Complete Console Log Flow (Expected)

When you search for "cats", you should see:

```
1. 🔍 [BRAVE TOOL] Raw response structure:
   - hasResults: true
   - hasWeb: true
   - hasImages: true
   - webResultsLength: 10
   - imageResultsLength: 10
   - firstWebTitle: "Cat - Wikipedia"

2. 🔍 [BRAVE TOOL] Returning formatted results:
   - webCount: 10
   - imageCount: 10
   - newsCount: 5
   - videoCount: 5
   - firstWebResult: { title: "Cat - Wikipedia", ... }

3. 🔍 [RETRIEVER] Brave tool returned:
   - webCount: 10
   - imageCount: 10
   - newsCount: 5
   - videoCount: 5

4. 🔍 [RETRIEVER] Combined search results:
   - webCount: 15 (web + news combined)
   - imageCount: 10
   - videoCount: 5

5. 🔍 [RETRIEVER] Returning final data:
   - resultsCount: 10 (after dedup and validation)
   - imagesCount: 10
   - videosCount: 5
   - firstResult: "Cat - Wikipedia"

6. 🚨🚨🚨 FORMATTING RESPONSE NOW 🚨🚨🚨

7. 🔍 [DEBUG] Retriever data before formatting:
   - resultsCount: 10
   - imagesCount: 10
   - videosCount: 5

8. 🔍 [DEBUG] After image validation:
   - originalCount: 10
   - validatedCount: 10 (or less if some fail HTTPS check)

9. 🔍 [DEBUG] Final response being returned:
   - sources: 10
   - images: 10
   - videos: 5
   - citations: 1+
```

---

## Diagnostic Steps

### Step 1: Check Brave Tool Response
Look for `🔍 [BRAVE TOOL] Raw response structure`

**If you see:**
- `webResultsLength: 0` → Brave API not returning data
- `hasResults: false` → Response structure mismatch
- `firstWebTitle: "NO WEB RESULTS"` → Empty results array

**Then:**
- Check Brave API key is valid
- Check Supabase edge function logs
- Verify test page still works

### Step 2: Check Retriever Processing
Look for `🔍 [RETRIEVER] Brave tool returned`

**If counts are 0:**
- Brave tool mapping is wrong
- Data structure changed

### Step 3: Check Final Return
Look for `🔍 [RETRIEVER] Returning final data`

**If counts dropped to 0:**
- Deduplication removed all results
- Validation filtering too strict

### Step 4: Check Service Formatting
Look for `🚨🚨🚨 FORMATTING RESPONSE NOW`

**If you DON'T see this:**
- Writer agent failed
- Error thrown before formatting
- Check Writer logs for errors

**If you DO see this:**
- Check subsequent debug logs
- Data should flow through to UI

---

## Perspective Agent Clarification

**Q: Why do I see "perspectivesCount: 0" in logs?**

**A:** This is just debug logging checking IF perspectives exist. For regular search:
- `perspectives: []` (empty array) ✅ Correct
- `perspectivesCount: 0` ✅ Correct
- Perspective agent is NOT called ✅ Correct

**Perspective Agent ONLY runs in Pro Search:**
- Pro Search → SwarmController → PerspectiveAgent ✅
- Regular Search → Retriever + Writer (no perspectives) ✅

---

## Testing Instructions

1. **Restart dev server**
   ```bash
   npm run dev
   ```

2. **Open browser console** (Cmd+Opt+J)

3. **Clear console** (for clean view)

4. **Search for "cats"**

5. **Watch for logs in order:**
   - 🔍 [BRAVE TOOL] logs (2 messages)
   - 🔍 [RETRIEVER] logs (3 messages)
   - 🚨 FORMATTING RESPONSE NOW
   - 🔍 [DEBUG] logs (3 messages)

6. **Take screenshot or copy logs**

7. **Share the output** - especially:
   - What counts are showing
   - Where logs stop (if they do)
   - Any error messages

---

## Expected Outcomes

### ✅ Success Case
- All logs appear in order
- Counts are > 0 throughout
- UI displays all content (overview, sources, images, videos)

### ❌ Failure Case 1: Empty at Brave Tool
- `🔍 [BRAVE TOOL] Raw response structure` shows 0 counts
- **Problem**: Brave API not returning data
- **Next step**: Check Supabase edge function logs

### ❌ Failure Case 2: Empty at Retriever
- Brave tool shows counts > 0
- Retriever shows counts = 0
- **Problem**: Mapping or filtering issue
- **Next step**: Check data structure mismatch

### ❌ Failure Case 3: No Formatting Logs
- Retriever completes successfully
- No 🚨 emoji appears
- **Problem**: Writer agent error or early return
- **Next step**: Check Writer agent logs for errors

---

## Files Modified

1. **`src/commonService/searchTools/braveSearchTool.ts`**
   - Added: Raw response structure logging
   - Added: Formatted results logging

2. **`src/services/search/regular/agents/searchRetrieverAgent.ts`**
   - Added: Brave tool return logging
   - Added: Combined results logging
   - Added: Final data return logging

3. **`src/services/search/regular/agents/searchWriterAgent.ts`** (previous fix)
   - Added: 30-second timeout
   - Added: AbortController

4. **`src/services/search/searchService.ts`** (previous fix)
   - Added: 🚨 formatting marker
   - Added: Retriever data logging
   - Added: Image validation logging
   - Added: Final response logging

---

## Quick Reference: Console Log Emoji Guide

- 🔍 = Debug/info log
- 🚨 = Important checkpoint
- 🐛 = Debug marker
- ✅ = Success
- ❌ = Failure

---

## Next Actions

After you run the test and share logs, we can:

1. **If Brave returns empty**: Fix Brave API call or edge function
2. **If mapping fails**: Fix data structure extraction
3. **If validation fails**: Adjust filtering logic
4. **If no formatting logs**: Debug Writer agent error

The logs will tell us exactly where the data is lost! 🔍
