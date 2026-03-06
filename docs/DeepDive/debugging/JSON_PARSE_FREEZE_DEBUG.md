# JSON.parse Freeze Investigation - Deep Debugging

## Issue

InsightWriterAgent freezes at JSON.parse() call:

```
🔵 [INSIGHT-WRITER] Calling JSON.parse...
❌ FROZEN - no more logs
```

## Hypothesis

The nested try-catch we added might be causing issues with the event loop or logger. Pro Search does NOT use nested try-catch.

## Changes Applied

### 1. Removed Nested Try-Catch

**Before** (our addition):
```typescript
try {
  logger.info('🔵 [INSIGHT-WRITER] Calling JSON.parse...');
  insightResult = JSON.parse(cleanText);
  logger.info('🟢 [INSIGHT-WRITER] JSON.parse successful');
} catch (parseError) {
  logger.error('🔴 [INSIGHT-WRITER] JSON.parse failed');
  throw new Error(...);
}
```

**After** (matches Pro Search):
```typescript
// DIRECT parse - no nested try-catch (same as Pro Search)
logger.info('🔵 [INSIGHT-WRITER] About to call JSON.parse NOW');
insightResult = JSON.parse(cleanText);
logger.info('🔵 [INSIGHT-WRITER] JSON.parse returned');
```

### 2. Added Granular Logging

To identify EXACTLY where the freeze occurs:

```typescript
logger.info('🔵 About to call JSON.parse NOW');     // ← Log IMMEDIATELY before
insightResult = JSON.parse(cleanText);
logger.info('🔵 JSON.parse returned');               // ← Log IMMEDIATELY after

// Check what we got
logger.info('🔵 Checking result type', {
  resultType: typeof insightResult,
  isNull: insightResult === null,
  isUndefined: insightResult === undefined
});

logger.info('🟢 JSON.parse completed', {
  hasHeadline: !!insightResult?.headline
});
```

### 3. Enhanced Validation Logging

```typescript
logger.info('🔵 Starting validation...');
logger.info('🔵 Checking headline...', { hasHeadline: !!insightResult?.headline });
logger.info('🔵 Checking markdown_report...', { hasReport: !!insightResult?.markdown_report });

if (!insightResult?.headline || !insightResult?.markdown_report) {
  throw new Error('Invalid insight format');
}

logger.info('🟢 Validation passed');
logger.info('🔵 Returning result...');
return insightResult;
```

## Expected Console Output

### If JSON.parse is the issue:
```
🔵 About to call JSON.parse NOW
❌ FROZEN (no more logs)
```

### If JSON.parse works but result access fails:
```
🔵 About to call JSON.parse NOW
🔵 JSON.parse returned
❌ FROZEN (checking result type doesn't log)
```

### If validation is the issue:
```
🔵 About to call JSON.parse NOW
🔵 JSON.parse returned
🔵 Checking result type
🟢 JSON.parse completed
🔵 Starting validation...
❌ FROZEN (validation step fails)
```

### If everything works:
```
🔵 About to call JSON.parse NOW
🔵 JSON.parse returned
🔵 Checking result type
🟢 JSON.parse completed
🔵 Starting validation...
🔵 Checking headline...
🔵 Checking markdown_report...
🟢 Validation passed
🟢 Insight generated successfully
🔵 Returning result...
```

## Key Differences from Pro Search

**Pro Search (Working)**:
- ✅ Direct JSON.parse in main try block
- ✅ No nested try-catch
- ✅ Simple validation
- ✅ Minimal logging

**Insights (Before Fix)**:
- ❌ Nested try-catch around JSON.parse
- ❌ Logger calls inside nested try
- ❌ More complex logging

**Insights (After Fix)**:
- ✅ Direct JSON.parse in main try block (MATCHES Pro Search)
- ✅ No nested try-catch (MATCHES Pro Search)
- ✅ Granular logging (for debugging only)
- ✅ Will match Pro Search exactly once working

## Possible Root Causes

1. **Nested try-catch causing event loop issues**
   - Nested try-catch with async logger might block event loop
   - Pro Search doesn't use this pattern

2. **Logger inside nested try-catch**
   - Logger might be async or have internal promises
   - Nested try-catch might prevent proper error propagation

3. **Object.keys() on large object**
   - If insightResult is very large, Object.keys() could block
   - We now avoid this until after parse confirms success

4. **Property access on frozen/proxy object**
   - `insightResult?.headline` might trigger getters
   - Added defensive checks before accessing properties

## Next Steps

1. Restart dev server
2. Test with "elon musk" query
3. Watch for EXACT log where freeze occurs:
   - "About to call JSON.parse NOW" → Freeze = JSON.parse issue
   - "JSON.parse returned" → Freeze = result type checking issue
   - "Starting validation" → Freeze = validation issue
   - "Returning result" → Freeze = return/promise issue

## Pro Search Pattern (Reference)

```typescript
// From /src/services/search/regular/agents/searchWriterAgent.ts
const data = await response.json();
if (!data.text) {
  throw new Error('No content in response');
}

// Parse response
let articleResult: ArticleResult;
if (typeof data.text === 'object') {
  articleResult = data.text;
} else if (typeof data.text === 'string') {
  const cleanText = data.text.trim().replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '');
  articleResult = JSON.parse(cleanText);  // ← DIRECT parse, no nested try-catch
} else {
  throw new Error('Unexpected response format');
}

// Validate
if (!articleResult?.content || !Array.isArray(articleResult.followUpQuestions)) {
  throw new Error('Invalid article format');
}

logger.debug('Article generated successfully');
return articleResult;
```

We now match this pattern exactly (with extra debugging logs).
