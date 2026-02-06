# Regular Search Flow - Test Checklist

## Pre-Test Setup
- [ ] Ensure all environment variables are set:
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_OPENAI_API_URL` (Supabase Edge Function URL)
  - `VITE_BRAVE_API_KEY` (for brave-search edge function)
  - `VITE_APIFY_API_KEY` (for fallback)

## Test Scenarios

### 1. Happy Path - Normal Search
**Test**: Query: "what is quantum computing?"

**Expected Flow**:
```
User enters query
  ↓
SearchRetrieverAgent.execute(query, onStatusUpdate)
  ↓
Brave Search API call
  ↓
Success: Returns { query, results: [...], images: [...], videos: [...] }
  ↓
SearchWriterAgent.execute(researchData, onStatusUpdate)
  ↓
Prepares source context (8 results, 600 chars each)
  ↓
Calls Supabase Edge Function → OpenAI
  ↓
Returns { content, followUpQuestions, citations }
  ↓
searchService formats final response
  ↓
UI displays: answer, sources, images, videos, citations
```

**Checkpoints**:
- [ ] No console errors
- [ ] No freezing or hanging
- [ ] Status updates show: "Searching..." → "Generating..." → "Completed!"
- [ ] Answer displays with proper markdown formatting
- [ ] Sources section shows 8-10 sources
- [ ] Images section shows thumbnails
- [ ] Citations are in [Website Name] format
- [ ] 5 follow-up questions appear at bottom
- [ ] Total time < 10 seconds

---

### 2. Brave Failure - Apify Fallback
**Test**: Temporarily break Brave API (wrong key or rate limit)

**Expected Flow**:
```
Brave Search fails
  ↓
Wait 1 second (rate limit respect)
  ↓
Apify fallback triggers
  ↓
Success: Returns results from Apify
  ↓
Rest of flow continues normally
```

**Checkpoints**:
- [ ] Console shows: "Brave Search failed, falling back to Apify"
- [ ] 1-second delay between Brave and Apify calls
- [ ] Apify returns 10 results
- [ ] Writer receives results and generates article
- [ ] UI displays results (no images/videos from Apify)
- [ ] Total time < 15 seconds

---

### 3. All Search Providers Fail
**Test**: Break both Brave and Apify (wrong keys)

**Expected Flow**:
```
Brave Search fails
  ↓
Wait 1 second
  ↓
Apify fallback fails
  ↓
Retriever returns fallback data
  ↓
Writer receives fallback results
  ↓
Writer generates generic fallback article
```

**Checkpoints**:
- [ ] Console shows errors for both providers
- [ ] Retriever returns: { results: [{ title: "No Results Found", ... }] }
- [ ] Writer receives fallback data
- [ ] UI displays: "We could not find any results..."
- [ ] No crash or infinite loop
- [ ] Total time < 5 seconds

---

### 4. OpenAI API Failure
**Test**: Break OpenAI Edge Function URL

**Expected Flow**:
```
Retriever succeeds
  ↓
Writer receives results
  ↓
OpenAI call fails
  ↓
Writer returns fallback article
```

**Checkpoints**:
- [ ] Console shows: "OpenAI call failed"
- [ ] Writer returns fallback: "We apologize, high traffic..."
- [ ] UI displays fallback article
- [ ] Sources still show from retriever
- [ ] No crash or infinite loop
- [ ] Total time < 8 seconds

---

### 5. Edge Cases

#### Empty Query
**Test**: Submit empty string

**Expected**:
- [ ] Retriever returns: `{ success: false, error: "Search query cannot be empty" }`
- [ ] searchService catches error
- [ ] UI shows: "We could not process your search"

#### Very Long Query
**Test**: Submit 500-character query

**Expected**:
- [ ] Query is trimmed and processed normally
- [ ] Brave Search handles long query
- [ ] OpenAI receives full context
- [ ] Article addresses the query comprehensively

#### Special Characters
**Test**: Query with quotes, emojis, symbols: `"AI" & 'ML' 🤖 (2024)`

**Expected**:
- [ ] Query is URL-encoded properly
- [ ] Brave Search handles special characters
- [ ] Results are valid
- [ ] No parsing errors

#### No Images/Videos
**Test**: Query that returns text only: "mathematical proof of fermat's last theorem"

**Expected**:
- [ ] Retriever returns: `{ results: [...], images: [], videos: [] }`
- [ ] Writer processes text results
- [ ] UI shows answer and sources
- [ ] Images/videos sections are empty (not broken)

---

## Performance Benchmarks

### Target Times
- Brave Search: < 2 seconds
- Apify Fallback (if needed): < 3 seconds
- OpenAI Generation: < 5 seconds
- **Total End-to-End**: < 10 seconds (happy path)

### Memory
- No memory leaks after multiple searches
- Console logs don't accumulate excessively
- Agent instances are properly garbage collected

---

## Console Log Analysis

### Expected Logs (Happy Path)
```
🔍 [SEARCH] Starting Regular Search flow
🔍 [SEARCH] Step 1: Starting SearchRetrieverAgent
🔍 [RETRIEVER] Searching with Brave Search...
✅ Brave Search completed: webCount: 10, imagesCount: 8, videosCount: 3
🔍 [RETRIEVER] Search completed successfully!
🔍 [SEARCH] Step 2: Starting SearchWriterAgent
🔍 [WRITER] Analyzing search results...
🔍 [WRITER] Generating comprehensive answer...
✅ WriterAgent: Successfully generated article
🔍 [WRITER] Article generation completed!
🔍 [SEARCH] Step 3: Formatting final response
✅ Regular search completed successfully
```

### Red Flags (Should NOT see)
- ❌ Timeout errors
- ❌ Infinite retry loops
- ❌ "Promise.race" errors
- ❌ "AbortError" from timeouts
- ❌ Rate limit errors (429)
- ❌ Hanging logs (no completion message)

---

## Post-Test Validation

### If All Tests Pass ✅
1. Delete backup files:
   - `searchRetrieverAgent.backup.ts`
   - `searchWriterAgent.backup.ts`

2. Update documentation:
   - Mark regular search as "Production Ready"
   - Document any edge cases discovered
   - Update API integration guide

3. Plan Pro Search refactoring:
   - Apply same principles to swarmController
   - Simplify perspectiveAgent
   - Test Tavily integration

### If Any Tests Fail ❌
1. Check console logs for exact error
2. Verify environment variables are set
3. Test individual APIs on /test page
4. Compare with backup files to identify regression
5. Fix issue and re-run full test suite

---

## Regression Testing

After any future changes, re-run this checklist to ensure:
- Agent handoff still works
- Error handling is preserved
- Performance hasn't degraded
- UI displays correctly
- No new edge cases introduced
