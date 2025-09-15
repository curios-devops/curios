# Refactored Search Flow Testing Guide

## Overview
The search flow has been completely refactored to be simpler, more robust, and with comprehensive console logging to identify exactly where any issues occur.

## Key Changes Made

### 1. Simplified Regular Search Flow
```
SearchService → SearchRetrieverAgent → SearchWriterAgent → Response
```

**Before:** Complex flow with multiple handoffs and unclear error points
**After:** Clear step-by-step execution with explicit logging at each stage

### 2. Console Logging System
- 🔍 **[SEARCH]** - Main search service operations
- 🔍 **[RETRIEVER]** - SearchRetrieverAgent operations  
- ✍️ **[WRITER]** - SearchWriterAgent operations

### 3. Enhanced Error Handling
- AbortController for fetch timeouts
- Proper timeout cleanup
- Clear error messages with context
- Fallback responses for all failure scenarios

## Testing Instructions

### 1. Start Development Server
```bash
npm run dev
```

### 2. Open Browser Console
- Open Developer Tools (F12)
- Go to Console tab
- Clear any existing logs

### 3. Perform a Regular Search
1. Navigate to the app in your browser
2. Enter a search query (e.g., "artificial intelligence trends 2024")
3. Click search
4. Watch the console for the following sequence:

## Expected Console Log Sequence

### 1. Search Service Start
```
🔍 [SEARCH] Starting Regular Search flow
🔍 [SEARCH] Step 1: Starting SearchRetrieverAgent
```

### 2. Retriever Agent Execution
```
🔍 [RETRIEVER] SearchRetrieverAgent starting
🔍 [RETRIEVER] Searching with Brave Search...
🔍 [RETRIEVER] Brave Search completed
🔍 [RETRIEVER] SearchRetrieverAgent completing successfully
```

### 3. Writer Agent Execution
```
🔍 [SEARCH] Step 2: Starting SearchWriterAgent
✍️ [WRITER] Starting SearchWriterAgent execution
✍️ [WRITER] Processing research data
✍️ [WRITER] Making OpenAI API call
✍️ [WRITER] About to make fetch request
✍️ [WRITER] Fetch response received
```

### 4. Final Response
```
🔍 [SEARCH] Step 3: Formatting final response
🔍 [SEARCH] Regular search completed successfully
```

## Troubleshooting

### If Search Hangs After "Brave Search completed"
1. Check console for the last log message
2. Look for error messages or timeout warnings
3. Check network tab for failed requests

### If Writer Agent Doesn't Start
- Should see: `🔍 [SEARCH] Step 2: Starting SearchWriterAgent`
- If missing, issue is in SearchRetrieverAgent → SearchWriterAgent handoff

### If Fetch Request Hangs
- Should see: `✍️ [WRITER] About to make fetch request`
- If no response received, check Netlify function

### If JSON Parsing Fails
- Writer agent will use fallback content
- Check for malformed API responses

## Key Debugging Points

### 1. Data Flow Verification
Each agent logs the data it receives:
```javascript
// SearchRetrieverAgent
console.log('🔍 [RETRIEVER] SearchRetrieverAgent starting', {
  query: trimmedQuery,
  perspectivesCount: perspectives.length,
  isPro
});

// SearchWriterAgent  
console.log('✍️ [WRITER] Starting SearchWriterAgent execution', {
  hasResearch: !!research,
  query: research?.query,
  resultsCount: research?.results?.length || 0
});
```

### 2. Timeout Tracking
All async operations have timeout logging:
```javascript
// 25 second fetch timeout
// 30 second writer agent timeout
// Proper cleanup on completion/error
```

### 3. Error Context
Errors include full context:
```javascript
console.error('🔍 [SEARCH] Regular search failed:', {
  error: error instanceof Error ? error.message : error,
  timestamp: new Date().toISOString()
});
```

## Success Criteria

✅ **Complete Flow:** All log messages appear in sequence  
✅ **No Hangs:** Search completes within 60 seconds  
✅ **Error Handling:** Graceful fallbacks on any failures  
✅ **Data Consistency:** Proper data passed between agents  
✅ **Response Quality:** Generated content with sources and citations  

## Next Steps

1. **Test in Browser:** Follow the testing instructions above
2. **Monitor Console:** Look for the expected log sequence
3. **Report Issues:** If hanging persists, note the exact last console log
4. **Performance Check:** Verify search completes in reasonable time

The refactored flow should now provide clear visibility into exactly where any issues occur, making debugging much more straightforward.
