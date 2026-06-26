# Insight Writer Timeout and Parsing Fixes

## Issues Identified from Test Run

### Issue 1: SearXNG Timeout Mismatch (522 Error)

**Problem**:
```
[2025-11-05T07:18:57.226Z] WARN: SearXng search timeout after 10 seconds
POST https://searxng.p.rapidapi.com/search 522
```

**Root Cause**:
- `searxng.ts` has 30s timeout
- `InsightsRetrieverAgent.ts` wrapper has **10s timeout**
- The wrapper times out BEFORE searxng.ts can complete
- Result: 522 error (Connection timed out at proxy)

**Fix Applied**:
Changed InsightsRetrieverAgent.ts line 202:
```typescript
// BEFORE
setTimeout(() => {
  logger.warn('SearXng search timeout after 10 seconds');
  reject(new Error('SearXng search timeout'));
}, 10000);  // ❌ 10 seconds

// AFTER  
setTimeout(() => {
  logger.warn('SearXng search timeout after 35 seconds');
  reject(new Error('SearXng search timeout'));
}, 35000);  // ✅ 35 seconds (gives searxng.ts 30s timeout buffer)
```

### Issue 2: JSON.parse Silent Freeze

**Problem**:
```
🔵 [INSIGHT-WRITER] Cleaned text
// ❌ FROZEN - no more logs after this point
```

**Last Successful Logs**:
```
🟢 [INSIGHT-WRITER] Fetch response received {"status":200}
🟢 [INSIGHT-WRITER] JSON parsed successfully
🔵 [INSIGHT-WRITER] data.text is string, cleaning and parsing
🔵 [INSIGHT-WRITER] Cleaned text
// ❌ App freezes here
```

**Root Cause**:
- JSON.parse(cleanText) was called without try-catch wrapper
- If parsing fails, error is silently swallowed or causes blocking
- No logging between "Cleaned text" and parse completion

**Fix Applied**:
Wrapped JSON.parse in try-catch with detailed logging:

```typescript
// BEFORE (line 135 - no try-catch)
const cleanText = data.text.trim().replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '');
logger.info('🔵 [INSIGHT-WRITER] Cleaned text', {...});
insightResult = JSON.parse(cleanText);  // ❌ Can silently fail/block
logger.info('🟢 [INSIGHT-WRITER] JSON.parse successful');

// AFTER (with explicit error handling)
const cleanText = data.text.trim().replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '');

logger.info('🔵 [INSIGHT-WRITER] Cleaned text', {
  cleanedLength: cleanText.length,
  cleanedPreview: cleanText.substring(0, 100)
});

// Parse with try-catch to prevent silent failures
try {
  logger.info('🔵 [INSIGHT-WRITER] Calling JSON.parse...');  // ✅ Log BEFORE parse
  insightResult = JSON.parse(cleanText);
  logger.info('🟢 [INSIGHT-WRITER] JSON.parse successful', {
    hasHeadline: !!insightResult?.headline,
    keys: Object.keys(insightResult || {})
  });
} catch (parseError) {
  logger.error('🔴 [INSIGHT-WRITER] JSON.parse failed', {
    error: parseError instanceof Error ? parseError.message : String(parseError),
    textSample: cleanText.substring(0, 200)
  });
  throw new Error(`Failed to parse OpenAI response: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
}
```

## Why These Fixes Work

### Timeout Fix (35s)
- SearXNG API: 30s timeout configured
- Wrapper timeout: 35s (allows 5s buffer)
- Result: searxng.ts can complete or timeout naturally
- Graceful degradation: Falls back to Brave + Tavily if SearXNG fails

### JSON.parse Fix (Explicit Try-Catch)
- **Logging BEFORE parse**: Shows we reached the parse call
- **Try-catch wrapper**: Catches any parse errors explicitly
- **Detailed error logging**: Shows actual parse error if it fails
- **Text sample**: Logs first 200 chars to debug malformed JSON
- **Proper error throw**: Propagates error up to swarm controller fallback

## Expected Behavior After Fix

### SearXNG Search
```
🔵 [SEARXNG] Sending request {"timeout":30000}
// Either:
🟢 [SEARXNG] Search completed successfully
// Or:
⚠️ [SEARXNG] Timeout after 35 seconds - using Brave + Tavily only
```

### Insight Writer Parsing
```
🟢 [INSIGHT-WRITER] JSON parsed successfully
🔵 [INSIGHT-WRITER] data.text is string, cleaning and parsing
🔵 [INSIGHT-WRITER] Cleaned text
🔵 [INSIGHT-WRITER] Calling JSON.parse...  ← NEW LOG
🟢 [INSIGHT-WRITER] JSON.parse successful   ← Should see this now
🔵 [INSIGHT-WRITER] Validating parsed result...
🟢 [INSIGHT-WRITER] Insight generated successfully
```

If parsing fails:
```
🔵 [INSIGHT-WRITER] Calling JSON.parse...
🔴 [INSIGHT-WRITER] JSON.parse failed {"error":"Unexpected token..."}
🔴 [SWARM] InsightWriterAgent failed, using fallback
// Returns fallback insights
```

## Principle: Simpler is Better

### What We Simplified

1. **Removed implicit assumptions**: 
   - ❌ Before: Assumed JSON.parse never fails
   - ✅ After: Explicit error handling with logging

2. **Added visibility**:
   - ❌ Before: Silent gap between "Cleaned text" and parse
   - ✅ After: Log immediately before parse call

3. **Aligned timeouts**:
   - ❌ Before: Nested timeouts (10s wrapper, 30s inner)
   - ✅ After: Consistent timeouts (35s wrapper > 30s inner)

4. **Cleaner error flow**:
   - ❌ Before: Errors could be swallowed
   - ✅ After: All errors caught, logged, and propagated

## Files Modified

1. **`/src/services/research/regular/agents/InsightsRetrieverAgent.ts`**
   - Line 202: Changed timeout from 10000ms to 35000ms
   - Reason: Align with searxng.ts 30s timeout

2. **`/src/services/research/regular/agents/insightWriterAgent.ts`**
   - Lines 135-154: Wrapped JSON.parse in try-catch
   - Added: Log before parse call
   - Added: Detailed error logging
   - Reason: Prevent silent parse failures

## Next Test

Run Insights search with "elon musk" and verify:
1. ✅ SearXNG either succeeds or times out gracefully (no 522 error)
2. ✅ JSON.parse logging shows successful parse
3. ✅ No freezing - complete flow with results
4. ✅ All 🟢 green indicators in console

The fixes maintain the "simpler is better" principle:
- Explicit error handling > implicit assumptions
- Aligned timeouts > nested mismatches
- Immediate logging > silent gaps
- Clean propagation > error swallowing
